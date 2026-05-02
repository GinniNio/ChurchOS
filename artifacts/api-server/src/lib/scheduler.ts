import { db } from "./db";
import { logger } from "./logger";

export function startSequenceScheduler() {
  const run = () => {
    try {
      const now = new Date().toISOString();
      const due = db
        .prepare(
          "SELECT * FROM visitor_sequences WHERE status = 'pending' AND scheduledAt <= ?",
        )
        .all(now) as any[];

      if (due.length === 0) return;

      const markSent = db.prepare(
        "UPDATE visitor_sequences SET status = 'sent', sentAt = ? WHERE id = ?",
      );
      const insNotif = db.prepare(
        "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
      );
      const markVisitorContacted = db.prepare(
        "UPDATE visitors SET status = 'contacted' WHERE id = ? AND status = 'new'",
      );

      const tx = db.transaction((steps: any[]) => {
        for (const s of steps) {
          markSent.run(now, s.id);
          insNotif.run(s.messageType, s.recipient, s.subject, s.body);
          if (s.messageType === "cell-leader-alert") {
            markVisitorContacted.run(s.visitorId);
          }
        }
      });

      tx(due);
      logger.info({ count: due.length }, "Sequence scheduler: fired due steps");
    } catch (err) {
      logger.error({ err }, "Sequence scheduler error");
    }
  };

  run(); // run once immediately on startup
  setInterval(run, 3_600_000); // then every hour
}
