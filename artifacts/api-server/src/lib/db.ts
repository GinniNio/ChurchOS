import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { logger } from "./logger";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

export const db = new Database(path.join(dataDir, "churchos.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  churchName TEXT NOT NULL,
  fullName TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  howHeard TEXT,
  firstTime INTEGER NOT NULL DEFAULT 1,
  visitDate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  cellLeaderEmail TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  churchName TEXT NOT NULL,
  sermonTitle TEXT NOT NULL,
  preacher TEXT NOT NULL,
  serviceDate TEXT NOT NULL,
  scripture1 TEXT,
  scripture2 TEXT,
  scripture3 TEXT,
  mainPoints TEXT,
  announcements TEXT,
  offeringTheme TEXT,
  generatedHtml TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS giving (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  churchName TEXT NOT NULL,
  donorName TEXT NOT NULL,
  donorPhone TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ref TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  churchName TEXT NOT NULL,
  fullName TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  cellGroup TEXT NOT NULL,
  cellLeaderEmail TEXT,
  joinDate TEXT,
  lastAttendance TEXT,
  consecutiveMisses INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memberId INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  serviceDate TEXT NOT NULL,
  present INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(memberId, serviceDate)
);

CREATE TABLE IF NOT EXISTS sermons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  churchName TEXT NOT NULL,
  title TEXT NOT NULL,
  preacher TEXT NOT NULL,
  sermonDate TEXT NOT NULL,
  scripture TEXT NOT NULL,
  seriesName TEXT,
  description TEXT,
  audioFilename TEXT,
  playCount INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sentAt TEXT NOT NULL DEFAULT (datetime('now')),
  read INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  churchName TEXT NOT NULL,
  adminEmail TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitor_sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitorId INTEGER NOT NULL,
  step INTEGER NOT NULL,
  scheduledAt TEXT NOT NULL,
  sentAt TEXT,
  status TEXT DEFAULT 'pending',
  messageType TEXT,
  recipient TEXT,
  subject TEXT,
  body TEXT,
  FOREIGN KEY (visitorId) REFERENCES visitors(id)
);

CREATE INDEX IF NOT EXISTS idx_visitors_church ON visitors(churchName);
CREATE INDEX IF NOT EXISTS idx_giving_church ON giving(churchName);
CREATE INDEX IF NOT EXISTS idx_members_church ON members(churchName);
CREATE INDEX IF NOT EXISTS idx_sermons_church ON sermons(churchName);
CREATE INDEX IF NOT EXISTS idx_programs_church ON programs(churchName);
CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON attendance_log(memberId, serviceDate);
CREATE INDEX IF NOT EXISTS idx_visitor_sequences_visitor ON visitor_sequences(visitorId);
CREATE INDEX IF NOT EXISTS idx_visitor_sequences_status ON visitor_sequences(status, scheduledAt);
`);

// Additive migrations — wrapped in try/catch so they are safe on existing DBs
try { db.exec("ALTER TABLE sermons ADD COLUMN transcript TEXT"); } catch { /* already exists */ }

// Spread demo giving records across 90 days so consistent/silent detection works in demos
{
  const now2 = new Date();
  const iso = (d: number) => new Date(now2.getTime() - d * 86400000).toISOString();

  // Update the 5 original seed records to have spread-out dates
  const updates: [string, string][] = [
    ["DEMO-TITHE-001",  iso(80)],   // Adaeze — 80 days ago
    ["DEMO-OFF-001",    iso(45)],   // Chinedu — 45 days ago
    ["DEMO-BLD-001",    iso(75)],   // Ngozi   — 75 days ago
    ["DEMO-OFF-002",    iso(20)],   // Funmi   — 20 days ago
    ["DEMO-TITHE-002",  iso(60)],   // Emeka   — 60 days ago
  ];
  const upd = db.prepare("UPDATE giving SET createdAt = ? WHERE ref = ?");
  for (const [ref, date] of updates) upd.run(date, ref);

  // Add extra records to make 3 donors have 3+ gifts (required for consistent/silent detection)
  const insGiving2 = db.prepare(
    `INSERT OR IGNORE INTO giving (churchName, donorName, donorPhone, amount, category, status, ref, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const church2 = "Demo Church Lagos";
  const extraGiving: [string, string, string, number, string, string, string, string][] = [
    // Adaeze Okafor — 4 gifts total, last gift 5 days ago → isConsistent
    [church2, "Adaeze Okafor", "+2348012340001", 6000, "Tithe",    "successful", "DEMO-TITHE-003", iso(50)],
    [church2, "Adaeze Okafor", "+2348012340001", 5500, "Tithe",    "successful", "DEMO-TITHE-004", iso(22)],
    [church2, "Adaeze Okafor", "+2348012340001", 5000, "Tithe",    "successful", "DEMO-TITHE-005", iso(5)],
    // Ngozi Bello — 3 gifts total, last gift 35 days ago → isSilent (pastoral care flag)
    [church2, "Ngozi Bello",   "+2348012340003", 8000, "Building Project", "successful", "DEMO-BLD-002", iso(55)],
    [church2, "Ngozi Bello",   "+2348012340003", 12000,"Building Project", "successful", "DEMO-BLD-003", iso(35)],
    // Emeka Nwosu — 3 gifts total, last gift 8 days ago → isConsistent
    [church2, "Emeka Nwosu",   "+2348012340006", 8000, "Tithe",    "successful", "DEMO-TITHE-006", iso(30)],
    [church2, "Emeka Nwosu",   "+2348012340006", 7000, "Tithe",    "successful", "DEMO-TITHE-007", iso(8)],
  ];
  for (const row of extraGiving) insGiving2.run(...row);
}

export type NotifyType = "sms" | "email";
export function notify(type: NotifyType, recipient: string, subject: string, body: string): void {
  db.prepare(
    "INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)",
  ).run(type, recipient, subject, body);
}

export function rowToVisitor(r: any) {
  return { ...r, firstTime: !!r.firstTime };
}
export function rowToNotification(r: any) {
  return { ...r, read: !!r.read };
}

function seedIfEmpty() {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM members").get() as { c: number }).c;
  if (count > 0) return;
  const church = "Demo Church Lagos";
  const now = new Date();
  const isoDays = (d: number) =>
    new Date(now.getTime() - d * 86400000).toISOString().slice(0, 10);

  const insMember = db.prepare(
    `INSERT INTO members (churchName, fullName, phone, email, cellGroup, cellLeaderEmail, joinDate, lastAttendance, consecutiveMisses, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const seedMembers = [
    ["Adaeze Okafor", "+2348012340001", "adaeze@example.com", "Faith Cell", "leader.faith@example.com", isoDays(7), 0, "active"],
    ["Chinedu Eze", "+2348012340002", "chinedu@example.com", "Hope Cell", "leader.hope@example.com", isoDays(7), 0, "active"],
    ["Ngozi Bello", "+2348012340003", "ngozi@example.com", "Faith Cell", "leader.faith@example.com", isoDays(28), 3, "atRisk"],
    ["Tunde Adeyemi", "+2348012340004", "tunde@example.com", "Grace Cell", "leader.grace@example.com", isoDays(56), 6, "ghost"],
    ["Funmi Lawal", "+2348012340005", "funmi@example.com", "Hope Cell", "leader.hope@example.com", isoDays(14), 1, "active"],
    ["Emeka Nwosu", "+2348012340006", "emeka@example.com", "Grace Cell", "leader.grace@example.com", isoDays(7), 0, "active"],
    ["Blessing Uche", "+2348012340007", "blessing@example.com", "Faith Cell", "leader.faith@example.com", isoDays(35), 4, "atRisk"],
    ["Samuel Ibrahim", "+2348012340008", "samuel@example.com", "Hope Cell", "leader.hope@example.com", isoDays(70), 8, "ghost"],
  ];
  for (const [name, phone, email, cell, leader, last, misses, status] of seedMembers) {
    insMember.run(
      church,
      name,
      phone,
      email,
      cell,
      leader,
      isoDays(180),
      last,
      misses,
      status,
    );
  }

  const insVisitor = db.prepare(
    `INSERT INTO visitors (churchName, fullName, phone, email, howHeard, firstTime, visitDate, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const seedVisitors = [
    ["Joy Okonkwo", "+2348099990001", "joy@example.com", "Friend", 1, isoDays(2), "new"],
    ["David Akinwale", "+2348099990002", "david@example.com", "Instagram", 1, isoDays(5), "contacted"],
    ["Mary Adeleke", "+2348099990003", null, "Walked in", 1, isoDays(9), "returned"],
    ["Peter Olu", "+2348099990004", "peter@example.com", "Radio", 0, isoDays(14), "cold"],
    ["Grace Etim", "+2348099990005", "grace@example.com", "Friend", 1, isoDays(1), "new"],
  ];
  for (const v of seedVisitors) insVisitor.run(church, ...v);

  const insSermon = db.prepare(
    `INSERT INTO sermons (churchName, title, preacher, sermonDate, scripture, seriesName, description, audioFilename, playCount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const seedSermons = [
    ["Walking in Faith", "Pastor Samuel Adeyemi", isoDays(7), "Hebrews 11:1-6", "Faith Series", "An encouraging word on trusting God in every season.", null, 42],
    ["The Power of Prayer", "Pastor Grace Okoro", isoDays(14), "James 5:13-18", "Prayer Series", "Discover how persistent prayer changes lives.", null, 78],
    ["Living a Life of Purpose", "Pastor Emmanuel Bassey", isoDays(21), "Jeremiah 29:11", "Purpose Series", "Aligning daily decisions with God's plan.", null, 31],
  ];
  for (const s of seedSermons) insSermon.run(church, ...s);

  const insGiving = db.prepare(
    `INSERT INTO giving (churchName, donorName, donorPhone, amount, category, status, ref)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const seedGiving = [
    [church, "Adaeze Okafor", "+2348012340001", 5000, "Tithe", "successful", "DEMO-TITHE-001"],
    [church, "Chinedu Eze", "+2348012340002", 2000, "Offering", "successful", "DEMO-OFF-001"],
    [church, "Ngozi Bello", "+2348012340003", 10000, "Building Project", "successful", "DEMO-BLD-001"],
    [church, "Funmi Lawal", "+2348012340005", 1500, "Offering", "successful", "DEMO-OFF-002"],
    [church, "Emeka Nwosu", "+2348012340006", 7500, "Tithe", "successful", "DEMO-TITHE-002"],
  ];
  for (const g of seedGiving) insGiving.run(...g);

  notify("sms", "+2348012340004", "We Miss You at Church", "Hello Tunde, we noticed you've been away. We'd love to see you this Sunday at Demo Church Lagos!");
  notify("email", "leader.grace@example.com", "Ghost Member Alert: Tunde Adeyemi", "Tunde Adeyemi (Grace Cell) has missed 6 services. Please reach out today.");

  logger.info("Seeded ChurchOS demo data");
}

seedIfEmpty();
