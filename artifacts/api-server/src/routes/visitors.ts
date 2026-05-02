import { Router, type IRouter } from "express";
import { db, notify, rowToVisitor } from "../lib/db";
import { CreateVisitorBody, UpdateVisitorStatusBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ── helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function createNurtureSequence(visitorId: number, visitor: any, consentGiven = 0) {
  const firstName = visitor.fullName.split(" ")[0];
  const church = visitor.churchName;
  const phone = visitor.phone;
  const visitDate = visitor.visitDate as string;
  const cellLeaderEmail = visitor.cellLeaderEmail ?? "admin@demo.com";

  const latestSermon = db
    .prepare(
      "SELECT title, preacher FROM sermons WHERE churchName = ? ORDER BY sermonDate DESC LIMIT 1",
    )
    .get(church) as { title: string; preacher: string } | undefined;

  const sermonTitle = latestSermon?.title ?? "this week's message";
  const sermonPreacher = latestSermon?.preacher ?? "our pastor";

  const noConsentWarning = consentGiven === 0
    ? "\n\n⚠️ This visitor did not opt in to communications. Review carefully before approving."
    : "";

  const steps = [
    {
      step: 1,
      scheduledAt: visitDate,
      messageType: "sms",
      recipient: phone,
      subject: `Welcome to ${church}`,
      body:
        `Welcome to ${church}, ${firstName}! 🙏 We're so glad you joined us today. ` +
        `You're not just a visitor — you're family. See you again this Sunday! ` +
        `Questions? Reply to this message anytime.`,
    },
    {
      step: 2,
      scheduledAt: addDays(visitDate, 3),
      messageType: "sms",
      recipient: phone,
      subject: "This week's sermon",
      body:
        `Hi ${firstName}, here's this week's sermon from ${church} in case you missed it — ` +
        `'${sermonTitle}' by ${sermonPreacher}. God bless you! 🎙️`,
    },
    {
      step: 3,
      scheduledAt: addDays(visitDate, 7),
      messageType: "cell-leader-alert",
      recipient: cellLeaderEmail,
      subject: `7-day check-in: ${visitor.fullName}`,
      body:
        `${visitor.fullName} visited ${church} 7 days ago and hasn't been assigned to a cell group yet. ` +
        `Please reach out: ${phone}. This is a warm lead — ` +
        `a personal call this week can convert them to a regular member.`,
    },
    {
      step: 4,
      scheduledAt: addDays(visitDate, 10),
      messageType: "sms",
      recipient: phone,
      subject: "You're invited",
      body:
        `Hi ${firstName}, we have our midweek Bible study this Wednesday at 6:30pm. ` +
        `It's a great way to connect with the ${church} family. ` +
        `Hope to see you there! 🙏`,
    },
    {
      step: 5,
      scheduledAt: addDays(visitDate, 14),
      messageType: "pastoral",
      recipient: phone,
      subject: "Personal message from Pastor",
      body:
        `Hi ${firstName}, it's been two weeks since you visited ${church}. ` +
        `I just wanted to reach out personally to say — you made an impression on us. ` +
        `We'd love for you to be part of our community. ` +
        `I'm here if you ever want to talk. God bless you. — Pastor`,
    },
  ];

  const insSeq = db.prepare(
    `INSERT INTO visitor_sequences (visitorId, step, scheduledAt, messageType, recipient, subject, body)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insNotif = db.prepare(
    "INSERT INTO notifications (type, recipient, subject, body, approvalStatus) VALUES (?, ?, ?, ?, 'pending')",
  );

  const tx = db.transaction(() => {
    for (const s of steps) {
      insSeq.run(
        visitorId,
        s.step,
        s.scheduledAt,
        s.messageType,
        s.recipient,
        s.subject,
        s.body,
      );
      insNotif.run(
        "sequence-scheduled",
        s.recipient,
        `[Day ${[0,3,7,10,14][s.step - 1]}] ${s.subject}`,
        s.body + noConsentWarning,
      );
    }
  });
  tx();
}

// ── existing routes (unchanged) ────────────────────────────────────────────

router.get("/visitors", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const rows = db
    .prepare("SELECT * FROM visitors WHERE churchName = ? ORDER BY visitDate DESC, id DESC")
    .all(church)
    .map(rowToVisitor);
  res.json(rows);
});

router.get("/visitors/summary", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const rows = db
    .prepare("SELECT status, COUNT(*) AS c FROM visitors WHERE churchName = ? GROUP BY status")
    .all(church) as { status: string; c: number }[];
  const map: Record<string, number> = { new: 0, contacted: 0, returned: 0, cold: 0 };
  let total = 0;
  for (const r of rows) {
    map[r.status] = (map[r.status] ?? 0) + r.c;
    total += r.c;
  }
  res.json({
    total,
    newCount: map.new ?? 0,
    contactedCount: map.contacted ?? 0,
    returnedCount: map.returned ?? 0,
    coldCount: map.cold ?? 0,
  });
});

router.post("/visitors", (req, res) => {
  const body = CreateVisitorBody.parse(req.body);
  const consentGiven = req.body.consentGiven ? 1 : 0;
  const today = new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      `INSERT INTO visitors (churchName, fullName, phone, email, howHeard, firstTime, visitDate, status, consentGiven)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    )
    .run(
      body.churchName,
      body.fullName,
      body.phone,
      body.email ?? null,
      body.howHeard ?? null,
      body.firstTime === false ? 0 : 1,
      today,
      consentGiven,
    );
  notify(
    "sms",
    body.phone,
    "Welcome to " + body.churchName,
    `Hi ${body.fullName}, thank you for visiting ${body.churchName}! We'd love to connect with you this week.`,
  );
  if (body.email) {
    notify(
      "email",
      body.email,
      "Welcome to " + body.churchName,
      `Hello ${body.fullName}, welcome! A cell leader will reach out shortly to invite you to a small group.`,
    );
  }
  const row = db.prepare("SELECT * FROM visitors WHERE id = ?").get(info.lastInsertRowid) as any;

  // Auto-trigger 14-day nurture sequence
  try {
    createNurtureSequence(Number(info.lastInsertRowid), row, consentGiven);
  } catch (err) {
    // Non-fatal — sequence creation failure should not block visitor creation
  }

  res.status(201).json(rowToVisitor(row));
});

router.patch("/visitors/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateVisitorStatusBody.parse(req.body);
  const visitor = db.prepare("SELECT * FROM visitors WHERE id = ?").get(id) as any;
  if (!visitor) { res.status(404).json({ error: "Not found" }); return; }
  db.prepare("UPDATE visitors SET status = ? WHERE id = ?").run(body.status, id);
  if (body.status === "contacted") {
    notify(
      "sms",
      visitor.phone,
      "Following up from " + visitor.churchName,
      `Hi ${visitor.fullName}, this is a quick follow-up. Hope to see you again on Sunday!`,
    );
  } else if (body.status === "returned") {
    notify(
      "sms",
      visitor.phone,
      "Welcome back!",
      `Hi ${visitor.fullName}, so glad you returned! We are setting you up with a cell group.`,
    );
  }
  const row = db.prepare("SELECT * FROM visitors WHERE id = ?").get(id);
  res.json(rowToVisitor(row));
});

// ── new sequence routes ─────────────────────────────────────────────────────

router.post("/visitors/:id/start-sequence", (req, res) => {
  const id = Number(req.params.id);
  const visitor = db.prepare("SELECT * FROM visitors WHERE id = ?").get(id) as any;
  if (!visitor) { res.status(404).json({ error: "Visitor not found" }); return; }

  // Remove any existing pending sequence steps first (idempotent restart)
  db.prepare("DELETE FROM visitor_sequences WHERE visitorId = ? AND status = 'pending'").run(id);

  createNurtureSequence(id, visitor, visitor.consentGiven ?? 0);

  const steps = db
    .prepare("SELECT * FROM visitor_sequences WHERE visitorId = ? ORDER BY step ASC")
    .all(id);
  res.json({ success: true, steps });
});

router.get("/visitors/sequences", (req, res) => {
  const visitorId = req.query.visitorId ? Number(req.query.visitorId) : null;
  if (!visitorId) { res.status(400).json({ error: "visitorId is required" }); return; }
  const steps = db
    .prepare("SELECT * FROM visitor_sequences WHERE visitorId = ? ORDER BY scheduledAt ASC")
    .all(visitorId);
  res.json(steps);
});

router.get("/visitors/sequences/stats", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const active = (db.prepare(
    `SELECT COUNT(DISTINCT vs.visitorId) AS c
     FROM visitor_sequences vs
     JOIN visitors v ON v.id = vs.visitorId
     WHERE v.churchName = ? AND vs.status = 'pending'`,
  ).get(church) as { c: number }).c;

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const sentThisWeek = (db.prepare(
    `SELECT COUNT(*) AS c
     FROM visitor_sequences vs
     JOIN visitors v ON v.id = vs.visitorId
     WHERE v.churchName = ? AND vs.status = 'sent' AND vs.sentAt >= ?`,
  ).get(church, weekAgo) as { c: number }).c;

  res.json({ active, sentThisWeek });
});

// Add PATCH for transcript
router.patch("/sermons/:id/transcript", (req, res) => {
  const id = Number(req.params.id);
  const { transcript } = req.body as { transcript?: string };
  if (typeof transcript !== "string") {
    res.status(400).json({ error: "transcript must be a string" });
    return;
  }
  const row = db.prepare("SELECT id FROM sermons WHERE id = ?").get(id);
  if (!row) { res.status(404).json({ error: "Sermon not found" }); return; }
  db.prepare("UPDATE sermons SET transcript = ? WHERE id = ?").run(transcript, id);
  res.json({ success: true });
});

export default router;
