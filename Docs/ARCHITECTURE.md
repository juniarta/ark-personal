# Technical Architecture

## Tech Stack

### Desktop (Phase 1-3)

| Layer | Technology | Alasan |
|-------|-----------|--------|
| Desktop Runtime | **Tauri v2** | Lightweight, Rust-powered, native Windows integration (tray, toast notifications) |
| Frontend | **Next.js (latest)** | React-based, component library ecosystem, SSG for Tauri |
| Backend Logic | **Rust (Tauri Commands)** | System tray, background scheduler, SQLite access, file I/O |
| Local Database | **SQLite** (via `rusqlite` atau `sqlx`) | Embedded, zero-config, offline-first |
| ORM/Migration | **sea-orm** atau **diesel** | Type-safe database operations di Rust |
| State Management | **Zustand** atau **Jotai** | Lightweight, React-friendly |
| UI Components | **shadcn/ui + Tailwind CSS** | Modern, customizable, consistent |
| Date/Time | **chrono** (Rust) + **date-fns** (JS) | Timezone-aware scheduling |
| Notifications | **Tauri Notification Plugin** + **Windows Toast XML** | Native OS notifications with force-active support |

### Mobile (Phase 4)

| Layer | Technology | Alasan |
|-------|-----------|--------|
| Mobile Framework | **Flutter** | Single codebase Android + iOS, mature ecosystem |
| Language | **Dart** | Flutter native, strong typing |
| State Management | **Riverpod** atau **Bloc** | Scalable, testable state management |
| Local Storage | **Hive** atau **Drift (SQLite)** | Offline cache untuk sync |
| Push Notifications | **FCM (Firebase Cloud Messaging)** + **APNs** (via Supabase Edge Functions) | Background auction alerts with custom notification UI |
| Local Notifications | **flutter_local_notifications** | Custom notification layout, heads-up display, action buttons |
| FCM Client | **firebase_messaging** | Receive FCM data messages, background handling |
| UI | **Material 3 + Custom Theme** | Consistent dengan desktop look & feel |

### Shared / Cloud (Phase 3+)

| Layer | Technology | Alasan |
|-------|-----------|--------|
| Cloud Backend | **Supabase** | PostgreSQL, Auth, Realtime, Edge Functions, Storage — all-in-one BaaS |
| Database | **PostgreSQL** (Supabase) | Relational, powerful queries, real-time subscriptions |
| Auth | **Supabase Auth** | Email/password, OAuth (Discord login potential) |
| Realtime Sync | **Supabase Realtime** | Live data sync desktop ↔ mobile |
| Push Notifications | **Supabase Edge Functions → FCM HTTP v1 API** | Server-side auction deadline checker → FCM data message → custom notification di mobile |

---

## Project Structure

```
auction-personal/
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs               # Tauri app entry point
│   │   ├── lib.rs                # Module declarations
│   │   ├── commands/             # Tauri command handlers (IPC)
│   │   │   ├── mod.rs
│   │   │   ├── auction.rs        # Auction CRUD & alert logic
│   │   │   ├── timer.rs          # Timer & alarm commands
│   │   │   ├── inventory.rs      # Inventory operations
│   │   │   └── expense.rs        # Expense tracking commands
│   │   ├── db/                   # Database layer
│   │   │   ├── mod.rs
│   │   │   ├── migrations/       # SQL migration files
│   │   │   ├── models.rs         # Data models / structs
│   │   │   └── repository.rs     # Query functions
│   │   ├── scheduler/            # Background task scheduler
│   │   │   ├── mod.rs
│   │   │   └── auction_monitor.rs # Auction deadline checker
│   │   ├── parser/               # Link & text parsing
│   │   │   ├── mod.rs
│   │   │   ├── facebook.rs       # Facebook post timestamp extraction
│   │   │   ├── discord.rs        # Discord Snowflake ID → timestamp
│   │   │   └── text_parser.rs    # Auction post text → structured data
│   │   ├── notifications/        # OS notification system
│   │   │   ├── mod.rs
│   │   │   └── windows_toast.rs  # Windows Toast XML (force-active)
│   │   └── tray.rs               # System tray setup
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── src/                          # Next.js frontend
│   ├── app/                      # App Router (Next.js)
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard / home
│   │   ├── auctions/
│   │   │   ├── page.tsx          # Auction list + timeline
│   │   │   └── [id]/page.tsx     # Auction detail
│   │   ├── timer/
│   │   │   └── page.tsx          # Timer & alarm
│   │   ├── inventory/
│   │   │   └── page.tsx          # Inventory calculator
│   │   └── expenses/
│   │       └── page.tsx          # Expense tracking
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── auction/              # Auction-specific components
│   │   ├── timer/                # Timer components
│   │   ├── inventory/            # Inventory components
│   │   └── expenses/             # Expense components
│   ├── lib/
│   │   ├── tauri.ts              # Tauri IPC wrapper (invoke commands)
│   │   ├── store.ts              # Zustand/Jotai stores
│   │   └── utils.ts
│   └── styles/
├── Docs/                         # Documentation
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│                  (Next.js)                       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Auction  │  │  Timer   │  │  Inventory/  │   │
│  │ Timeline │  │  Alarm   │  │  Expenses    │   │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │           │
│       └──────────────┼───────────────┘           │
│                      │                           │
│              Tauri invoke() IPC                   │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────┐
│                BACKEND (Rust)                     │
│                      │                           │
│  ┌───────────────────┼────────────────────────┐  │
│  │           Command Handlers                 │  │
│  │  (auction.rs, timer.rs, inventory.rs, ...) │  │
│  └───────────────────┬────────────────────────┘  │
│                      │                           │
│         ┌────────────┼────────────┐              │
│         │            │            │              │
│  ┌──────▼──┐  ┌──────▼──┐  ┌─────▼──────┐  ┌─────────┐  │
│  │ SQLite  │  │Scheduler│  │  System    │  │  Link   │  │
│  │   DB    │  │(tokio)  │  │  Tray +    │  │ Parser  │  │
│  │         │  │         │  │  Notif     │  │ + Text  │  │
│  └─────────┘  └─────────┘  └────────────┘  └─────────┘  │
└──────────────────────────────────────────────────────────┘
```

### IPC Communication (Frontend ↔ Backend)

Frontend memanggil Rust functions via `@tauri-apps/api/core`:

```typescript
// Frontend: memanggil Rust command
import { invoke } from '@tauri-apps/api/core';

const auctions = await invoke('get_active_auctions');
await invoke('create_auction', { payload: { title, endTime, link } });

// Link parsing — user paste link, Rust fetches & extracts timestamp
const postMeta = await invoke('parse_source_link', { url: 'https://facebook.com/...' });
// Returns: { platform, post_timestamp, post_id }

// Text parsing — optional, user paste post text for auto-fill & validation
const parsed = await invoke('parse_auction_text', { text: '...' });
// Returns: { title?, duration?, start_time?, end_time?, bid_amount?, currency?, increment?, notes? }
```

```rust
// Backend: Tauri command handlers
#[tauri::command]
async fn get_active_auctions(db: State<'_, DbPool>) -> Result<Vec<Auction>, String> {
    // query SQLite
}

#[tauri::command]
async fn parse_source_link(url: String) -> Result<PostMetadata, String> {
    // Detect platform → extract timestamp
}

#[tauri::command]
async fn parse_auction_text(text: String) -> Result<ParsedAuctionText, String> {
    // Regex-based extraction of auction details from post text
}
```

### Background Scheduler

Rust backend menjalankan background task (via `tokio`) yang:
1. Setiap 30 detik, cek semua active auctions
2. Jika waktu tersisa match dengan reminder interval (1h, 30m, 15m, 5m, 1m)
3. Kirim native OS notification via Windows Toast XML (lihat Notification Architecture)
4. Update auction status jika sudah expired

---

## Link & Text Parser Architecture

### Source Link Parsing — Timestamp Extraction

Tujuan: extract **original post creation timestamp** dari link sebagai auction start time.

#### Facebook Post

**URL Patterns:**
```
https://www.facebook.com/photo/?fbid=27091470887121330&set=gm.1954220131887890&idorvanity=332105420766044
https://www.facebook.com/groups/332105420766044/posts/1954220131887890/
https://www.facebook.com/permalink.php?story_fbid=...&id=...
```

**Extraction Methods (ordered by reliability):**

1. **Open Graph meta tags (recommended, no auth needed)**
   - HTTP GET ke Facebook URL → parse HTML → extract `<meta property="og:updated_time">` atau `<meta property="article:published_time">`
   - Rust: `reqwest` + `scraper` crate
   - Caveat: Facebook mungkin block scraping → perlu rotate User-Agent, handle rate limit

2. **Facebook Graph API (reliable, needs token)**
   - `GET https://graph.facebook.com/v19.0/{post_id}?fields=created_time&access_token=...`
   - Requires Facebook App + user token (complex setup, mungkin overkill untuk personal app)
   - Simpan sebagai optional setting jika user punya Facebook Developer access

3. **Fallback: User manual input**
   - Jika scraping gagal → form tetap bisa diisi manual
   - Tampilkan warning: "Could not extract timestamp from link, please enter start time manually"

```rust
// src-tauri/src/parser/facebook.rs
pub struct FacebookPostMeta {
    pub post_id: String,
    pub created_at: Option<DateTime<Utc>>,  // original post timestamp
    pub author: Option<String>,
    pub text_preview: Option<String>,
}

pub async fn extract_facebook_timestamp(url: &str) -> Result<FacebookPostMeta, ParseError> {
    // 1. Parse URL → extract post ID
    // 2. HTTP GET with browser-like User-Agent
    // 3. Parse HTML → find og:updated_time meta tag
    // 4. Parse ISO 8601 timestamp → DateTime<Utc>
    // Fallback: return None for created_at if extraction fails
}
```

#### Discord Message Link

**URL Pattern:**
```
https://discord.com/channels/{guild_id}/{channel_id}/{message_id}
```

**Extraction: Snowflake ID → Timestamp (no API call needed)**

Discord message IDs are Snowflake IDs yang encode timestamp:
```
timestamp_ms = (message_id >> 22) + 1420070400000  // Discord epoch
```

```rust
// src-tauri/src/parser/discord.rs
pub fn discord_snowflake_to_timestamp(message_id: u64) -> DateTime<Utc> {
    let discord_epoch = 1_420_070_400_000_u64; // 2015-01-01T00:00:00Z in ms
    let timestamp_ms = (message_id >> 22) + discord_epoch;
    Utc.timestamp_millis_opt(timestamp_ms as i64).unwrap()
}

pub fn parse_discord_link(url: &str) -> Result<DiscordPostMeta, ParseError> {
    // Regex: https://discord.com/channels/(\d+)/(\d+)/(\d+)
    // Extract message_id → snowflake_to_timestamp
}
```

This is **100% reliable** — no API call, no scraping, no auth needed. Timestamp is encoded in the ID itself.

### Auction Text Parser

Regex-based extraction dari auction post text. **Best-effort** — not all fields will be found in every post.

```rust
// src-tauri/src/parser/text_parser.rs
pub struct ParsedAuctionText {
    pub title: Option<String>,
    pub duration_hours: Option<u32>,          // 12, 24, 48, etc.
    pub start_time: Option<DateTime<Utc>>,    // parsed from text (for validation)
    pub end_time: Option<DateTime<Utc>>,      // parsed from text (for validation)
    pub bid_amount: Option<f64>,
    pub bid_currency: Option<String>,         // "Tek Ceilings", "Ingots", etc.
    pub min_increment: Option<f64>,
    pub increment_currency: Option<String>,
    pub pickup_server: Option<String>,
    pub timezone_hint: Option<String>,        // "German time", "EST", "CET", etc.
    pub raw_text: String,
}
```

**Regex Patterns:**

| Field | Pattern Examples |
|-------|-----------------|
| Duration | `(\d+)\s*-?\s*hour`, `(\d+)h\s*auction`, `(\d+)\s*jam` |
| Starting bid | `[Bb]idding starts at\s*(\d[\d,.]*)` , `[Ss]tart(?:ing)?\s*(?:bid|price)[:\s]*(\d[\d,.]*)` |
| Currency | word(s) after bid amount: `(\d+)\s+([\w\s]+?)\.` — e.g., "500 Tek Ceilings" |
| Min increment | `[Mm]in(?:imum)?\s*increment[s]?[:\s]*(\d[\d,.]*)` |
| Start time | `[Ss]tarts?\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*(.+?)\s*(\d{1,2}/\d{1,2}/\d{4})` |
| End time | `[Ee]nds?\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*(.+?)\s*(\d{1,2}/\d{1,2}/\d{4})` |
| Pickup server | `[Pp]ick\s*(?:up)?\s*(?:on|at)\s*(?:my\s*)?(.+?)(?:server)?\.` |
| Timezone | Common timezone keywords: "German time" → CET/CEST, "EST", "PST", "UTC", "WIB" |

**Timezone Handling:**
- Common game community timezone aliases mapped to UTC offsets:
  - "German time" → CET (UTC+1) / CEST (UTC+2) depending on DST
  - "UK time" → GMT/BST
  - "EST" / "PST" / "CST" → standard US timezones
  - "WIB" / "WITA" / "WIT" → Indonesian timezones
- User app setting: `user_timezone` (default) — used when no timezone found in text
- All timestamps converted to UTC internally, displayed in user's local timezone

**Validation Logic:**
```
IF text has start_time AND link has post_timestamp:
    diff = abs(text_start_time - post_timestamp)
    IF diff <= 10 minutes:
        → Use post_timestamp (more accurate, no human typo)
    ELSE:
        → Show warning: "Post was created at {post_timestamp} but text says {text_start_time}"
        → Let user pick which one to use
        → Default selection: post_timestamp

IF text has end_time AND we calculated end_time from (start + duration):
    IF they match (within 10min tolerance):
        → Confirmed, proceed
    ELSE:
        → Show warning, let user pick
```

---

## Notification Architecture

### Desktop — Windows Toast (Force-Active)

Tauri Notification Plugin default hanya kirim basic toast. Untuk force-active behavior, gunakan **Windows Toast XML** langsung via Rust (`windows-rs` crate atau raw COM API).

**Toast XML Template (Urgent/Alarm):**
```xml
<toast scenario="urgent" activationType="protocol" launch="auction://detail/{auction_id}">
  <visual>
    <binding template="ToastGeneric">
      <text>⚠️ AUCTION ENDING SOON</text>
      <text>{auction_title} — {time_remaining} remaining</text>
      <text>Current bid: {current_bid} {currency}</text>
    </binding>
  </visual>
  <actions>
    <action content="Open Auction" activationType="foreground" arguments="open:{auction_id}" />
    <action content="Snooze 5min" activationType="background" arguments="snooze:{auction_id}" />
    <action content="Dismiss" activationType="system" arguments="dismiss" />
  </actions>
  <audio src="ms-winsoundevent:Notification.Looping.Alarm" loop="true" />
</toast>
```

**Key behaviors:**
- `scenario="urgent"`: Toast stays on screen, does NOT auto-dismiss, muncul di atas semua window
- `scenario="alarm"`: Sama seperti urgent + looping audio (untuk LAST CALL 1 menit)
- `scenario="default"`: Normal toast (auto-dismiss setelah ~7 detik) — untuk reminder ≥ 15 menit
- Reminder ≤ 5 menit → `scenario="urgent"`
- Reminder 1 menit (LAST CALL) → `scenario="alarm"` dengan looping sound

**Rust Implementation Approach:**
```rust
// Di src-tauri/src/notifications/
// Option 1: windows-rs crate (recommended)
use windows::UI::Notifications::{ToastNotificationManager, ToastNotification};
use windows::Data::Xml::Dom::XmlDocument;

// Option 2: Tauri plugin notification (basic toasts only, fallback)
// Option 3: tauri-plugin-notification with custom XML passthrough
```

**User Settings:**
- `notification_mode`: `force_active` (default) | `normal` — global setting
- Per-auction override: bisa set specific auction ke `normal` jika tidak mau urgent toast
- `notification_sound`: pilih sound atau mute
- Setting disimpan di `settings` table: key `notification_mode`, `notification_sound`

### Mobile — FCM + Custom Notification (Flutter)

**Architecture Flow:**
```
[Supabase Edge Function — Cron 30 detik]
  → Query: auction_reminders WHERE remind_at <= now() AND is_sent = false
  → Determine priority: reminder ≤ 5min = HIGH, else = DEFAULT
  → Send FCM HTTP v1 API request:
      POST https://fcm.googleapis.com/v1/projects/{project}/messages:send
      {
        "message": {
          "token": "{device_fcm_token}",
          "data": {                          ← DATA message, bukan notification
            "type": "auction_reminder",
            "auction_id": "...",
            "auction_title": "...",
            "time_remaining": "5m",
            "current_bid": "5000",
            "currency": "ingots",
            "priority": "high",              ← high | default
            "source_link": "..."
          },
          "android": {
            "priority": "high"               ← FCM delivery priority
          },
          "apns": {
            "headers": {
              "apns-priority": "10"
            },
            "payload": {
              "aps": {
                "content-available": 1,
                "sound": "auction_alert.caf",
                "interruption-level": "critical"  ← iOS 15+ critical alert (≤5min)
              }
            }
          }
        }
      }
  → Mark reminder as sent
```

**Why FCM Data Message (bukan Notification Message):**
- Data message → app handles notification display sendiri via `flutter_local_notifications`
- Full control atas notification layout, buttons, sound, channel
- Notification message → FCM auto-display pakai default layout, tidak bisa custom
- Data message tetap delivered saat app di background via `onBackgroundMessage`

**Flutter Notification Handler:**
```dart
// firebase_messaging handler
FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);

Future<void> _handleBackgroundMessage(RemoteMessage message) async {
  if (message.data['type'] == 'auction_reminder') {
    final priority = message.data['priority'];

    await flutterLocalNotificationsPlugin.show(
      notificationId,
      '⚠️ AUCTION ENDING — ${message.data['time_remaining']}',
      '${message.data['auction_title']}\nBid: ${message.data['current_bid']} ${message.data['currency']}',
      NotificationDetails(
        android: AndroidNotificationDetails(
          'auction_alerts',                    // channel ID
          'Auction Alerts',                    // channel name
          importance: priority == 'high'
            ? Importance.max                   // heads-up popup
            : Importance.defaultImportance,
          priority: priority == 'high'
            ? Priority.high
            : Priority.defaultPriority,
          fullScreenIntent: priority == 'high', // force popup even on lock screen
          sound: RawResourceAndroidNotificationSound('auction_alert'),
          styleInformation: BigTextStyleInformation(
            '${message.data['auction_title']}\n'
            'Current bid: ${message.data['current_bid']} ${message.data['currency']}\n'
            'Time remaining: ${message.data['time_remaining']}',
          ),
          actions: [
            AndroidNotificationAction('open', 'Open'),
            AndroidNotificationAction('snooze', 'Snooze 5min'),
            AndroidNotificationAction('lost', 'Mark as Lost'),
          ],
        ),
        iOS: DarwinNotificationDetails(
          sound: 'auction_alert.caf',
          interruptionLevel: priority == 'high'
            ? InterruptionLevel.critical
            : InterruptionLevel.active,
          presentAlert: true,
          presentSound: true,
        ),
      ),
      payload: 'auction:${message.data['auction_id']}',
    );
  }
}
```

**Android Notification Channel Setup:**
```dart
const androidChannel = AndroidNotificationChannel(
  'auction_alerts',
  'Auction Alerts',
  description: 'Urgent auction deadline reminders',
  importance: Importance.max,
  playSound: true,
  sound: RawResourceAndroidNotificationSound('auction_alert'),
  enableVibration: true,
  enableLights: true,
  ledColor: Color(0xFFFF0000),
);
```

**FCM Token Management:**
- Flutter app register FCM token saat login/startup
- Token disimpan di Supabase table `user_devices`:
  ```sql
  CREATE TABLE user_devices (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      fcm_token   TEXT NOT NULL,
      platform    TEXT NOT NULL,  -- 'android' | 'ios'
      device_name TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
- Token refresh → update di Supabase
- Logout → delete token record

---

## Key Technical Decisions

### Mengapa Tauri v2 (bukan Electron)?
- Binary size ~5-10MB vs Electron ~150MB+
- Memory usage jauh lebih rendah
- Native Rust untuk background tasks (scheduler, tray)
- Built-in plugin system untuk notifications, file system, dll
- Target: **Windows only** (ASA tersedia di Steam/Epic untuk PC)

### Mengapa Next.js di Tauri?
- Tauri v2 support SSG (Static Site Generation) dari Next.js
- **PENTING:** Harus pakai `output: 'export'` di next.config.js (SSG mode)
- Tidak bisa pakai SSR/API routes Next.js di Tauri (no Node.js server)
- Semua "backend" logic di Rust, bukan Next.js API routes

### Mengapa SQLite?
- Embedded, tidak perlu install database terpisah
- Single file, mudah backup/export
- Cukup performant untuk personal app
- Phase 2: sync via upload/download SQLite file atau CRDT-based sync

### Next.js di Tauri - Constraints
- Tidak bisa pakai `getServerSideProps`, `API Routes`, atau `Server Actions`
- Semua data fetching via Tauri `invoke()` ke Rust backend
- Routing tetap pakai Next.js App Router (client-side navigation)
- Build output: static HTML/JS/CSS di `out/` folder

---

## Multi-Platform Architecture (Phase 3+)

### Overall System Diagram

```
┌──────────────────┐          ┌──────────────────┐
│   DESKTOP APP    │          │   MOBILE APP     │
│   (Tauri + Next) │          │   (Flutter)      │
│                  │          │                  │
│  ┌────────────┐  │          │  ┌────────────┐  │
│  │  Next.js   │  │          │  │  Flutter    │  │
│  │  Frontend  │  │          │  │  UI (Dart)  │  │
│  └─────┬──────┘  │          │  └─────┬──────┘  │
│        │ IPC     │          │        │         │
│  ┌─────▼──────┐  │          │  ┌─────▼──────┐  │
│  │   Rust     │  │          │  │  Supabase  │  │
│  │  Backend   │  │          │  │  Dart SDK  │  │
│  └──┬─────┬───┘  │          │  └──┬─────┬───┘  │
│     │     │      │          │     │     │      │
│  ┌──▼──┐  │      │          │  ┌──▼──┐  │      │
│  │SQLite│  │      │          │  │Hive/│  │      │
│  │local │  │      │          │  │Drift│  │      │
│  └──────┘  │      │          │  └─────┘  │      │
│            │      │          │           │      │
└────────────┼──────┘          └───────────┼──────┘
             │                             │
             │      ┌──────────────┐       │
             │      │   SUPABASE   │       │
             └─────▶│              │◀──────┘
                    │  ┌────────┐  │
                    │  │PostgreSQL│ │
                    │  └────────┘  │
                    │  ┌────────┐  │
                    │  │Realtime│  │
                    │  └────────┘  │
                    │  ┌────────┐  │
                    │  │  Auth  │  │
                    │  └────────┘  │
                    │  ┌────────┐  │
                    │  │  Edge  │  │
                    │  │Functions│ │
                    │  └────────┘  │
                    └──────────────┘
```

### Sync Strategy

**Offline-First Architecture:**
1. Desktop: SQLite sebagai primary → sync ke Supabase saat online
2. Mobile: Local cache (Hive/Drift) → Supabase sebagai primary data source
3. Conflict resolution: **Last-Write-Wins** berdasarkan `updated_at` timestamp

**Sync Flow:**
```
[User creates auction on Desktop]
  → Save ke SQLite local (instant)
  → Sync engine queue → POST ke Supabase
  → Supabase Realtime broadcast → Mobile receives update
  → Mobile save ke local cache

[User updates auction on Mobile]
  → Save ke Supabase (primary)
  → Supabase Realtime broadcast → Desktop receives update
  → Desktop sync engine → Update SQLite local
```

**Offline Handling:**
- Desktop: Tetap fully functional offline (SQLite primary)
- Mobile: Read dari local cache, write ke queue, sync saat online kembali
- Pending sync indicator di UI (icon/badge)

### Push Notifications (Mobile)

Lihat detail lengkap di bagian **Notification Architecture → Mobile — FCM + Custom Notification**.

```
[Supabase Edge Function - Cron setiap 30 detik]
  → Query auction_reminders WHERE remind_at <= now() AND is_sent = false
  → Determine priority (≤5min = HIGH, else = DEFAULT)
  → Send FCM DATA message (bukan notification message) via FCM HTTP v1 API
  → Flutter app receives data message → display custom notification via flutter_local_notifications
  → Mark reminder as sent
```

**Penting:** Menggunakan FCM **data message** agar Flutter bisa custom notification layout, action buttons, sound, dan heads-up behavior. Notification message dari FCM tidak digunakan karena tidak bisa di-customize.

### Flutter Project Structure

```
auction-personal-mobile/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── router.dart              # GoRouter / auto_route
│   │   └── theme.dart               # Material 3 theme
│   ├── features/
│   │   ├── auth/                    # Supabase auth
│   │   ├── auction/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── providers/           # Riverpod providers
│   │   │   └── screens/
│   │   ├── timer/
│   │   ├── inventory/
│   │   └── expenses/
│   ├── core/
│   │   ├── supabase/                # Supabase client setup
│   │   ├── local_storage/           # Hive/Drift setup
│   │   ├── notifications/           # FCM + local notifications
│   │   └── sync/                    # Sync engine
│   └── shared/
│       ├── widgets/                 # Reusable widgets
│       └── utils/
├── android/
├── ios/
├── pubspec.yaml
└── test/
```

### Shared Data Contract

Desktop (Rust) dan Mobile (Dart) harus menggunakan schema yang sama.
Supabase PostgreSQL schema menjadi **single source of truth**:

- Rust models di-generate atau manually match PostgreSQL schema
- Dart models di-generate via `supabase_flutter` atau manual
- Migration dikelola di Supabase Dashboard / CLI (`supabase db push`)
