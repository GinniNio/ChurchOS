import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { openai, AI_MODEL, AI_ENABLED } from "../lib/openai";

const router: IRouter = Router();

// ── Sermon RAG Chatbot ──────────────────────────────────────────────────────

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
      answer: "AI chat is not configured yet. Please ask your church admin.",
      sources: [],
    });
    return;
  }

  const sermons = db
    .prepare("SELECT * FROM sermons WHERE churchName = ? ORDER BY sermonDate DESC")
    .all(churchName) as any[];

  const context = sermons
    .map(
      (s) =>
        `SERMON: ${s.title} by ${s.preacher} on ${s.sermonDate}\n` +
        `Scripture: ${s.scripture} | Series: ${s.seriesName ?? "N/A"}\n` +
        `Description: ${s.description ?? "N/A"}\n` +
        (s.transcript ? `Transcript excerpt: ${String(s.transcript).slice(0, 500)}\n` : "") +
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
            `on that topic yet — you can ask Pastor directly or check back as more sermons are added.' ` +
            `Keep answers warm, pastoral, and conversational. Write in a tone appropriate for a Nigerian Christian community.`,
        },
        {
          role: "user",
          content: `Here are all the sermons from ${churchName}:\n\n${context}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: 800,
    });

    const answer = completion.choices[0]?.message?.content ?? "";
    const sources = sermons
      .filter((s) => answer.toLowerCase().includes(s.title.toLowerCase()))
      .map((s) => ({ id: s.id, title: s.title, preacher: s.preacher, sermonDate: s.sermonDate, scripture: s.scripture }));

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
    res.status(500).json({ error: "AI request failed", message: err.message ?? String(err) });
  }
});

// ── Multilingual Translator ─────────────────────────────────────────────────

router.post("/ai/translate", async (req, res) => {
  const { text, targetLanguages = ["Yoruba", "Igbo", "Hausa"] } = req.body as {
    text?: string;
    targetLanguages?: string[];
  };
  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  if (!AI_ENABLED) {
    const translations: Record<string, string> = {};
    for (const lang of targetLanguages) {
      translations[lang] = `[Demo] ${text} (${lang} translation — configure AI key to enable)`;
    }
    res.json({ original: text, translations });
    return;
  }

  const translations: Record<string, string | null> = {};
  await Promise.all(
    targetLanguages.map(async (lang: string) => {
      try {
        const c = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content:
                `You are a professional translator specialising in Nigerian languages for Christian church communications. ` +
                `Translate the following announcement from English to ${lang}. ` +
                `Keep the tone warm, formal, and respectful — appropriate for a church WhatsApp broadcast. ` +
                `Preserve any names, scripture references, and specific times/dates exactly as written.`,
            },
            { role: "user", content: text },
          ],
          max_tokens: 500,
        });
        translations[lang] = c.choices[0]?.message?.content?.trim() ?? null;
      } catch {
        translations[lang] = null;
      }
    }),
  );

  res.json({ original: text, translations });
});

// ── Nigerian Sermon Context Engine ─────────────────────────────────────────

router.post("/ai/sermon-context", async (req, res) => {
  const {
    scripture,
    sermonTitle,
    mainPoints = "",
    churchName = "Demo Church Lagos",
  } = req.body as {
    scripture?: string;
    sermonTitle?: string;
    mainPoints?: string;
    churchName?: string;
  };

  if (!scripture || !sermonTitle) {
    res.status(400).json({ error: "scripture and sermonTitle are required" });
    return;
  }

  if (!AI_ENABLED) {
    res.json({
      context:
        `[Demo Mode — AI not configured]\n\n` +
        `🇳🇬 Nigerian Illustrations\n` +
        `• Illustration 1: Connect "${sermonTitle}" to the experience of waiting for NEPA light — the hope that keeps us going even in darkness.\n` +
        `• Illustration 2: Like the market woman who wakes at 4am trusting she'll make sales, faith is acting before you see the result.\n` +
        `• Illustration 3: The Aso-Ebi fabric — every thread matters. Each member of this congregation is a thread in God's design.\n\n` +
        `📰 Current Context\n` +
        `In 2025-2026 Nigeria, with rising fuel costs and economic pressure, many families are making hard choices. ` +
        `This scripture speaks directly to that — God's promises are not suspended during subsidy removal.\n\n` +
        `❓ Congregation Questions\n` +
        `• "How many of you have prayed a prayer this week wondering if God was listening — and then continued to queue at the fuel station anyway? That's faith."\n` +
        `• "What is the one thing you've been waiting on God for that you haven't told anyone? Let that be your altar today."\n\n` +
        `🙏 Prayer Opener\n` +
        `Father, we come to you as a people who know what it means to trust without seeing — you have trained us well through every hardship. ` +
        `Today, let your Word meet us at the exact point of our struggle. In Jesus name, Amen.`,
      generatedAt: new Date().toISOString(),
    });
    return;
  }

  try {
    const c = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            `You are a sermon preparation assistant for Nigerian pastors. ` +
            `You help pastors connect biblical texts to the lived experience of Nigerian congregations — ` +
            `economic hardship, family pressures, cultural dynamics, national events, and the unique spiritual landscape of Nigeria. ` +
            `You are warm, theologically grounded, and write in a style that respects Nigerian church culture. ` +
            `You never write the sermon — you equip the pastor.`,
        },
        {
          role: "user",
          content:
            `I am preaching on ${scripture} at ${churchName}.\n` +
            `Sermon title: ${sermonTitle}.\n` +
            `Main points I plan to cover: ${mainPoints || "Not specified yet"}\n\n` +
            `Please give me:\n` +
            `1. THREE specific Nigerian illustrations or analogies for this text ` +
            `(reference everyday Nigerian experiences — market life, fuel queues, family expectations, NEPA/PHCN light, hustle culture, jollof rice, etc.)\n\n` +
            `2. ONE current economic/social reality in Nigeria (2025-2026) that connects to this passage's theme\n\n` +
            `3. TWO questions to ask the congregation that will make them feel deeply seen and understood (not generic — specific to Nigerian life)\n\n` +
            `4. ONE short prayer opener (2 sentences, Nigerian church style) that connects the scripture to their daily reality\n\n` +
            `Format each section clearly with headers.`,
        },
      ],
      max_tokens: 1000,
    });
    res.json({
      context: c.choices[0]?.message?.content ?? "",
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "AI request failed", message: err.message });
  }
});

export default router;
