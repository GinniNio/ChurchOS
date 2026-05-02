import { Router, type IRouter } from "express";
import { db } from "../lib/db";

const router: IRouter = Router();

router.get("/dashboard/growth", (req, res) => {
  const church =
    (req.query.churchName as string) ||
    (req.query.church as string) ||
    "Demo Church Lagos";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  // ── Visitors ──────────────────────────────────────────────────────────────
  const visitorTotal = (
    db.prepare("SELECT COUNT(*) AS c FROM visitors WHERE churchName = ?").get(church) as any
  ).c;
  const visitorThisMonth = (
    db
      .prepare("SELECT COUNT(*) AS c FROM visitors WHERE churchName = ? AND visitDate >= ?")
      .get(church, monthStart) as any
  ).c;
  const visitorRetained = (
    db
      .prepare("SELECT COUNT(*) AS c FROM visitors WHERE churchName = ? AND status = 'returned'")
      .get(church) as any
  ).c;
  const conversionRate =
    visitorTotal > 0
      ? Math.round((visitorRetained / visitorTotal) * 100) + "%"
      : "0%";

  // ── Members ───────────────────────────────────────────────────────────────
  const memberRows = db
    .prepare("SELECT status, COUNT(*) AS c FROM members WHERE churchName = ? GROUP BY status")
    .all(church) as { status: string; c: number }[];
  let memberTotal = 0;
  let memberActive = 0;
  for (const r of memberRows) {
    memberTotal += r.c;
    if (r.status === "active") memberActive = r.c;
  }
  const needsAttention = (
    db
      .prepare("SELECT COUNT(*) AS c FROM members WHERE churchName = ? AND consecutiveMisses >= 2")
      .get(church) as any
  ).c;
  const lapsed = (
    db
      .prepare("SELECT COUNT(*) AS c FROM members WHERE churchName = ? AND consecutiveMisses >= 4")
      .get(church) as any
  ).c;
  const retentionRate =
    memberTotal > 0
      ? Math.round((memberActive / memberTotal) * 100) + "%"
      : "0%";

  // ── Giving ────────────────────────────────────────────────────────────────
  const totalThisMonth = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) AS s FROM giving WHERE churchName = ? AND status='successful' AND createdAt >= ?",
      )
      .get(church, monthStart + "T00:00:00.000Z") as any
  ).s;
  const totalGivers = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT donorPhone) AS c FROM giving WHERE churchName = ? AND status='successful'",
      )
      .get(church) as any
  ).c;
  const topCatRow = db
    .prepare(
      "SELECT category, SUM(amount) AS s FROM giving WHERE churchName = ? AND status='successful' GROUP BY category ORDER BY s DESC LIMIT 1",
    )
    .get(church) as any;

  // ── Sermons ───────────────────────────────────────────────────────────────
  const sermonTotal = (
    db.prepare("SELECT COUNT(*) AS c FROM sermons WHERE churchName = ?").get(church) as any
  ).c;
  const totalPlays = (
    db
      .prepare("SELECT COALESCE(SUM(playCount),0) AS s FROM sermons WHERE churchName = ?")
      .get(church) as any
  ).s;
  const mostPlayed = db
    .prepare(
      "SELECT title, preacher, playCount FROM sermons WHERE churchName = ? ORDER BY playCount DESC LIMIT 1",
    )
    .get(church) as any;

  // ── Inbox ─────────────────────────────────────────────────────────────────
  const pendingApprovals = (
    db
      .prepare("SELECT COUNT(*) AS c FROM notifications WHERE approvalStatus = 'pending'")
      .get() as any
  ).c;

  // ── Recent lapsed members for priority list ───────────────────────────────
  const lapsedMembers = db
    .prepare(
      "SELECT fullName FROM members WHERE churchName = ? AND consecutiveMisses >= 4 ORDER BY consecutiveMisses DESC LIMIT 2",
    )
    .all(church) as { fullName: string }[];

  // ── Unsent sermons (no audio, within last 7 days) ─────────────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const unseenSermon = db
    .prepare(
      "SELECT title FROM sermons WHERE churchName = ? AND audioFilename IS NULL AND sermonDate >= ? ORDER BY sermonDate DESC LIMIT 1",
    )
    .get(church, sevenDaysAgo) as any;

  res.json({
    visitors: {
      total: visitorTotal,
      thisMonth: visitorThisMonth,
      retained: visitorRetained,
      conversionRate,
    },
    members: {
      total: memberTotal,
      active: memberActive,
      needsAttention,
      lapsed,
      retentionRate,
      lapsedNames: lapsedMembers.map((m) => m.fullName),
    },
    giving: {
      totalThisMonth,
      totalGivers,
      topCategory: topCatRow?.category ?? "—",
    },
    sermons: {
      total: sermonTotal,
      totalPlays,
      mostPlayed: mostPlayed
        ? { title: mostPlayed.title, preacher: mostPlayed.preacher, playCount: mostPlayed.playCount }
        : null,
      pendingUpload: unseenSermon ? unseenSermon.title : null,
    },
    inbox: {
      pendingApprovals,
    },
  });
});

export default router;
