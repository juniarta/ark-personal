CREATE TABLE IF NOT EXISTS transmitter_servers (
    id              TEXT PRIMARY KEY,
    server_name     TEXT NOT NULL,
    server_id       TEXT,          -- ARK official server SessionID (nullable for custom servers)
    map_name        TEXT,
    cluster_id      TEXT,
    is_pvp          INTEGER NOT NULL DEFAULT 0,
    timer_duration_s INTEGER NOT NULL DEFAULT 900,  -- default 15 minutes
    is_running      INTEGER NOT NULL DEFAULT 0,
    started_at      TEXT,          -- ISO8601 when timer was last started/reset
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
