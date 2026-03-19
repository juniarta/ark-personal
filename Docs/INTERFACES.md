# Shared Interface Contract — Phase 1 MVP

This document defines the agreed-upon interfaces between rust-backend, parser-engine, and frontend.
All agents MUST conform to these types and signatures.

---

## Tauri Command Signatures (IPC)

### Auction Commands
```rust
#[tauri::command]
async fn create_auction(db: State<'_, DbPool>, payload: CreateAuctionPayload) -> Result<Auction, String>;

#[tauri::command]
async fn get_active_auctions(db: State<'_, DbPool>) -> Result<Vec<Auction>, String>;

#[tauri::command]
async fn get_auction(db: State<'_, DbPool>, id: String) -> Result<Auction, String>;

#[tauri::command]
async fn update_auction(db: State<'_, DbPool>, id: String, payload: UpdateAuctionPayload) -> Result<Auction, String>;

#[tauri::command]
async fn delete_auction(db: State<'_, DbPool>, id: String) -> Result<(), String>;

#[tauri::command]
async fn get_auctions_by_status(db: State<'_, DbPool>, status: String) -> Result<Vec<Auction>, String>;

#[tauri::command]
async fn get_auctions_by_category(db: State<'_, DbPool>, category: String) -> Result<Vec<Auction>, String>;
```

### Timer/Alarm Commands
```rust
#[tauri::command]
async fn create_alarm(db: State<'_, DbPool>, payload: CreateAlarmPayload) -> Result<Alarm, String>;

#[tauri::command]
async fn get_alarms(db: State<'_, DbPool>) -> Result<Vec<Alarm>, String>;

#[tauri::command]
async fn update_alarm(db: State<'_, DbPool>, id: String, payload: UpdateAlarmPayload) -> Result<Alarm, String>;

#[tauri::command]
async fn delete_alarm(db: State<'_, DbPool>, id: String) -> Result<(), String>;

#[tauri::command]
async fn pause_timer(db: State<'_, DbPool>, id: String) -> Result<Alarm, String>;

#[tauri::command]
async fn resume_timer(db: State<'_, DbPool>, id: String) -> Result<Alarm, String>;
```

### Parser Commands (owned by parser-engine, registered by rust-backend)
```rust
#[tauri::command]
async fn parse_source_link(url: String) -> Result<PostMetadata, String>;

#[tauri::command]
async fn parse_auction_text(text: String) -> Result<ParsedAuctionText, String>;
```

### Settings Commands
```rust
#[tauri::command]
async fn get_setting(db: State<'_, DbPool>, key: String) -> Result<Option<String>, String>;

#[tauri::command]
async fn set_setting(db: State<'_, DbPool>, key: String, value: String) -> Result<(), String>;
```

---

## Shared Rust Types

### Database Pool Type
```rust
// src-tauri/src/db/mod.rs
pub type DbPool = sqlx::SqlitePool;
```

### Models (src-tauri/src/db/models.rs)
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Auction {
    pub id: String,
    pub title: String,
    pub category: Option<String>,
    pub source_link: Option<String>,
    pub source_type: Option<String>,       // "discord" | "facebook" | "other"
    pub source_post_id: Option<String>,
    pub duration_type: Option<String>,     // "12h" | "24h" | "48h" | "custom"
    pub start_time: String,                // ISO 8601
    pub end_time: String,                  // ISO 8601
    pub start_time_source: Option<String>, // "link_extracted" | "text_parsed" | "manual"
    pub current_bid: Option<f64>,
    pub bid_currency: Option<String>,
    pub min_increment: Option<f64>,
    pub increment_currency: Option<String>,
    pub pickup_server: Option<String>,
    pub status: String,                    // "active" | "won" | "lost" | "expired" | "cancelled"
    pub notes: Option<String>,
    pub raw_post_text: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuctionPayload {
    pub title: String,
    pub category: Option<String>,
    pub source_link: Option<String>,
    pub source_type: Option<String>,
    pub source_post_id: Option<String>,
    pub duration_type: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub start_time_source: Option<String>,
    pub current_bid: Option<f64>,
    pub bid_currency: Option<String>,
    pub min_increment: Option<f64>,
    pub increment_currency: Option<String>,
    pub pickup_server: Option<String>,
    pub notes: Option<String>,
    pub raw_post_text: Option<String>,
    pub reminder_intervals: Option<Vec<i32>>,  // custom intervals in minutes, default [60,30,15,5,1]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAuctionPayload {
    pub title: Option<String>,
    pub category: Option<String>,
    pub current_bid: Option<f64>,
    pub bid_currency: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuctionReminder {
    pub id: String,
    pub auction_id: String,
    pub remind_before_m: i32,
    pub remind_at: String,
    pub is_sent: bool,
    pub sent_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alarm {
    pub id: String,
    pub label: String,
    pub alarm_type: String,   // "alarm" | "timer" | "stopwatch"
    pub trigger_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub is_active: bool,
    pub repeat_rule: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAlarmPayload {
    pub label: String,
    pub alarm_type: String,
    pub trigger_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub repeat_rule: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAlarmPayload {
    pub label: Option<String>,
    pub trigger_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub is_active: Option<bool>,
    pub repeat_rule: Option<String>,
}
```

### Parser Types (src-tauri/src/parser/mod.rs)
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostMetadata {
    pub platform: String,           // "discord" | "facebook" | "other"
    pub post_id: Option<String>,
    pub post_timestamp: Option<String>,  // ISO 8601 UTC
    pub author: Option<String>,
    pub text_preview: Option<String>,
    pub error: Option<String>,      // error message if extraction failed
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedAuctionText {
    pub title: Option<String>,
    pub duration_hours: Option<u32>,
    pub start_time: Option<String>,      // ISO 8601 UTC
    pub end_time: Option<String>,        // ISO 8601 UTC
    pub bid_amount: Option<f64>,
    pub bid_currency: Option<String>,
    pub min_increment: Option<f64>,
    pub increment_currency: Option<String>,
    pub pickup_server: Option<String>,
    pub timezone_hint: Option<String>,
    pub raw_text: String,
}
```

---

## Frontend TypeScript Types (src/lib/types.ts)

```typescript
// These MUST match the Rust Serialize output exactly

export interface Auction {
  id: string;
  title: string;
  category: string | null;
  source_link: string | null;
  source_type: string | null;
  source_post_id: string | null;
  duration_type: string | null;
  start_time: string;
  end_time: string;
  start_time_source: string | null;
  current_bid: number | null;
  bid_currency: string | null;
  min_increment: number | null;
  increment_currency: string | null;
  pickup_server: string | null;
  status: 'active' | 'won' | 'lost' | 'expired' | 'cancelled';
  notes: string | null;
  raw_post_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAuctionPayload {
  title: string;
  category?: string;
  source_link?: string;
  source_type?: string;
  source_post_id?: string;
  duration_type?: string;
  start_time: string;
  end_time: string;
  start_time_source?: string;
  current_bid?: number;
  bid_currency?: string;
  min_increment?: number;
  increment_currency?: string;
  pickup_server?: string;
  notes?: string;
  raw_post_text?: string;
  reminder_intervals?: number[];
}

export interface Alarm {
  id: string;
  label: string;
  alarm_type: 'alarm' | 'timer' | 'stopwatch';
  trigger_at: string | null;
  duration_ms: number | null;
  is_active: boolean;
  repeat_rule: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostMetadata {
  platform: string;
  post_id: string | null;
  post_timestamp: string | null;
  author: string | null;
  text_preview: string | null;
  error: string | null;
}

export interface ParsedAuctionText {
  title: string | null;
  duration_hours: number | null;
  start_time: string | null;
  end_time: string | null;
  bid_amount: number | null;
  bid_currency: string | null;
  min_increment: number | null;
  increment_currency: string | null;
  pickup_server: string | null;
  timezone_hint: string | null;
  raw_text: string;
}
```

---

## Module Boundaries

| Agent | Owns | Can Read |
|-------|------|----------|
| rust-backend | `src-tauri/` (except `src/parser/`) | Docs/, INTERFACES.md |
| parser-engine | `src-tauri/src/parser/` | Docs/, INTERFACES.md |
| frontend | `src/` | Docs/, INTERFACES.md |
| qa-tester | `src-tauri/tests/`, `src/**/__tests__/` | Everything (read-only for source) |

## Integration Points

1. **rust-backend** imports parser types from `crate::parser::{PostMetadata, ParsedAuctionText}`
2. **rust-backend** registers parser commands in `main.rs` / `lib.rs`
3. **parser-engine** exports `pub mod` in `src-tauri/src/parser/mod.rs`
4. **frontend** calls Tauri commands via `invoke()` using the TypeScript types above
