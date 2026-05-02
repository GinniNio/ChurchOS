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

export default router;
