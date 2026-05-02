# ChurchOS — Self-Contained Demo Build
## Zero external dependencies · Runs entirely on Replit · No API keys
**Build date:** May 2, 2026

---

## The Principle

Everything runs inside one Replit project. No accounts, no API keys, no approval processes.
A pastor can open your URL on their phone right now and use all 5 products.

| External service | Replaced with |
|---|---|
| Airtable database | SQLite (built into Python — nothing to install) |
| Email notifications | In-app Notifications inbox at `/inbox` |
| SMS alerts | Same inbox — shows the exact SMS text that would be sent |
| Paystack payments | "Simulate Payment" button — marks the transaction as paid |
| Cloudinary audio hosting | Local `/uploads` folder inside Replit |
| OpenAI bulletin generation | 3 professional templates with variable substitution |

When you're ready to go live, you swap each fake with a real one — one at a time.
The rest of the app doesn't change.

---

## Before You Open Replit

Nothing. No accounts needed. Open Replit and go.

---

## Step 1 — Create the Project

1. Go to **replit.com** → **+ Create Repl** → template: **Python (Flask)**
2. Name it: `churchos-demo`
3. Click **Create Repl**
4. Open **Replit AI** (chat icon in sidebar)

---

## Prompt 1 — Full Project Setup + Database

Paste this into Replit AI. Wait for it to finish before continuing.

```
Build a Python Flask web app called ChurchOS. It is a suite of 5 tools for Nigerian churches.
Use SQLite as the database (import sqlite3, no external database).

Create this file structure:
churchos/
├── app.py
├── database.py          # All DB setup and helper functions
├── requirements.txt     # flask only (no external APIs)
├── uploads/             # For sermon audio files
├── static/
│   └── style.css
└── templates/
    ├── base.html
    ├── index.html
    ├── inbox.html           # Demo notifications inbox
    ├── visitor/
    │   ├── form.html
    │   └── dashboard.html
    ├── sunday_prep/
    │   ├── form.html
    │   └── output.html
    ├── giving/
    │   ├── page.html
    │   └── dashboard.html
    ├── members/
    │   ├── register.html
    │   ├── attendance.html
    │   └── dashboard.html
    └── sermons/
        ├── upload.html
        ├── archive.html
        └── player.html

--- DATABASE.PY ---
Create a file database.py that:

1. Has a function init_db() that creates these SQLite tables if they don't exist:

CREATE TABLE visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  church_name TEXT,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  how_heard TEXT,
  first_time INTEGER DEFAULT 1,
  visit_date TEXT,
  status TEXT DEFAULT 'New',
  cell_leader_email TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  church_name TEXT,
  sermon_title TEXT,
  preacher TEXT,
  service_date TEXT,
  scripture_1 TEXT,
  scripture_2 TEXT,
  scripture_3 TEXT,
  main_points TEXT,
  announcements TEXT,
  offering_theme TEXT,
  generated_html TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE giving (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  church_name TEXT,
  donor_name TEXT,
  donor_phone TEXT,
  amount REAL,
  category TEXT,
  status TEXT DEFAULT 'pending',
  ref TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  church_name TEXT,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  cell_group TEXT,
  cell_leader_email TEXT,
  join_date TEXT,
  last_attendance TEXT,
  consecutive_misses INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER,
  service_date TEXT,
  present INTEGER,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE sermons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  church_name TEXT,
  title TEXT,
  preacher TEXT,
  sermon_date TEXT,
  scripture TEXT,
  series_name TEXT,
  description TEXT,
  audio_filename TEXT,
  play_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  recipient TEXT,
  subject TEXT,
  body TEXT,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  read INTEGER DEFAULT 0
);

2. Has a helper function get_db() that returns a sqlite3 connection with row_factory = sqlite3.Row

3. Has a function notify(type, recipient, subject, body) that inserts into the notifications table
   instead of sending a real email/SMS. This is the demo replacement for all alerts.

--- APP.PY ---
Create app.py that:
1. Imports Flask and calls database.init_db() on startup
2. Registers blueprints for each product (prefix /visitor, /sunday-prep, /giving, /members, /sermons)
3. Has a route GET /inbox that shows all notifications from the notifications table, newest first
4. Has a route POST /inbox/<id>/read that marks a notification as read
5. Has a route GET / for the landing page
6. Seeds the database with demo data on first run if the visitors table is empty:
   - 5 demo visitors for "Demo Church Lagos"
   - 8 demo members for "Demo Church Lagos"  
   - 3 demo sermons for "Demo Church Lagos"
   - 4 demo giving records for "Demo Church Lagos"

--- BASE.HTML ---
Create base.html using Tailwind CSS CDN that has:
- Top nav: "ChurchOS" logo (navy/gold), links to all 5 products + "📬 Inbox" with unread badge
- A yellow banner at the top: "🟡 Demo Mode — all notifications appear in the Inbox instead of being sent"
- Footer: "ChurchOS · Built for Nigerian Churches 🇳🇬"
- Navy (#0F172A) and amber/gold (#F59E0B) colour scheme, clean and professional

--- REQUIREMENTS.TXT ---
flask
werkzeug

Nothing else. No external packages.
```

---

## Prompt 2 — Visitor Follow-Up Machine

```
Build the Visitor Follow-Up Machine for ChurchOS.

Create routes/visitor.py as a Flask blueprint (url_prefix='/visitor').

Route 1: GET /visitor/form
- Shows a clean, mobile-friendly visitor registration form
- Fields: Full Name*, Phone*, Email, How did you hear about us? 
  (dropdown: Friend / Social Media / Drove Past / Online / Other), 
  First visit? (Yes/No radio)
- Church name from URL param ?church=X or defaults to "Demo Church Lagos"
- Large amber "Register as Visitor" submit button

Route 2: POST /visitor/submit  
- Save visitor to SQLite visitors table
- Call notify() twice:
  1. Type "SMS", Recipient: visitor's phone
     Subject: "Welcome SMS to [Name]"
     Body: "Welcome to [Church Name], [Name]! We're so glad you joined us today. 
     We hope to see you again this Sunday. God bless you! — ChurchOS"
  2. Type "EMAIL", Recipient: "church-admin@demo.com"
     Subject: "New Visitor: [Name] — [Church Name]"  
     Body: "A new visitor registered today:\n
     Name: [Name]\nPhone: [Phone]\nHow they heard: [How Heard]\n
     First time: [Yes/No]\n\nPlease ensure their cell leader follows up within 48 hours."
- Redirect to a thank-you page: "Thanks, [Name]! We're so glad you came. 
  Your church will be in touch soon. 🙏" with a link back to the form

Route 3: GET /visitor/dashboard
- Shows all visitors from SQLite ordered by visit_date DESC
- Summary row at top: Total visitors, New (not contacted), Returned this month
- Table with columns: Name, Phone, Visit Date, Status, Days Since Visit, Actions
- Status is a coloured badge: New=blue, Contacted=amber, Returned=green, Cold=grey
- Each row has a "Mark Contacted" and "Mark Returned" button (POST updates status in DB)
- Visitors with status=New and visit older than 7 days shown with a red ⚠️ warning icon
- A "QR Code" button that shows a simple URL: /visitor/form?church=[church name] 
  with instructions "Share this link or print as QR code using qr-code-generator.com"

All templates extend base.html and use Tailwind for styling.
Make the dashboard look like a real CRM — clean rows, hover states, responsive.
```

---

## Prompt 3 — Sunday Prep Suite

```
Build the Sunday Prep Suite for ChurchOS.
This module generates professional church bulletins WITHOUT calling any AI API.
Use template-based generation with variable substitution.

Create routes/sunday_prep.py as a Flask blueprint (url_prefix='/sunday-prep').

Route 1: GET /sunday-prep/
- Input form, fields:
  Church Name, Date, Service Theme/Sermon Title, Preacher Name,
  Scripture 1 / 2 / 3, Main Points (textarea, one per line),
  Announcements (textarea), Offering Theme, Any Special Items
- Amber "Generate My Sunday Program" button

Route 2: POST /sunday-prep/generate
- Take form inputs and fill them into this HTML bulletin template
  (insert the form values where marked with [BRACKETS]):

BULLETIN TEMPLATE (store as a Python multiline string in the route file):
"""
<div style="font-family: 'Georgia', serif; max-width: 600px; margin: auto; 
     border: 3px double #1e3a5f; padding: 30px; background: #fffef7;">
  
  <div style="text-align:center; border-bottom: 2px solid #c8a92a; padding-bottom:15px; margin-bottom:20px;">
    <h1 style="color:#1e3a5f; font-size:24px; margin:0;">[CHURCH NAME]</h1>
    <p style="color:#666; margin:5px 0;">Sunday Service Programme</p>
    <p style="color:#c8a92a; font-weight:bold; font-size:18px;">[DATE]</p>
  </div>

  <div style="text-align:center; background:#1e3a5f; color:white; 
       padding:15px; margin-bottom:20px; border-radius:4px;">
    <p style="margin:0; font-size:12px; letter-spacing:2px;">TODAY'S SERMON</p>
    <h2 style="margin:5px 0; font-size:22px;">[SERMON TITLE]</h2>
    <p style="margin:0; color:#c8a92a;">— [PREACHER] —</p>
  </div>

  <div style="margin-bottom:20px;">
    <h3 style="color:#1e3a5f; border-bottom:1px solid #ddd; padding-bottom:5px;">
      📖 Key Scriptures
    </h3>
    <p>✦ [SCRIPTURE 1]</p>
    <p>✦ [SCRIPTURE 2]</p>
    <p>✦ [SCRIPTURE 3]</p>
  </div>

  <div style="margin-bottom:20px;">
    <h3 style="color:#1e3a5f; border-bottom:1px solid #ddd; padding-bottom:5px;">
      📋 Main Points
    </h3>
    [MAIN POINTS AS LIST ITEMS]
  </div>

  <div style="background:#f9f5e7; padding:15px; margin-bottom:20px; border-left:4px solid #c8a92a;">
    <h3 style="color:#1e3a5f; margin-top:0;">🙏 Offering — [OFFERING THEME]</h3>
    <p style="font-style:italic; color:#555;">"Each of you should give what you have decided in your heart to give, 
    not reluctantly or under compulsion, for God loves a cheerful giver." — 2 Corinthians 9:7</p>
  </div>

  <div style="margin-bottom:20px;">
    <h3 style="color:#1e3a5f; border-bottom:1px solid #ddd; padding-bottom:5px;">
      📢 Announcements
    </h3>
    [ANNOUNCEMENTS AS PARAGRAPHS]
  </div>

  <div style="text-align:center; margin-top:30px; padding-top:15px; 
       border-top:2px solid #c8a92a; color:#888; font-size:12px;">
    <p>You are loved. You belong here. Come back next Sunday.</p>
    <p style="color:#c8a92a;">Generated by ChurchOS · churchos.ng</p>
  </div>
</div>
"""

- Replace all [PLACEHOLDERS] with the form values
- For main points: split by newline, wrap each in <p>✦ [point]</p>
- For announcements: split by newline, wrap each in <p>[announcement]</p>
- Save the generated HTML to SQLite programs table
- Render output.html showing:
  * Live preview of the bulletin (iframe or direct render inside a border)
  * Below: 3 scripture slides — each is a full-width dark div (bg #0F172A) with 
    the scripture reference in large white text (4xl), centred
  * Buttons: "Print Bulletin" (window.print()), "Copy Share Link", "Generate Another"
  * "Print Bulletin" should work — add a <style media="print"> that hides the nav 
    and buttons and makes the bulletin full page

All templates extend base.html. 
Make the output page look impressive — this is the core demo moment for pastors.
```

---

## Prompt 4 — Giving Page + Stewardship Report

```
Build the Giving Page + Stewardship Report for ChurchOS.
All payments are simulated — no real payment gateway.

Create routes/giving.py as a Flask blueprint (url_prefix='/giving').

Route 1: GET /giving/<church_slug>
- Public giving page (e.g. /giving/demo-church-lagos)
- Mobile-first, clean design
- Church name displayed at top (derived from slug: replace hyphens with spaces, title case)
- 5 giving category buttons (large, tappable, with icons):
  🙏 Tithe | 💛 Sunday Offering | 🏗️ Building Fund | ❤️ Welfare | 🌍 Mission
- When a category is clicked: it highlights, a "Enter Amount" field appears (₦ prefix)
- Donor name and phone fields appear
- Big amber "Give Now" button
- Small text below: "Demo Mode — no real payment will be processed"

Route 2: POST /giving/pay
- Create a giving record in SQLite with status='pending', generate a ref like "DEMO-[timestamp]"
- Show a payment simulation page:
  * Shows: "Confirm your gift of ₦[amount] to [Category] at [Church Name]"
  * A large green "✓ Confirm Demo Payment" button
  * Small text: "In the live version, this opens Paystack for card or bank transfer"

Route 3: POST /giving/confirm/<ref>
- Update the giving record: status='paid'
- Call notify():
  Type "RECEIPT", Recipient: donor phone
  Subject: "Giving Receipt — [Church Name]"
  Body: "Dear [Name], your gift of ₦[amount] to [Category] at [Church Name] 
  has been received. Reference: [ref]. 
  'God loves a cheerful giver.' — 2 Cor 9:7. Thank you! — ChurchOS"
- Show receipt page: green checkmark, amount, category, reference number, 
  "Share your giving" button (WhatsApp link)

Route 4: GET /giving/dashboard
- Admin view, password from URL param ?pin=1234 (hardcoded demo PIN)
- Shows:
  * Total giving this month (large ₦ number)
  * Giving by category as a visual bar (CSS width % bars, no JS chart needed)
  * All transactions table: date, name, phone, category, amount, status badge
  * "Download Report" button

Route 5: GET /giving/report
- Generates an HTML page styled as a formal stewardship report:
  * Header: "[Church Name] — Quarterly Stewardship Report"
  * "This report is prepared in the spirit of financial transparency"
  * Summary table: category, total received, % of total
  * Simple bar chart using HTML/CSS only (div with width set to % of max)
  * Closing statement: "We are committed to using every gift with integrity"
  * Footer: "Verified by ChurchOS Stewardship Module"
  * A prominent Stewardship Badge: circular gold border, 
    "STEWARDSHIP CERTIFIED · [YEAR]" text
  * Print button (window.print())

All pages use base.html.
```

---

## Prompt 5 — Ghost Member Detector

```
Build the Ghost Member Detector for ChurchOS.

Create routes/members.py as a Flask blueprint (url_prefix='/members').

Route 1: GET /members/register?church=X
- Form to add a member: Full Name, Phone, Email, Cell Group, Cell Leader Email, Church Name
- Also shows a list of all existing members for that church (below the form)
- "Seed Demo Data" button: if DB is empty for this church, adds 10 realistic Nigerian 
  names with varied last-attendance dates (some recent, some 3-4 weeks ago)

Route 2: POST /members/register
- Save to SQLite members table
- Redirect back to /members/register with success toast

Route 3: GET /members/attendance?church=X&date=YYYY-MM-DD
- Shows all members for that church as a checklist
- Default date = today
- Each member row: checkbox (Present/Absent), name, cell group, last attendance, 
  current consecutive misses
- Members with 2+ misses shown with amber background, 4+ shown with red background
- "Save Attendance" button at bottom

Route 4: POST /members/attendance/save
- For each member submitted:
  * Log to attendance_log table
  * If present: reset consecutive_misses=0, update last_attendance=today, status='Active'
  * If absent: increment consecutive_misses by 1
    - If consecutive_misses == 2: set status='At Risk'
      Call notify():
      Type "EMAIL", Recipient: cell_leader_email
      Subject: "Follow-up needed: [Name] — [Church Name]"
      Body: "[Name] has missed 2 consecutive Sundays at [Church Name].
      Last attendance: [date]. Phone: [phone].
      Please reach out to them this week. — ChurchOS Ghost Member Alert"
    - If consecutive_misses >= 4: set status='Ghost'
      Call notify() with more urgent message
- Redirect to dashboard with summary: "X present, Y absent, Z alerts sent"

Route 5: GET /members/dashboard?church=X
- Shows all members sorted by consecutive_misses DESC (worst first)
- Status badge colours: 
  Active=green, At Risk=amber, Ghost=red, Inactive=grey
- Summary cards at top: 
  Total | Active (green count) | At Risk (amber count) | Ghost (red count)
- Each row: Name, Cell Group, Last Attendance, Misses, Status, Phone
- Filter buttons: All / Active / At Risk / Ghost
- "Export Ghost List" link: /members/export?church=X&status=Ghost

Route 6: GET /members/export
- Returns a CSV download of filtered members
- Columns: Name, Phone, Cell Group, Cell Leader Email, Last Attendance, Consecutive Misses

All templates extend base.html. The dashboard is the money page — make it look alarming 
(in a good way). A pastor opening this and seeing 8 red "Ghost" members will immediately 
understand why they need this tool.
```

---

## Prompt 6 — Sermon Archive & Streaming

```
Build the Sermon Archive & Streaming module for ChurchOS.

Create routes/sermons.py as a Flask blueprint (url_prefix='/sermons').
Audio files upload to the local /uploads folder — no cloud storage.

Route 1: GET /sermons/<church_slug>
- Public sermon archive page
- Shows all sermons for that church as cards (grid: 3 cols desktop, 1 col mobile)
- Each card: big play button icon, title, preacher, date, scripture reference, series, 
  play count ("👂 142 listens")
- Search bar: filters cards in real-time using vanilla JS (no page reload)
- Series filter dropdown
- Clicking a card links to /sermons/<church_slug>/<sermon_id>
- "Subscribe on Spotify" button that links to /sermons/<church_slug>/rss 
  with instructions to submit the URL to Spotify

Route 2: GET /sermons/<church_slug>/<sermon_id>
- Individual sermon page
- Title, preacher, date, scripture (large and prominent)
- HTML5 audio player: <audio controls style="width:100%">
  <source src="/sermons/play/<sermon_id>" type="audio/mpeg">
  </audio>
- If no real audio file: show a "Demo Audio Player" placeholder with a progress bar graphic
- On page load: increment play_count in SQLite via a JS fetch to /sermons/count/<id>
- "Share on WhatsApp" button: 
  href="https://wa.me/?text=🎧 Listen to '[title]' by [preacher]: [current_url]"
- "Copy Link" button
- "More from [Series Name]" section below

Route 3: GET /sermons/play/<sermon_id>
- Serves the uploaded audio file from /uploads/
- If file doesn't exist: return a 200 response with a tiny silent MP3 (base64 encoded)
  so the audio player doesn't break during demo

Route 4: POST /sermons/count/<sermon_id>
- Increment play_count in SQLite, return JSON {"ok": true}

Route 5: GET /sermons/<church_slug>/upload (admin)
- Upload form: Title, Preacher, Date, Scripture, Series Name, Description,
  Audio File (accept .mp3 .m4a, but also allow skipping for demo)
- "Skip audio — add text-only" checkbox for demo purposes

Route 6: POST /sermons/<church_slug>/upload
- Save audio file to /uploads/<church_slug>_<timestamp>.<ext>
- Save record to SQLite sermons table
- Redirect to the sermon's page

Route 7: GET /sermons/<church_slug>/rss
- Returns a valid RSS 2.0 podcast feed (mimetype: application/rss+xml)
- Include <enclosure> tags pointing to /sermons/play/<id>
- This is the real RSS feed — submitting this URL to Spotify will actually work 
  once the app is deployed

Also add a route GET /sermons/count/<sermon_id> that accepts POST for play count.

For the demo: if sermons table is empty for a church, auto-show 3 pre-seeded demo sermons
with titles like "The God Who Sees", "Pressing Forward", "Season of Harvest"

All pages use base.html and Tailwind.
```

---

## Prompt 7 — Landing Page, Inbox & Final Wiring

```
Complete ChurchOS with the landing page, notification inbox, and demo data.

--- LANDING PAGE (index.html) ---

Hero:
- Headline: "The Operating System for Nigerian Churches"
- Sub: "5 tools. One platform. From visitor follow-up to sermon streaming — 
  ChurchOS runs your church so you can focus on people."
- CTA button: "Try the Demo" → links to /visitor/form?church=Demo+Church+Lagos
- Secondary link: "See all products ↓"

5 product cards (each links to the demo version of that product):
1. 🙋 Visitor Follow-Up — "Never lose a visitor again"
   → /visitor/form?church=Demo+Church+Lagos
2. 📋 Sunday Prep — "Your Sunday program in 20 minutes"
   → /sunday-prep/
3. 💛 Church Giving — "Simple giving. Full transparency."
   → /giving/demo-church-lagos
4. 👥 Member Tracker — "Find your ghost members before they're gone"
   → /members/dashboard?church=Demo+Church+Lagos
5. 🎙️ Sermon Archive — "Every sermon. Findable. Shareable. Forever."
   → /sermons/demo-church-lagos

A "How It Works" section (3 steps):
1. Set up your church in 10 minutes
2. Share links with your admin team and members
3. Watch retention, giving, and engagement go up

Pricing teaser (3 tiers):
- Starter: Free — Visitor capture + Sermon Archive
- Growth: ₦5,000/month — All 5 products, up to 300 members
- Mega Church: ₦15,000/month — Unlimited members + custom domain + WhatsApp integration

Email waitlist form:
- Input: church name + admin email
- On submit: save to a "waitlist" SQLite table (add this table to init_db)
  + show toast: "You're on the list! We'll reach out within 48 hours."

--- INBOX PAGE (/inbox) ---

Shows all entries from notifications table, newest first.
Layout: 
- Page title: "📬 Demo Notifications Inbox"
- Sub-title: "In the live version, these are delivered as real SMS and email. 
  Here, you can preview exactly what your members and team would receive."
- Each notification is a card:
  * Icon: 💬 for SMS, ✉️ for EMAIL, 🧾 for RECEIPT
  * Badge: "SMS to [recipient]" or "Email to [recipient]"
  * Subject in bold
  * Body text (full message, formatted nicely)
  * Timestamp
  * "Mark Read" button (fades the card when clicked)
- Unread count shown as a red badge on the Inbox nav link

--- NAV UNREAD BADGE ---
In base.html, update the Inbox nav link to show unread count:
Fetch count from a route GET /inbox/count that returns JSON {"unread": N}
Update the badge with a small JS snippet on page load.

--- DEMO DATA SEEDING ---
In database.py, create a function seed_demo_data() that:
- Only runs if visitors table has 0 rows
- Inserts into visitors: 5 records for "Demo Church Lagos" with names like 
  "Adaeze Okonkwo", "Emeka Nwosu", "Funmilayo Adeyemi", "Chukwuemeka Obi", 
  "Blessing Eze" — mix of statuses (2 New, 1 Contacted, 1 Returned, 1 Cold)
  with visit dates from 1 to 21 days ago
- Inserts into members: 8 records for "Demo Church Lagos" — 3 Active, 
  2 At Risk (consecutive_misses=2), 3 Ghost (consecutive_misses=4-6)
  with Nigerian names
- Inserts into sermons: 3 records for "demo-church-lagos"
- Inserts into giving: 5 records for "Demo Church Lagos" with varied amounts 
  across categories
- Inserts into notifications: 2 sample notifications (one SMS, one email)

Call seed_demo_data() inside init_db() after creating the tables.

--- FINAL CHECKS ---
Make sure:
1. All 5 blueprints are registered in app.py
2. All templates extend base.html
3. The demo mode yellow banner appears on every page
4. / loads cleanly with all 5 product cards
5. Clicking "Try the Demo" goes to the visitor form and it works end-to-end
6. After submitting the visitor form, a notification appears in /inbox

Run the app and fix any import errors or missing variables before finishing.
```

---

## Step 2 — Add Your .env (Only 2 Lines Needed)

In Replit Secrets, add:
```
ADMIN_PIN=1234
SECRET_KEY=churchos-demo-secret-2026
```

That's it. No other keys needed for the demo.

---

## Step 3 — Deploy

1. Click **Deploy** in Replit → **Autoscale** (free tier)
2. Your URL: `churchos-demo.<your-username>.replit.app`
3. Test the full flow on your phone before showing anyone

---

## Today's Build Order (4.5 Hours)

| Time | Task |
|---|---|
| 0:00 – 0:15 | Create Replit project |
| 0:15 – 0:50 | Paste Prompt 1 (setup + database), fix any errors |
| 0:50 – 1:20 | Paste Prompt 2 (Visitor), test the form → inbox flow |
| 1:20 – 1:50 | Paste Prompt 3 (Sunday Prep), test bulletin generation |
| 1:50 – 2:20 | Paste Prompt 4 (Giving), test the simulate payment flow |
| 2:20 – 2:50 | Paste Prompt 5 (Members), test attendance + ghost alerts |
| 2:50 – 3:20 | Paste Prompt 6 (Sermons), test upload + archive |
| 3:20 – 4:00 | Paste Prompt 7 (Landing page + inbox + demo data) |
| 4:00 – 4:30 | Fix errors, deploy, test on phone, share URL |

---

## What a Pastor Sees on Their Phone

1. Opens your URL
2. Sees a clean landing page: "The Operating System for Nigerian Churches"
3. Taps "Try the Demo"
4. Fills the visitor form (their phone number, name) — 60 seconds
5. Sees the thank-you page
6. You show them the dashboard on your laptop: their submission is already there
7. You show them the inbox: the welcome SMS that would have gone to them
8. They say "how much does this cost?"

That's the demo. That sequence works with what you're building today.

---

## When You're Ready to Go Live

Swap one dependency at a time — nothing else changes:

| When | Swap | Takes |
|---|---|---|
| Week 1 | Replace notify() SMS with real Termii API call | 30 min |
| Week 1 | Replace notify() email with real Resend API call | 30 min |
| Week 2 | Replace simulate payment with real Paystack | 2 hrs |
| Week 2 | Replace local file uploads with Cloudinary | 1 hr |
| Week 3 | Replace bulletin templates with OpenAI generation | 2 hrs |
| Week 3 | Replace SQLite with Airtable or PostgreSQL | 3 hrs |

Each swap is isolated. The rest of the app never changes.

---

## When Something Breaks

Copy the full error from the Replit console. 
Paste into Replit AI: **"I got this error, fix it: [paste error]"**

Most common issues:
- **"no such table"** — init_db() didn't run; add `database.init_db()` at the top of app.py
- **"Blueprint already registered"** — duplicate blueprint name; check app.py imports
- **Template not found** — file is in the wrong folder; check the templates/ path
- **Audio player broken** — expected, skip for demo; show the player UI as a visual

---

*Scope written by Claude for Kaye · ChurchOS Demo · May 2, 2026*
