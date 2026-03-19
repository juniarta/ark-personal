CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    icon        TEXT,
    color       TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category_fields (
    id          TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    field_name  TEXT NOT NULL,
    field_type  TEXT NOT NULL,
    options     TEXT,
    is_required INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_category_fields ON category_fields(category_id);

CREATE TABLE IF NOT EXISTS inventory_items (
    id          TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    auction_id  TEXT REFERENCES auctions(id),
    name        TEXT NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    field_data  TEXT,
    status      TEXT NOT NULL DEFAULT 'owned',
    acquired_at TEXT,
    notes       TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_auction ON inventory_items(auction_id);

CREATE TABLE IF NOT EXISTS transactions (
    id                TEXT PRIMARY KEY,
    transaction_type  TEXT NOT NULL,
    auction_id        TEXT REFERENCES auctions(id),
    inventory_item_id TEXT REFERENCES inventory_items(id),
    description       TEXT NOT NULL,
    ig_amount         REAL,
    ig_currency       TEXT,
    real_amount       REAL,
    real_currency     TEXT,
    counterparty      TEXT,
    transaction_date  TEXT NOT NULL,
    notes             TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_auction ON transactions(auction_id);
