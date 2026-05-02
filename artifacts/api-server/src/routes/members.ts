import { Router, type IRouter } from "express";
import { db, notify } from "../lib/db";
import { CreateMemberBody, SaveAttendanceBody, SeedMembersBody } from "@workspace/api-zod";

const router: IRouter = Router();

function recomputeStatus(misses: number): string {
  if (misses >= 12) return "inactive";
  if (misses >= 6) return "ghost";
  if (misses >= 3) return "atRisk";
  return "active";
}

router.get("/members", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const status = req.query.status as string | undefined;
  let sql = "SELECT * FROM members WHERE churchName = ?";
  const params: unknown[] = [church];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY consecutiveMisses DESC, fullName ASC";
  res.json(db.prepare(sql).all(...params));
});

router.get("/members/summary", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const rows = db
    .prepare("SELECT status, COUNT(*) AS c FROM members WHERE churchName = ? GROUP BY status")
    .all(church) as { status: string; c: number }[];
  const out = { total: 0, active: 0, atRisk: 0, ghost: 0, inactive: 0 };
  for (const r of rows) {
    out.total += r.c;
    if (r.status === "active") out.active = r.c;
    else if (r.status === "atRisk") out.atRisk = r.c;
    else if (r.status === "ghost") out.ghost = r.c;
    else if (r.status === "inactive") out.inactive = r.c;
  }
  res.json(out);
});

router.post("/members", (req, res) => {
  const body = CreateMemberBody.parse(req.body);
  const info = db
    .prepare(
      `INSERT INTO members (churchName, fullName, phone, email, cellGroup, cellLeaderEmail, joinDate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    )
    .run(
      body.churchName,
      body.fullName,
      body.phone,
      body.email ?? null,
      body.cellGroup,
      body.cellLeaderEmail ?? null,
      new Date().toISOString().slice(0, 10),
    );
  res.status(201).json(db.prepare("SELECT * FROM members WHERE id = ?").get(info.lastInsertRowid));
});

router.post("/members/seed", (req, res) => {
  const body = SeedMembersBody.parse(req.body);
  const sample = [
    ["Hannah Obi", "+2348011110011", "Faith Cell"],
    ["John Etim", "+2348011110012", "Hope Cell"],
    ["Ruth Adams", "+2348011110013", "Grace Cell"],
  ];
  let inserted = 0;
  const stmt = db.prepare(
    `INSERT INTO members (churchName, fullName, phone, cellGroup, joinDate, status)
     VALUES (?, ?, ?, ?, date('now'), 'active')`,
  );
  for (const [n, p, c] of sample) {
    stmt.run(body.church, n, p, c);
    inserted++;
  }
  res.json({ inserted });
});

// ── Drift Risk Predictor ────────────────────────────────────────────────────

router.get("/members/drift-risk", async (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const members = db
    .prepare("SELECT * FROM members WHERE churchName = ?")
    .all(church) as any[];
  const giving = db
    .prepare("SELECT * FROM giving WHERE churchName = ? AND status = 'successful'")
    .all(church) as any[];

  const now = Date.now();

  function calcDriftScore(m: any): number {
    let score = 0;
    const misses = m.consecutiveMisses ?? 0;
    const lastAtt = m.lastAttendance ? new Date(m.lastAttendance).getTime() : 0;
    const daysAway = lastAtt ? Math.floor((now - lastAtt) / 86400000) : 999;
    const joined = m.joinDate ? new Date(m.joinDate).getTime() : now;
    const tenure = Math.floor((now - joined) / 86400000);

    // Factor 1 — attendance (40pts max)
    if (misses === 0 && daysAway <= 7) score += 0;
    else if (misses === 0 && daysAway <= 14) score += 10;
    else if (misses === 1) score += 25;
    else score += 40;

    // Factor 2 — tenure (30pts max)
    if (tenure > 180 && misses >= 1) score += 30;
    else if (tenure > 90 && misses >= 1) score += 15;

    // Factor 3 — giving (30pts max)
    const gifts = giving.filter((g) => g.donorPhone === m.phone);
    if (gifts.length === 0) {
      score += 10;
    } else {
      const lastGift = gifts.reduce((a: string, g: any) => (a > g.createdAt ? a : g.createdAt), "");
      const daysSince = Math.floor((now - new Date(lastGift).getTime()) / 86400000);
      if (daysSince >= 60) score += 30;
      else if (daysSince >= 30) score += 20;
    }
    return Math.min(score, 100);
  }

  function driftLevel(score: number) {
    if (score <= 20) return "Healthy";
    if (score <= 40) return "Watch";
    if (score <= 60) return "Drift Risk";
    return "High Risk";
  }

  const { AI_ENABLED, openai, AI_MODEL } = await import("../lib/openai");

  const scored = await Promise.all(
    members.map(async (m) => {
      const driftScore = calcDriftScore(m);
      const level = driftLevel(driftScore);
      const firstName = m.fullName.split(" ")[0];
      const monthsJoined = Math.max(1, Math.floor((now - new Date(m.joinDate ?? now).getTime()) / (86400000 * 30)));

      let suggestedMessage =
        `Hi ${firstName}! Just thinking about you today and wanted to check in. ` +
        `How are you doing? 🙏 — ${m.cellGroup} family`;

      if ((level === "Drift Risk" || level === "High Risk") && AI_ENABLED) {
        try {
          const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
              {
                role: "user",
                content:
                  `Write a warm, casual WhatsApp message (max 2 sentences) from a cell leader checking in on a church member named ${firstName} who has been attending ${church} for ${monthsJoined} month${monthsJoined > 1 ? "s" : ""}. The message should feel personal and caring, not robotic. No mention of attendance or giving. Sign it as 'Your ${m.cellGroup} family'. Nigerian-English tone is fine.`,
              },
            ],
            max_tokens: 100,
          });
          suggestedMessage = completion.choices[0]?.message?.content?.trim() ?? suggestedMessage;
        } catch { /* keep fallback */ }
      }

      return { ...m, driftScore, driftLevel: level, suggestedMessage };
    }),
  );

  // Notifications for High Risk (deduplicated)
  let newFlags = 0;
  for (const m of scored.filter((s) => s.driftLevel === "High Risk")) {
    const exists = db
      .prepare("SELECT id FROM notifications WHERE type = 'drift-risk' AND subject LIKE ?")
      .get(`%${m.fullName}%`);
    if (!exists) {
      db.prepare(
        "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
      ).run(
        "drift-risk",
        m.cellLeaderEmail ?? "pastor@demo.com",
        `Early warning: ${m.fullName} — ${m.cellGroup}`,
        `Our system has detected early drift signals for ${m.fullName} in ${m.cellGroup}.\n` +
          `They are not yet officially absent but engagement indicators suggest they may be drifting.\n\n` +
          `Suggested message to send them this week:\n'${m.suggestedMessage}'\n\n` +
          `Sending this message now takes 30 seconds and could retain a member.\n` +
          `Last attendance: ${m.lastAttendance ?? "unknown"} | Score: ${m.driftScore}/100`,
      );
      newFlags++;
    }
  }

  const healthy = scored.filter((s) => s.driftLevel === "Healthy");
  const watch = scored.filter((s) => s.driftLevel === "Watch");
  const driftRisk = scored.filter((s) => s.driftLevel === "Drift Risk");
  const highRisk = scored.filter((s) => s.driftLevel === "High Risk");

  res.json({ totalMembers: members.length, healthy, watch, driftRisk, highRisk, newFlags });
});

router.post("/attendance", (req, res) => {
  const body = SaveAttendanceBody.parse(req.body);
  // Idempotent: re-saving the same service date overwrites previous entries.
  const upsertLog = db.prepare(
    `INSERT INTO attendance_log (memberId, serviceDate, present) VALUES (?, ?, ?)
     ON CONFLICT(memberId, serviceDate) DO UPDATE SET present = excluded.present`,
  );
  const getLastPresent = db.prepare(
    "SELECT MAX(serviceDate) AS d FROM attendance_log WHERE memberId = ? AND present = 1",
  );
  const countMissesSince = db.prepare(
    "SELECT COUNT(*) AS c FROM attendance_log WHERE memberId = ? AND present = 0 AND serviceDate > COALESCE(?, '0000-00-00')",
  );
  const updMember = db.prepare(
    "UPDATE members SET lastAttendance = ?, consecutiveMisses = ?, status = ? WHERE id = ?",
  );
  let presentCount = 0;
  let absentCount = 0;
  let alertsSent = 0;
  const alerts: { m: any; misses: number; status: string }[] = [];

  const tx = db.transaction((entries: typeof body.entries) => {
    for (const e of entries) {
      const m = db.prepare("SELECT * FROM members WHERE id = ?").get(e.memberId) as any;
      if (!m) continue;
      const prevMisses = m.consecutiveMisses ?? 0;
      upsertLog.run(e.memberId, body.serviceDate, e.present ? 1 : 0);
      const lastP = getLastPresent.get(e.memberId) as { d: string | null };
      const misses = (countMissesSince.get(e.memberId, lastP.d) as { c: number }).c;
      const status = recomputeStatus(misses);
      const lastAttendance = lastP.d ?? m.lastAttendance ?? null;
      updMember.run(lastAttendance, misses, status, e.memberId);
      if (e.present) presentCount++;
      else {
        absentCount++;
        const wasNotAlerting = recomputeStatus(prevMisses) === "active" || (recomputeStatus(prevMisses) === "atRisk" && status === "ghost");
        if (status === "ghost" && wasNotAlerting) alerts.push({ m, misses, status });
        else if (status === "atRisk" && recomputeStatus(prevMisses) === "active") alerts.push({ m, misses, status });
      }
    }
  });
  tx(body.entries);

  for (const { m, misses, status } of alerts) {
    if (m.cellLeaderEmail) {
      notify(
        "email",
        m.cellLeaderEmail,
        `${status === "ghost" ? "Ghost" : "At-Risk"} Member Alert: ${m.fullName}`,
        `${m.fullName} (${m.cellGroup}) has missed ${misses} consecutive services. Please reach out today.`,
      );
      alertsSent++;
    }
    notify(
      "sms",
      m.phone,
      "We Miss You",
      `Hello ${m.fullName}, we noticed you've been away. We'd love to see you this Sunday at ${m.churchName}!`,
    );
  }

  res.json({ presentCount, absentCount, alertsSent });
});

export default router;
