import { Router, type IRouter } from "express";
import { db, notify } from "../lib/db";
import { InitiateGivingBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/giving", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const rows = db
    .prepare("SELECT * FROM giving WHERE churchName = ? ORDER BY createdAt DESC, id DESC")
    .all(church);
  res.json(rows);
});

router.get("/giving/summary", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString();

  const totalThisMonth =
    (db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) AS s FROM giving WHERE churchName = ? AND status='successful' AND createdAt >= ?",
      )
      .get(church, monthIso) as { s: number }).s ?? 0;
  const totalAllTime =
    (db
      .prepare("SELECT COALESCE(SUM(amount),0) AS s FROM giving WHERE churchName = ? AND status='successful'")
      .get(church) as { s: number }).s ?? 0;
  const byCategory = db
    .prepare(
      "SELECT category, COALESCE(SUM(amount),0) AS total FROM giving WHERE churchName = ? AND status='successful' GROUP BY category ORDER BY total DESC",
    )
    .all(church);
  res.json({ totalThisMonth, totalAllTime, byCategory });
});

router.post("/giving/initiate", (req, res) => {
  const body = InitiateGivingBody.parse(req.body);
  const ref = `DEMO-${body.category.replace(/\s+/g, "").toUpperCase().slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`;
  const info = db
    .prepare(
      `INSERT INTO giving (churchName, donorName, donorPhone, amount, category, status, ref)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(body.churchName, body.donorName, body.donorPhone, body.amount, body.category, ref);
  notify(
    "sms",
    body.donorPhone,
    "Giving Initiated",
    `Hi ${body.donorName}, your ${body.category} of NGN ${body.amount.toLocaleString()} is pending. Reference: ${ref}.`,
  );
  const row = db.prepare("SELECT * FROM giving WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.post("/giving/confirm/:ref", (req, res) => {
  const ref = req.params.ref;
  const giving = db.prepare("SELECT * FROM giving WHERE ref = ?").get(ref) as any;
  if (!giving) { res.status(404).json({ error: "Not found" }); return; }
  db.prepare("UPDATE giving SET status='successful' WHERE ref = ?").run(ref);
  notify(
    "sms",
    giving.donorPhone,
    "Giving Confirmed",
    `Thank you ${giving.donorName}! Your ${giving.category} of NGN ${giving.amount.toLocaleString()} was received. Ref: ${ref}.`,
  );
  const row = db.prepare("SELECT * FROM giving WHERE ref = ?").get(ref);
  res.json(row);
});

// ── Giving Intelligence ─────────────────────────────────────────────────────

router.get("/giving/insights", async (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";

  const records = db
    .prepare("SELECT * FROM giving WHERE churchName = ? AND status = 'successful'")
    .all(church) as any[];

  if (records.length === 0) {
    res.json({
      totalGiving: 0, totalGivers: 0, totalTransactions: 0,
      byCategory: [], topGivers: [], consistentGivers: [], silentGivers: [],
      pastoralFlags: 0, aiSummary: null,
    });
    return;
  }

  // Group by donorPhone
  const byDonor: Record<string, any[]> = {};
  for (const r of records) {
    (byDonor[r.donorPhone] ??= []).push(r);
  }

  const now = Date.now();

  const donors = Object.entries(byDonor).map(([phone, gifts]) => {
    const totalGiven = gifts.reduce((a, g) => a + g.amount, 0);
    const givingCount = gifts.length;
    const sorted = [...gifts].sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
    const firstGift = sorted[0].createdAt;
    const lastGift = sorted[sorted.length - 1].createdAt;
    const daysSinceLastGift = Math.floor((now - new Date(lastGift).getTime()) / 86400000);
    const averageGiftAmount = totalGiven / givingCount;
    const catCounts: Record<string, number> = {};
    for (const g of gifts) catCounts[g.category] = (catCounts[g.category] ?? 0) + 1;
    const preferredCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0];
    const isConsistent = givingCount >= 3 && daysSinceLastGift < 30;
    const isSilent = givingCount >= 3 && daysSinceLastGift >= 21;
    return {
      donorName: gifts[0].donorName, donorPhone: phone,
      totalGiven, givingCount, firstGift, lastGift,
      daysSinceLastGift, averageGiftAmount, preferredCategory,
      isConsistent, isSilent,
    };
  });

  const totalGiving = records.reduce((a, r) => a + r.amount, 0);
  const totalGivers = donors.length;
  const totalTransactions = records.length;

  const byCat: Record<string, { total: number; count: number }> = {};
  for (const r of records) {
    (byCat[r.category] ??= { total: 0, count: 0 });
    byCat[r.category].total += r.amount;
    byCat[r.category].count += 1;
  }
  const byCategory = Object.entries(byCat)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  const topGivers = [...donors].sort((a, b) => b.totalGiven - a.totalGiven).slice(0, 3);
  const consistentGivers = donors.filter((d) => d.isConsistent);
  const silentGivers = donors.filter((d) => d.isSilent);

  // Pastoral care flags — deduplicated
  let pastoralFlags = 0;
  for (const d of silentGivers) {
    const exists = db
      .prepare(
        "SELECT id FROM notifications WHERE type = 'pastoral-care-giving' AND subject LIKE ?",
      )
      .get(`%${d.donorName}%`) as any;
    if (!exists) {
      const firstName = d.donorName.split(" ")[0];
      db.prepare(
        "INSERT INTO notifications (type, recipient, subject, body, read, approvalStatus) VALUES (?, ?, ?, ?, 0, 'pending')",
      ).run(
        "pastoral-care-giving",
        "pastoral-team@demo.com",
        `Personal Outreach: ${d.donorName}`,
        `${d.donorName} was a consistent giver (gave ${d.givingCount} times, total ₦${d.totalGiven.toLocaleString()}) but has not given in ${d.daysSinceLastGift} days.\n\n` +
          `A personal call from the pastoral team this week would mean a lot to them.\n` +
          `Their last known phone: ${d.donorPhone}\n\n` +
          `Suggested opening: 'Hi ${firstName}, I was just thinking about you and wanted to check in. How are you doing?' — no mention of giving.`,
      );
      pastoralFlags++;
    }
  }

  const insights = {
    totalGiving, totalGivers, totalTransactions,
    byCategory, topGivers, consistentGivers, silentGivers, pastoralFlags,
  };

  // AI pastoral summary (optional)
  let aiSummary: string | null = null;
  const { AI_ENABLED, openai, AI_MODEL } = await import("../lib/openai");
  if (AI_ENABLED) {
    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a financial health analyst for a Nigerian church. " +
              "You write brief, pastoral, non-judgmental summaries of giving patterns " +
              "for the pastor's weekly review. Always frame financial observations as " +
              "opportunities for pastoral care, never as collection problems.",
          },
          {
            role: "user",
            content:
              `Here is this week's giving summary for ${church}: ` +
              `${JSON.stringify(insights)}. ` +
              `Write a 3-sentence pastoral summary the pastor can read in 30 seconds.`,
          },
        ],
        max_tokens: 300,
      });
      aiSummary = completion.choices[0]?.message?.content ?? null;
    } catch {
      aiSummary = null;
    }
  }

  res.json({ ...insights, aiSummary });
});

export default router;
