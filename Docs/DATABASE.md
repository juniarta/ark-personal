# Database Schema Design

**Phase 1-2 (Local):** SQLite — access via Rust (`rusqlite` / `sqlx`)
**Phase 3+ (Cloud):** Supabase PostgreSQL — access via Supabase SDK (Rust + Dart)

---

## Entity Relationship

```
┌──────────┐     ┌──────────────┐     ┌────────────────┐
│  alarms  │     │   auctions   │────▶│ auction_remind  │
└──────────┘     └──────┬───────┘     └────────────────┘
                        │
                        │ (optional link)
                        ▼
              ┌─────────────────┐
              │  transactions   │
              └────────┬────────┘
                       │
                       │ (optional link)
                       ▼
              ┌─────────────────┐     ┌──────────────────┐
              │ inventory_items │────▶│ category_fields  │
              └────────┬────────┘     └──────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   categories    │
              └─────────────────┘
```

---

## Tables

### `alarms`

Timer & alarm records.

```sql
CREATE TABLE alarms (
    id          TEXT PRIMARY KEY,  -- UUID
    label       TEXT NOT NULL,
    alarm_type  TEXT NOT NULL,     -- 'alarm' | 'timer' | 'stopwatch'
    trigger_at  TEXT,              -- ISO 8601 datetime (for alarm)
    duration_ms INTEGER,           -- duration in ms (for timer)
    is_active   INTEGER NOT NULL DEFAULT 1,
    repeat_rule TEXT,              -- NULL | 'daily' | 'weekly' | custom cron
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
```

### `auctions`

Auction tracking records.

```sql
CREATE TABLE auctions (
    id              TEXT PRIMARY KEY,  -- UUID
    title           TEXT NOT NULL,
    category        TEXT,              -- user-defined: 'Dino', 'Item', 'Service', etc.
    source_link     TEXT,              -- Discord message URL / Facebook post URL
    source_type     TEXT,              -- 'discord' | 'facebook' | 'other'
    source_post_id  TEXT,              -- extracted post/message ID from link
    duration_type   TEXT,              -- '12h' | '24h' | '48h' | 'custom'
    start_time      TEXT NOT NULL,     -- ISO 8601 (from link timestamp or manual)
    end_time        TEXT NOT NULL,     -- ISO 8601
    start_time_source TEXT DEFAULT 'manual', -- 'link_extracted' | 'text_parsed' | 'manual'
    current_bid     REAL,             -- latest known bid amount
    bid_currency    TEXT,              -- 'Tek Ceilings', 'ingots', 'usd', etc.
    min_increment   REAL,             -- minimum bid increment (parsed from text)
    increment_currency TEXT,           -- currency for increment (usually same as bid_currency)
    pickup_server   TEXT,              -- server for winner pickup (parsed from text)
    status          TEXT NOT NULL DEFAULT 'active',  -- active|won|lost|expired|cancelled
    notes           TEXT,
    raw_post_text   TEXT,              -- original post text (for reference & re-parsing)
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_end_time ON auctions(end_time);
```

### `auction_reminders`

Reminder schedule per auction.

```sql
CREATE TABLE auction_reminders (
    id              TEXT PRIMARY KEY,
    auction_id      TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    remind_before_m INTEGER NOT NULL,  -- minutes before end (60, 30, 15, 5, 1)
    remind_at       TEXT NOT NULL,     -- pre-calculated ISO 8601 datetime
    is_sent         INTEGER NOT NULL DEFAULT 0,
    sent_at         TEXT,
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_reminders_auction ON auction_reminders(auction_id);
CREATE INDEX idx_reminders_pending ON auction_reminders(is_sent, remind_at);
```

### `categories`

User-defined inventory categories.

```sql
CREATE TABLE categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,  -- 'Dino', 'Items', 'Services', etc.
    icon        TEXT,                   -- emoji or icon name
    color       TEXT,                   -- hex color for UI
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
```

### `category_fields`

Custom fields per category (user-defined schema).

```sql
CREATE TABLE category_fields (
    id          TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    field_name  TEXT NOT NULL,          -- 'species', 'level', 'quality', etc.
    field_type  TEXT NOT NULL,          -- 'text' | 'number' | 'dropdown' | 'date' | 'boolean'
    options     TEXT,                   -- JSON array for dropdown options: ["Rex","Giga","Theri"]
    is_required INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

CREATE INDEX idx_category_fields ON category_fields(category_id);
```

### `inventory_items`

Inventory records.

```sql
CREATE TABLE inventory_items (
    id          TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    auction_id  TEXT REFERENCES auctions(id),  -- NULL if not from auction
    name        TEXT NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    field_data  TEXT,              -- JSON object: {"species":"Rex","level":225,"mutations":3}
    status      TEXT NOT NULL DEFAULT 'owned',  -- owned | sold | traded | lost
    acquired_at TEXT,
    notes       TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE INDEX idx_inventory_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_auction ON inventory_items(auction_id);
```

### `transactions`

Expense & income tracking.

```sql
CREATE TABLE transactions (
    id                TEXT PRIMARY KEY,
    transaction_type  TEXT NOT NULL,     -- 'buy' | 'sell' | 'bid' | 'trade'
    auction_id        TEXT REFERENCES auctions(id),
    inventory_item_id TEXT REFERENCES inventory_items(id),
    description       TEXT NOT NULL,

    -- In-game currency
    ig_amount         REAL,             -- in-game currency amount
    ig_currency       TEXT,             -- 'ingots', 'element', 'poly', etc.

    -- Real money
    real_amount       REAL,             -- real money amount
    real_currency     TEXT,             -- 'IDR', 'USD', etc.

    counterparty      TEXT,             -- siapa pihak lawan transaksi
    transaction_date  TEXT NOT NULL,    -- ISO 8601
    notes             TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);

CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_auction ON transactions(auction_id);
```

### `settings`

App settings / preferences (key-value store).

```sql
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default settings:
-- 'reminder_intervals' → '[60, 30, 15, 5, 1]' (minutes)
-- 'default_currency_ig' → 'ingots'
-- 'default_currency_real' → 'IDR'
-- 'theme' → 'dark'
-- 'conversion_rates' → '{"ingots_to_idr": 1000}' (optional)
-- 'notification_mode' → 'force_active' | 'normal' (desktop: Windows Toast scenario)
-- 'notification_sound' → 'default' | 'alarm' | 'mute'
-- 'notification_escalation_threshold' → '5' (minutes — reminders ≤ this use force-active)
```

---

## Notes

- Semua `id` pakai UUID v4 (generated di Rust via `uuid` crate, Dart via `uuid` package)
- Semua timestamp pakai ISO 8601 UTC format
- `field_data` di inventory_items pakai JSON — flexible schema per category
- `options` di category_fields pakai JSON array untuk dropdown choices
- SQLite: Foreign key constraints di-enforce via `PRAGMA foreign_keys = ON`
- PostgreSQL (Supabase): Foreign keys enforced natively

---

## Supabase Migration Notes (Phase 3)

Saat migrasi ke Supabase PostgreSQL, perubahan dari SQLite schema:

| SQLite | PostgreSQL (Supabase) |
|--------|----------------------|
| `TEXT` untuk UUID | `UUID` native type dengan `gen_random_uuid()` |
| `TEXT` untuk timestamp | `TIMESTAMPTZ` |
| `INTEGER` untuk boolean | `BOOLEAN` |
| `TEXT` untuk JSON | `JSONB` |
| `REAL` | `NUMERIC` atau `DOUBLE PRECISION` |

### Tambahan table untuk Supabase

```sql
-- User profiles (Supabase Auth user metadata)
CREATE TABLE profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username   TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) pada semua tables
-- Setiap table perlu ditambahkan kolom `user_id UUID REFERENCES auth.users(id)`
-- RLS Policy: user hanya bisa akses data miliknya sendiri
ALTER TABLE auctions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE alarms ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE inventory_items ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE settings ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Example RLS policy
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own auctions"
    ON auctions FOR ALL
    USING (auth.uid() = user_id);
```

### User Devices Table (FCM Token Management)

```sql
CREATE TABLE user_devices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token   TEXT NOT NULL,
    platform    TEXT NOT NULL,      -- 'android' | 'ios'
    device_name TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_devices_token ON user_devices(fcm_token);
CREATE INDEX idx_user_devices_user ON user_devices(user_id);

-- RLS: user hanya bisa manage devices sendiri
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only manage own devices"
    ON user_devices FOR ALL
    USING (auth.uid() = user_id);
```

### Sync Metadata Table

```sql
-- Track sync state per device
CREATE TABLE sync_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    device_id   TEXT NOT NULL,         -- unique device identifier
    table_name  TEXT NOT NULL,         -- which table was synced
    last_synced TIMESTAMPTZ NOT NULL,  -- last successful sync timestamp
    record_count INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_log_user_device ON sync_log(user_id, device_id);
```
