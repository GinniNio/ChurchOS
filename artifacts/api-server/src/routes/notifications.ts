import { Router, type IRouter } from "express";
import { db, rowToNotification } from "../lib/db";

const router: IRouter = Router();

router.get("/notifications", (_req, res) => {
  res.json(
    db.prepare("SELECT * FROM notifications ORDER BY sentAt DESC, id DESC LIMIT 200").all().map(rowToNotification),
  );
});

router.get("/notifications/unread-count", (_req, res) => {
  const r = db.prepare("SELECT COUNT(*) AS c FROM notifications WHERE read = 0").get() as { c: number };
  res.json({ unread: r.c });
});

router.post("/notifications/:id/read", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
  const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rowToNotification(row));
});

export default router;
