# Product Requirements Document (PRD)

## Ark Auction Personal - Desktop & Mobile App

**Platform:**
- Desktop: Windows only (target: PC gamers — Steam/Epic)
- Mobile: Android + iOS (target: console players — PS5/Xbox yang tidak punya akses desktop app)

**Tech Stack:**
- Desktop: Tauri v2 (Rust backend) + Next.js (Frontend)
- Mobile: Flutter (Android & iOS)
- Cloud Sync: Supabase (BaaS)

**Target User:** Ark Survival Ascended community members yang aktif di auction/trading
- **PC players** (Steam/Epic) → pakai desktop app Windows
- **Console players** (PS5/Xbox) → pakai mobile app sebagai alternatif

---

## Overview

Aplikasi multi-platform untuk mengelola auction, timer, alarm, dan tracking inventory/expenses dalam konteks trading community Ark Survival Ascended. Desktop (Windows) dan mobile memiliki full feature parity, dengan data sync via Supabase. Mobile app menjadi alternatif utama bagi console players yang tidak bisa install desktop app.

---

## Core Features

### 1. Timer & Alarm

- Countdown timer (custom duration)
- Stopwatch
- Multiple alarm presets
- Alarm with label/nama (misal: "Feed dino", "Boss fight prep")

### 2. Auction Alert

User input detail auction, app memberikan reminder otomatis menjelang deadline.
Mendukung **smart input dari link** — app extract timestamp dari post asli untuk menentukan start time secara akurat.

**Input Flow:**

```
Step 1: User paste link (Facebook / Discord)
         │
         ▼
Step 2: App fetch post metadata → extract original post timestamp
         │
         ▼
Step 3: User pilih/confirm duration (24h, 48h, etc.)
         │
         ▼
Step 4: Auto-calculate:
         • start_time = original post timestamp (dari link)
         • end_time = start_time + duration
         │
         ▼
Step 5: (Optional) User paste post text → app parse & validate:
         • Cross-check start/end time dari text vs calculated
         • Extract: title, bid amount, currency, min increment
         • Jika ada conflict → tampilkan warning, user pilih mana yang benar
         │
         ▼
Step 6: User review & confirm → auction + reminders created
```

**Link-Based Time Extraction:**
- **Facebook post URL** → fetch via Facebook Graph API / Open Graph meta tags / scraping `og:updated_time` → get original post creation timestamp
- **Discord message link** → extract timestamp dari Discord message ID (Snowflake ID contains timestamp) — no API call needed, timestamp encoded in the ID itself
- Extracted timestamp = **auction start time** (karena seller posting = auction dimulai)
- End time = start_time + duration yang user pilih

**Optional Text Validation:**
Tidak semua seller mencantumkan waktu eksplisit di post. Jika user paste post text:
- App coba parse waktu dari text (regex patterns untuk common formats)
- Jika ditemukan → cross-check dengan timestamp dari link
- Jika conflict (misal: post timestamp 8:30 PM tapi text bilang "Starts 8:35 PM") → tampilkan warning dengan kedua opsi, user pilih
- Jika tidak ditemukan waktu di text → silently use link timestamp (no warning)
- Parse juga: title, bid amount, currency, increment, pickup server → auto-fill form

**Example Post (Facebook):**
```
I starting Trait Mobile Armor auction!
💥24-hour auction. Pack of 5 Great Mobile traits (60% bonus)
️ Bidding starts at 500 Tek Ceilings.
Minimum increments: 50 Tek Ceilings.
⏳️Starts 8:35 PM German time 17/03/2026
⌛️Ends 8:35 PM German time 18/03/2026
💰Winner pick on my Astraeos or Ragnarok server.
😉Good luck!
```

**Auto-extracted from above:**
| Field | Source | Value |
|-------|--------|-------|
| Start time | Facebook post timestamp (primary) | dari link metadata |
| End time | start_time + parsed duration | +24h |
| Duration | Parsed dari text "24-hour auction" | 24h |
| Title | Parsed dari text | Trait Mobile Armor - Pack of 5 Great Mobile traits (60% bonus) |
| Starting bid | Parsed dari text | 500 Tek Ceilings |
| Min increment | Parsed dari text | 50 Tek Ceilings |
| Pickup server | Parsed dari text (notes) | Astraeos or Ragnarok |
| Text start time | Parsed dari text (optional validation) | 8:35 PM CET 17/03/2026 |
| Text end time | Parsed dari text (optional validation) | 8:35 PM CET 18/03/2026 |

**Input Form Fields:**
- Link sumber (Facebook group post URL / Discord message link) — **primary input**
- Auction title / item name (auto-filled dari text parse, editable)
- Auction duration type: 12 Jam, 24 Jam, 48 Jam, atau custom (auto-detected dari text)
- Start time (auto-filled dari link timestamp, editable)
- End time (auto-calculated, editable)
- Current bid amount (auto-filled dari text parse, editable)
- Bid currency (auto-filled, editable — e.g., "Tek Ceilings", "Ingots")
- Min bid increment (auto-filled dari text parse, optional)
- Pickup server (auto-filled dari text parse, optional)
- Notes (optional)
- Category (custom, misal: Dino, Item, Service)
- Post text (optional — paste untuk auto-parse & validation)

**Auto-Reminder Schedule:**
Setelah auction di-input, app otomatis set reminder di:
- 1 jam sebelum berakhir
- 30 menit sebelum berakhir
- 15 menit sebelum berakhir
- 5 menit sebelum berakhir → **escalate ke force-active notification**
- 1 menit sebelum berakhir (LAST CALL) → **escalate ke force-active notification**

User bisa customize interval reminder per auction.

**Notification Escalation:**
- Reminder ≥ 15 menit: normal notification (auto-dismiss setelah beberapa detik)
- Reminder ≤ 5 menit: **force-active notification** — persistent, alarm sound, tetap visible sampai di-dismiss
- Desktop: Windows Toast `scenario="urgent"` / `scenario="alarm"`
- Mobile: Android heads-up notification (high priority FCM) + iOS critical alert

**Dashboard - Timeline View:**
- Calendar/timeline view yang menampilkan semua active auctions
- Visual timeline per auction dengan marker reminder
- Color-coded berdasarkan urgency (hijau → kuning → merah)
- Quick-action: klik untuk buka link Discord/Facebook
- Filter by category, status (active/ended/won/lost)

**Auction Status:**
- `Active` - auction masih berjalan
- `Won` - user menang bid
- `Lost` - user kalah bid
- `Expired` - auction berakhir tanpa action
- `Cancelled` - dibatalkan

### 3. Inventory Calculator

Track items yang diperoleh dari auction (won bids) dan direct orders.

**Custom Categories:**
User bisa buat kategori sendiri, contoh:
- Dino (fields: species, level, stats, mutations)
- Items (fields: item name, quantity, quality)
- Services (fields: service type, provider, duration)
- Resources (fields: resource name, quantity)

**Per Category:**
- Custom fields (text, number, dropdown, date)
- Total count per category
- Search & filter
- Link ke auction record (jika dari auction)

### 4. Expense Tracking

Track pengeluaran untuk trading/auction.

**Dual Currency Support:**
- In-game currency: user define sendiri (ingots, poly, element, busak, hard poly, dll)
- Real money: IDR, USD, atau currency lain
- Optional conversion rate antara in-game ↔ real money

**Transaction Types:**
- `Buy` - beli item/dino (expense)
- `Sell` - jual item/dino (income)
- `Bid` - bid di auction (expense, linked ke auction record)
- `Trade` - tukar item (barter)

**Tracking Fields:**
- Tanggal transaksi
- Tipe transaksi (buy/sell/bid/trade)
- Item/dino yang di-transaksikan
- Amount (in-game currency dan/atau real money)
- Counterparty (siapa yang jual/beli)
- Notes
- Link ke auction / inventory record

**Reports:**
- Total expense vs income (profit/loss)
- Expense breakdown by category
- Monthly summary
- Top items by spending

---

## System Behavior

### System Tray
- App minimize ke system tray (tidak close)
- Tray icon dengan context menu: Open, Pause Alerts, Quit
- Background process tetap jalan untuk monitoring auction deadlines

### Notifications

#### Desktop (Windows)
- **Wajib pakai Native OS Notification (Windows Toast)**
- Notification **harus force-to-active** (scenario `urgent` / `alarm`):
  - Toast muncul di atas semua window dan tetap visible sampai di-dismiss
  - Tidak hilang otomatis setelah beberapa detik (persistent)
  - Disertai alarm sound (configurable)
  - Menggunakan Windows Toast XML schema dengan `scenario="urgent"` atau `scenario="alarm"`
- Notification content: auction title, waktu tersisa, current bid, link sumber
- Click notification → buka app ke auction detail
- Action buttons di toast: "Open Auction", "Dismiss", "Snooze 5min"
- User setting: bisa pilih antara `urgent` (force-active) atau `default` (normal toast) per auction

#### Mobile (Android & iOS — Phase 4)
- **Android: Wajib pakai FCM (Firebase Cloud Messaging)**
  - Push notification via Supabase Edge Functions → FCM HTTP v1 API
  - Custom notification layout (bukan default FCM notification):
    - Custom icon & color branding
    - Expanded view dengan auction title, countdown, current bid
    - Action buttons: "Open", "Snooze", "Mark as Lost"
    - Notification channel: `auction_alerts` (high importance, sound + vibrate)
    - Heads-up notification (force popup) untuk reminder ≤ 5 menit
  - Data message (bukan notification message) → agar app bisa handle custom UI via Flutter
  - Background handling via `firebase_messaging` + `flutter_local_notifications` package
- **iOS: APNs via FCM**
  - Push via FCM yang forward ke APNs
  - Critical alert untuk reminder ≤ 5 menit (requires user permission + Apple entitlement)
  - Rich notification dengan UNNotificationContentExtension (custom UI)
  - Action buttons: "Open", "Snooze", "Mark as Lost"
- Click notification → buka app ke auction detail (deep link)

### Data Storage
- **Phase 1-2:** SQLite lokal (offline-first, desktop only)
- **Phase 3:** Supabase cloud sync (desktop ↔ mobile)
- **Phase 4:** Flutter mobile dengan Supabase sebagai primary data layer

---

## Development Phases

### Phase 1 - MVP (Desktop Windows)
- [ ] Tauri + Next.js project setup (Windows target only)
- [ ] Timer & Alarm (basic)
- [ ] Auction Alert dengan manual input
- [ ] Auction list view + countdown
- [ ] System tray + Windows Toast notifications
- [ ] SQLite local storage
- [ ] **QA:** Unit test Timer (TM-U01~U12) + Auction (AU-U01~U15) — coverage ≥ 80%
- [ ] **QA:** Component test Timer (TM-C01~C06) + Auction (AU-C01~C10)
- [ ] **QA:** Integration test DB layer (DB-I01~I10)
- [ ] **QA:** System integration smoke test (SY-I01~I08)

### Phase 2 - Enhanced (Desktop Windows)
- [ ] Timeline/calendar view untuk auctions
- [ ] Inventory calculator dengan custom categories
- [ ] Expense tracking (dual currency)
- [ ] Reports & summary dashboard
- [ ] **QA:** Unit test Inventory (IN-U01~U14) + Expense (EX-U01~U15) — coverage ≥ 80%
- [ ] **QA:** Component test Inventory (IN-C01~C06) + Expense (EX-C01~C06)

### Phase 3 - Cloud Sync
- [ ] Supabase project setup (auth, database, realtime)
- [ ] Migrasi schema SQLite → Supabase PostgreSQL
- [ ] Sync engine: SQLite (local) ↔ Supabase (cloud)
- [ ] Offline-first: local writes → queue → sync saat online
- [ ] Conflict resolution strategy (last-write-wins atau merge)
- [ ] User auth (email/password, optional Discord OAuth)
- [ ] Data export/import (JSON, CSV)
- [ ] **QA:** Sync engine tests (SN-I01~I08) — coverage ≥ 85%

### Phase 4 - Mobile (Flutter — Android + iOS)
- [ ] Flutter project setup (Android + iOS)
- [ ] Supabase Flutter SDK integration
- [ ] Timer & Alarm (dengan local notifications)
- [ ] Auction Alert + push notifications (FCM/APNs via Supabase Edge Functions)
- [ ] Timeline view (full feature parity dengan desktop)
- [ ] Inventory calculator dengan custom categories
- [ ] Expense tracking (dual currency)
- [ ] Reports & summary dashboard
- [ ] Offline support (local cache + sync)
- [ ] **QA:** Dart unit tests (FL-U01~U07) — coverage ≥ 80%
- [ ] **QA:** Widget tests (FL-W01~W08)
- [ ] **QA:** Integration test full app flow

### Phase 5 - Polish & Extras
- [ ] Themes (dark/light) di desktop & mobile
- [ ] Discord bot integration (optional)
- [ ] Widget Android/iOS untuk quick auction countdown view
- [ ] Windows startup auto-launch option
- [ ] App auto-update (Tauri updater plugin)
- [ ] **QA:** Regression test all features after polish changes
