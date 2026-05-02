import { db } from "./db";
import { logger } from "./logger";

export function runSundayAgent(churchName = "Demo Church Lagos"): object {
  const now = new Date();
  const results = {
    birthdayReminders: 0,
    sermonUploadReminders: 0,
    serviceReminderSent: false,
    weeklyReportSent: false,
    errors: [] as string[],
  };

  // ACTION 1: Birthday check
  try {
    const members = db
      .prepare("SELECT * FROM members WHERE churchName = ?")
      .all(churchName) as any[];
    for (const m of members) {
      if (!m.birthday) continue;
      const bday = new Date(m.birthday);
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      const nextYear = new Date(now.getFullYear() + 1, bday.getMonth(), bday.getDate());
      const target = thisYear.getTime() >= now.getTime() ? thisYear : nextYear;
      const daysUntil = Math.floor((target.getTime() - now.getTime()) / 86400000);
      if (daysUntil <= 7) {
        const dateStr = bday.toLocaleDateString("en-NG", { month: "long", day: "numeric" });
        const firstName = m.fullName.split(" ")[0];
        db.prepare(
          "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
        ).run(
          "birthday-reminder",
          "pastor@demo.com",
          `🎂 Birthday this week: ${m.fullName}`,
          `This is a reminder that ${m.fullName} (${m.cellGroup}) has a birthday on ${dateStr}. ` +
            `A personal WhatsApp message from the pastor will mean the world to them.\n\n` +
            `Suggested message: 'Happy birthday ${firstName}! 🎉 Wishing you God's best this new year of your life. — Pastor'`,
        );
        results.birthdayReminders++;
      }
    }
  } catch (err: any) {
    results.errors.push(`Birthday check: ${err.message}`);
  }

  // ACTION 2: Unseen sermon check
  try {
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const sermon = db
      .prepare(
        `SELECT * FROM sermons WHERE churchName = ? AND sermonDate >= ?
         AND (audioFilename IS NULL OR audioFilename = '') ORDER BY sermonDate DESC LIMIT 1`,
      )
      .get(churchName, weekAgo) as any;
    if (sermon) {
      db.prepare(
        "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
      ).run(
        "media-reminder",
        "media@demo.com",
        `⚠️ Last Sunday's sermon not uploaded yet`,
        `'${sermon.title}' by ${sermon.preacher} from ${sermon.sermonDate} has no audio file uploaded. ` +
          `Please upload the recording to the Sermon Archive today so members can replay it this week.`,
      );
      results.sermonUploadReminders++;
    }
  } catch (err: any) {
    results.errors.push(`Sermon check: ${err.message}`);
  }

  // ACTION 3: Service reminder
  try {
    db.prepare(
      "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
    ).run(
      "service-reminder",
      "all-active-members",
      `☀️ Sunday Service Reminder — ${churchName}`,
      `Good morning, family! 🙏 Service starts at 9:00am today at ${churchName}. ` +
        `Come expecting a Word from God. See you in the house! — ChurchOS Sunday Reminder`,
    );
    results.serviceReminderSent = true;
  } catch (err: any) {
    results.errors.push(`Service reminder: ${err.message}`);
  }

  // ACTION 4: Weekly health report
  try {
    const rows = db
      .prepare(
        "SELECT status, COUNT(*) AS c FROM members WHERE churchName = ? GROUP BY status",
      )
      .all(churchName) as any[];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.status] = r.c;
    const weekAgo2 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const newVisitors = (
      db
        .prepare(
          "SELECT COUNT(*) AS c FROM visitors WHERE churchName = ? AND createdAt >= ?",
        )
        .get(churchName, weekAgo2) as { c: number }
    ).c;
    const active = counts.active ?? 0;
    const atRisk = counts.atRisk ?? 0;
    const ghost = counts.ghost ?? 0;
    let body =
      `Good morning, Pastor. Here's this Sunday's snapshot for ${churchName}:\n\n` +
      `✅ Active members: ${active}\n` +
      `⚠️ At Risk (2+ misses): ${atRisk}\n` +
      `🔴 Ghost members (4+ misses): ${ghost}\n` +
      `👋 New visitors this week: ${newVisitors}`;
    if (ghost > 0)
      body += `\n\nYou have ${ghost} ghost member${ghost > 1 ? "s" : ""}. Their cell leaders have been notified.`;
    if (newVisitors > 0)
      body += `\n${newVisitors} new visitor${newVisitors > 1 ? "s" : ""} registered this week. Their 14-day nurture sequences are running.`;
    body += `\n\nHave a powerful service today. — ChurchOS Sunday Agent`;
    db.prepare(
      "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
    ).run("weekly-report", "pastor@demo.com", `📊 This Sunday's Congregation Health Report`, body);
    results.weeklyReportSent = true;
  } catch (err: any) {
    results.errors.push(`Weekly report: ${err.message}`);
  }

  logger.info({ results }, "Sunday agent run completed");
  return results;
}

export function runPostServiceNotif(churchName = "Demo Church Lagos") {
  db.prepare(
    "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
  ).run(
    "post-service",
    "media@demo.com",
    `🎙️ Upload today's sermon`,
    `Service is done! Please upload today's sermon recording to the Sermon Archive before you leave. ` +
      `Members are already asking for the replay. Takes 2 minutes.`,
  );
  logger.info({ churchName }, "Post-service notification sent");
}
