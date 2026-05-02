import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { db, uploadsDir } from "../lib/db";
import { CreateSermonBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ALLOWED_AUDIO_EXT = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac"]);
const ALLOWED_AUDIO_MIME = /^audio\//;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_AUDIO_EXT.has(ext) ? ext : ".mp3";
    cb(null, `sermon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_AUDIO_MIME.test(file.mimetype) && ALLOWED_AUDIO_EXT.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed (mp3, m4a, wav, ogg, aac)"));
    }
  },
});

router.get("/sermons", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  res.json(
    db
      .prepare("SELECT * FROM sermons WHERE churchName = ? ORDER BY sermonDate DESC, id DESC")
      .all(church),
  );
});

router.get("/sermons/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM sermons WHERE id = ?").get(Number(req.params.id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/sermons", (req, res, next) => {
  upload.single("audio")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(400).json({ error: "UploadError", message });
      return;
    }
    next();
  });
}, (req, res) => {
  const raw = { ...req.body };
  if (req.file) raw.audioFilename = req.file.filename;
  const body = CreateSermonBody.parse(raw);
  const info = db
    .prepare(
      `INSERT INTO sermons (churchName, title, preacher, sermonDate, scripture, seriesName, description, audioFilename, playCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .run(
      body.churchName,
      body.title,
      body.preacher,
      body.sermonDate,
      body.scripture,
      body.seriesName ?? null,
      body.description ?? null,
      body.audioFilename ?? null,
    );
  res.status(201).json(db.prepare("SELECT * FROM sermons WHERE id = ?").get(info.lastInsertRowid));
});

router.post("/sermons/:id/play", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE sermons SET playCount = playCount + 1 WHERE id = ?").run(id);
  const row = db.prepare("SELECT playCount FROM sermons WHERE id = ?").get(id) as { playCount: number } | undefined;
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ playCount: row.playCount });
});

router.get("/sermons/audio/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const ext = path.extname(filename).toLowerCase();
  const filepath = path.join(uploadsDir, filename);
  // Defense in depth: only serve files whose extension is on the audio allowlist
  // AND that resolve inside uploadsDir.
  if (
    ALLOWED_AUDIO_EXT.has(ext) &&
    filepath.startsWith(uploadsDir + path.sep) &&
    fs.existsSync(filepath)
  ) {
    const mime: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".m4a": "audio/mp4",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".aac": "audio/aac",
    };
    res.setHeader("Content-Type", mime[ext] ?? "audio/mpeg");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(filepath);
  } else {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-Demo-Audio", "silent-fallback");
    const silent = Buffer.from(
      "/+MYxAAAAANIAUAAAASEEB4HF/wAACUkAAAAA",
      "base64",
    );
    res.send(silent);
  }
});

router.get("/sermons.rss", (req, res) => {
  const church = (req.query.church as string) || "Demo Church Lagos";
  const rows = db
    .prepare("SELECT * FROM sermons WHERE churchName = ? ORDER BY sermonDate DESC LIMIT 50")
    .all(church) as any[];
  const items = rows
    .map(
      (s) => `  <item>
    <title>${escape(s.title)}</title>
    <description>${escape(s.description ?? s.scripture)}</description>
    <pubDate>${new Date(s.sermonDate).toUTCString()}</pubDate>
    <enclosure url="/api/sermons/audio/${encodeURIComponent(s.audioFilename ?? "demo.mp3")}" type="audio/mpeg"/>
  </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${escape(church)} Sermons</title>
  <description>Sermon archive from ${escape(church)}</description>
${items}
</channel></rss>`;
  res.setHeader("Content-Type", "application/rss+xml");
  res.send(xml);
});

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default router;
