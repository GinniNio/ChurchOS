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
