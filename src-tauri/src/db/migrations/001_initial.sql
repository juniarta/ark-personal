-- Phase 1 MVP tables

CREATE TABLE IF NOT EXISTS auctions (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    category        TEXT,
    source_link     TEXT,
    source_type     TEXT,
    source_post_id  TEXT,
    duration_type   TEXT,
    start_time      TEXT NOT NULL,
    end_time        TEXT NOT NULL,
    start_time_source TEXT DEFAULT 'manual',
    current_bid     REAL,
    bid_currency    TEXT,
    min_increment   REAL,
    increment_currency TEXT,
    pickup_server   TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    notes           TEXT,
    raw_post_text   TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);

CREATE TABLE IF NOT EXISTS auction_reminders (
    id              TEXT PRIMARY KEY,
    auction_id      TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    remind_before_m INTEGER NOT NULL,
    remind_at       TEXT NOT NULL,
    is_sent         INTEGER NOT NULL DEFAULT 0,
    sent_at         TEXT,
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_auction ON auction_reminders(auction_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON auction_reminders(is_sent, remind_at);

CREATE TABLE IF NOT EXISTS alarms (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    alarm_type  TEXT NOT NULL,
    trigger_at  TEXT,
    duration_ms INTEGER,
    is_active   INTEGER NOT NULL DEFAULT 1,
    repeat_rule TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('reminder_intervals', '[60, 30, 15, 5, 1]');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notification_mode', 'force_active');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notification_sound', 'default');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notification_escalation_threshold', '5');
