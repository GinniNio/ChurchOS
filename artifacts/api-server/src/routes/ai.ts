import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { openai, AI_MODEL, AI_ENABLED } from "../lib/openai";

const router: IRouter = Router();

router.post("/ai/sermon-chat", async (req, res) => {
  const { question, churchName = "Demo Church Lagos" } = req.body as {
    question?: string;
    churchName?: string;
  };

  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  if (!AI_ENABLED) {
    res.json({
      answer:
        "AI chat is not configured yet. Please ask your church admin.",
      sources: [],
    });
    return;
  }

  const sermons = db
    .prepare(
      "SELECT * FROM sermons WHERE churchName = ? ORDER BY sermonDate DESC",
    )
    .all(churchName) as any[];

  const context = sermons
    .map(
      (s) =>
        `SERMON: ${s.title} by ${s.preacher} on ${s.sermonDate}\n` +
        `Scripture: ${s.scripture} | Series: ${s.seriesName ?? "N/A"}\n` +
        `Description: ${s.description ?? "N/A"}\n` +
        (s.transcript
          ? `Transcript excerpt: ${String(s.transcript).slice(0, 500)}\n`
          : "") +
        `---`,
    )
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            `You are a helpful assistant for ${churchName}. You answer questions about the ` +
            `church's sermon content. Only use information from the sermons provided below. ` +
            `When you answer, always cite the specific sermon title, preacher, and date. ` +
            `If the answer is not found in the sermon content, say: 'I couldn't find a sermon ` +
            `on that topic yet — you can ask Pastor directly or check back as more sermons ` +
            `are added.' Keep answers warm, pastoral, and conversational. Write in a tone ` +
            `appropriate for a Nigerian Christian community.`,
        },
        {
          role: "user",
          content:
            `Here are all the sermons from ${churchName}:\n\n${context}\n\n` +
            `Question: ${question}`,
        },
      ],
      max_tokens: 800,
    });

    const answer = completion.choices[0]?.message?.content ?? "";

    // Extract cited sermons by matching titles
    const sources = sermons.filter((s) =>
      answer.toLowerCase().includes(s.title.toLowerCase()),
    ).map((s) => ({
      id: s.id,
      title: s.title,
      preacher: s.preacher,
      sermonDate: s.sermonDate,
      scripture: s.scripture,
    }));

    // Log to notifications
    db.prepare(
      "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
    ).run(
      "ai-chat",
      "sermon-library",
      `Sermon question: ${question.slice(0, 60)}`,
      `Q: ${question}\nA: ${answer}`,
    );

    res.json({ answer, sources });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "AI request failed", message: err.message ?? String(err) });
  }
});

export default router;
