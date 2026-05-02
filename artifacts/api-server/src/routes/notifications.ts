import { Router, type IRouter } from "express";
import { db, rowToNotification } from "../lib/db";

const router: IRouter = Router();

router.get("/notifications", (req, res) => {
  const pendingOnly = req.query.pendingOnly === "true";
  let sql = "SELECT * FROM notifications";
  if (pendingOnly) {
    sql += " WHERE approvalStatus = 'pending'";
  }
  sql += " ORDER BY sentAt DESC, id DESC LIMIT 200";
  res.json(db.prepare(sql).all().map(rowToNotification));
});

router.get("/notifications/unread-count", (_req, res) => {
  const r = db
    .prepare("SELECT COUNT(*) AS c FROM notifications WHERE approvalStatus = 'pending'")
    .get() as { c: number };
  res.json({ unread: r.c });
});

router.post("/notifications/:id/read", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
  const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rowToNotification(row));
});

router.post("/notifications/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE notifications SET approvalStatus = 'approved', sentAt = ?, read = 1 WHERE id = ?",
  ).run(now, id);
  const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, notification: rowToNotification(row) });
});

router.post("/notifications/:id/edit-and-approve", (req, res) => {
  const id = Number(req.params.id);
  const { body } = req.body as { body?: string };
  if (typeof body !== "string") {
    res.status(400).json({ error: "body is required" });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE notifications SET body = ?, approvalStatus = 'approved', sentAt = ?, read = 1 WHERE id = ?",
  ).run(body, now, id);
  const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, notification: rowToNotification(row) });
});

router.post("/notifications/:id/dismiss", (req, res) => {
  const id = Number(req.params.id);
  db.prepare(
    "UPDATE notifications SET approvalStatus = 'dismissed', read = 1 WHERE id = ?",
  ).run(id);
  res.json({ success: true });
});

export default router;
