import { Router, type IRouter } from "express";
import { db, notify, rowToVisitor } from "../lib/db";
import { CreateVisitorBody, UpdateVisitorStatusBody } from "@workspace/api-zod";

const router: IRouter = Router();

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
  const today = new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      `INSERT INTO visitors (churchName, fullName, phone, email, howHeard, firstTime, visitDate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`,
    )
    .run(
      body.churchName,
      body.fullName,
      body.phone,
      body.email ?? null,
      body.howHeard ?? null,
      body.firstTime === false ? 0 : 1,
      today,
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
  const row = db.prepare("SELECT * FROM visitors WHERE id = ?").get(info.lastInsertRowid);
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

export default router;
