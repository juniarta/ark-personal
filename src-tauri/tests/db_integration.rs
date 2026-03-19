/// DB integration tests using an in-memory SQLite database.
///
/// These tests cover:
/// - DB-I01: Database init creates all required tables
/// - DB-I02: Migrations run without error
/// - DB-I10: Settings CRUD (insert, read, update, delete-via-overwrite)
/// - AU-S05: Scheduler handles empty auction list gracefully
/// - Bonus: Auction and reminder round-trips
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;

/// Bring repository and model types into scope from the library crate.
use auction_personal_lib::db::models::{Auction, AuctionReminder, UpdateAuctionPayload};
use auction_personal_lib::db::repository;
use auction_personal_lib::scheduler::auction_monitor;

/// The migration SQL shared with the production code path.
const MIGRATION_SQL: &str = include_str!("../src/db/migrations/001_initial.sql");

/// Create an in-memory SQLite pool and run the schema migration.
async fn setup_db() -> SqlitePool {
    let options = SqliteConnectOptions::new()
        .filename(":memory:")
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .expect("Failed to create in-memory SQLite pool");

    sqlx::raw_sql(MIGRATION_SQL)
        .execute(&pool)
        .await
        .expect("Migration failed");

    pool
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-I01 / DB-I02  –  Schema / Migration
// ─────────────────────────────────────────────────────────────────────────────

/// DB-I01: All required tables exist after migration.
#[tokio::test]
async fn test_db_tables_exist_after_migration() {
    let pool = setup_db().await;

    for table in &["auctions", "auction_reminders", "alarms", "settings"] {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
        )
        .bind(table)
        .fetch_one(&pool)
        .await
        .unwrap_or_else(|_| panic!("Query failed for table check: {}", table));

        assert_eq!(
            row.0, 1,
            "Expected table '{}' to exist after migration",
            table
        );
    }
}

/// DB-I02: Migrations are idempotent — running twice does not error.
#[tokio::test]
async fn test_db_migration_idempotent() {
    let pool = setup_db().await;

    // Run migration a second time — all CREATE TABLE uses IF NOT EXISTS,
    // INSERT OR IGNORE for default settings, so this must not error.
    sqlx::raw_sql(MIGRATION_SQL)
        .execute(&pool)
        .await
        .expect("Second migration run should succeed without error");
}

/// DB-I02b: Default settings are seeded by the migration.
#[tokio::test]
async fn test_db_default_settings_seeded() {
    let pool = setup_db().await;

    let expected_keys = [
        "reminder_intervals",
        "notification_mode",
        "notification_sound",
        "theme",
        "notification_escalation_threshold",
    ];

    for key in &expected_keys {
        let value = repository::get_setting(&pool, key)
            .await
            .unwrap_or_else(|_| panic!("DB error reading setting '{}'", key));

        assert!(
            value.is_some(),
            "Default setting '{}' should be seeded by migration",
            key
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-I10  –  Settings CRUD
// ─────────────────────────────────────────────────────────────────────────────

/// DB-I10a: set_setting inserts a new key and get_setting reads it back.
#[tokio::test]
async fn test_settings_insert_and_read() {
    let pool = setup_db().await;

    repository::set_setting(&pool, "test_key", "hello_world")
        .await
        .expect("set_setting should succeed");

    let value = repository::get_setting(&pool, "test_key")
        .await
        .expect("get_setting should succeed");

    assert_eq!(value, Some("hello_world".to_string()));
}

/// DB-I10b: set_setting on an existing key overwrites the value (upsert).
#[tokio::test]
async fn test_settings_update_existing_key() {
    let pool = setup_db().await;

    repository::set_setting(&pool, "color_theme", "dark")
        .await
        .expect("first set should succeed");

    repository::set_setting(&pool, "color_theme", "light")
        .await
        .expect("second set (update) should succeed");

    let value = repository::get_setting(&pool, "color_theme")
        .await
        .expect("get_setting after update should succeed");

    assert_eq!(value, Some("light".to_string()));
}

/// DB-I10c: get_setting returns None for an unknown key.
#[tokio::test]
async fn test_settings_get_missing_key_returns_none() {
    let pool = setup_db().await;

    let value = repository::get_setting(&pool, "nonexistent_key_xyz")
        .await
        .expect("get_setting should not error on missing key");

    assert_eq!(value, None);
}

/// DB-I10d: Multiple independent settings coexist without collision.
#[tokio::test]
async fn test_settings_multiple_keys() {
    let pool = setup_db().await;

    repository::set_setting(&pool, "alpha", "1")
        .await
        .unwrap();
    repository::set_setting(&pool, "beta", "2")
        .await
        .unwrap();
    repository::set_setting(&pool, "gamma", "3")
        .await
        .unwrap();

    assert_eq!(
        repository::get_setting(&pool, "alpha").await.unwrap(),
        Some("1".to_string())
    );
    assert_eq!(
        repository::get_setting(&pool, "beta").await.unwrap(),
        Some("2".to_string())
    );
    assert_eq!(
        repository::get_setting(&pool, "gamma").await.unwrap(),
        Some("3".to_string())
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bonus  –  Auction round-trip
// ─────────────────────────────────────────────────────────────────────────────

fn sample_auction(id: &str) -> Auction {
    Auction {
        id: id.to_string(),
        title: "Test Auction".to_string(),
        category: Some("dino".to_string()),
        source_link: None,
        source_type: Some("manual".to_string()),
        source_post_id: None,
        duration_type: Some("fixed".to_string()),
        start_time: "2026-03-17T19:35:00+00:00".to_string(),
        end_time: "2026-03-18T19:35:00+00:00".to_string(),
        start_time_source: Some("manual".to_string()),
        current_bid: Some(500.0),
        bid_currency: Some("Tek Ceilings".to_string()),
        min_increment: Some(50.0),
        increment_currency: Some("Tek Ceilings".to_string()),
        pickup_server: Some("Ragnarok".to_string()),
        status: "active".to_string(),
        notes: None,
        raw_post_text: None,
        created_at: "2026-03-17T00:00:00+00:00".to_string(),
        updated_at: "2026-03-17T00:00:00+00:00".to_string(),
    }
}

/// Insert an auction and read it back by ID.
#[tokio::test]
async fn test_auction_insert_and_get_by_id() {
    let pool = setup_db().await;
    let auction = sample_auction("auction-001");

    repository::insert_auction(&pool, &auction)
        .await
        .expect("insert_auction should succeed");

    let fetched = repository::get_auction_by_id(&pool, "auction-001")
        .await
        .expect("get_auction_by_id should succeed");

    let fetched = fetched.expect("auction should be found");
    assert_eq!(fetched.id, "auction-001");
    assert_eq!(fetched.title, "Test Auction");
    assert_eq!(fetched.current_bid, Some(500.0));
    assert_eq!(
        fetched.bid_currency,
        Some("Tek Ceilings".to_string())
    );
    assert_eq!(fetched.status, "active");
}

/// get_auction_by_id returns None for an unknown ID.
#[tokio::test]
async fn test_auction_get_missing_returns_none() {
    let pool = setup_db().await;

    let result = repository::get_auction_by_id(&pool, "does-not-exist")
        .await
        .expect("should not DB-error on missing ID");

    assert!(result.is_none());
}

/// get_active_auctions returns only active-status auctions.
#[tokio::test]
async fn test_get_active_auctions_filters_by_status() {
    let pool = setup_db().await;

    let mut active = sample_auction("active-001");
    active.status = "active".to_string();
    repository::insert_auction(&pool, &active).await.unwrap();

    let mut expired = sample_auction("expired-001");
    expired.status = "expired".to_string();
    repository::insert_auction(&pool, &expired).await.unwrap();

    let actives = repository::get_active_auctions(&pool)
        .await
        .expect("get_active_auctions should succeed");

    assert_eq!(actives.len(), 1);
    assert_eq!(actives[0].id, "active-001");
}

/// update_auction patches only the supplied fields.
#[tokio::test]
async fn test_auction_update_partial_fields() {
    let pool = setup_db().await;
    let auction = sample_auction("auction-upd");
    repository::insert_auction(&pool, &auction).await.unwrap();

    let payload = UpdateAuctionPayload {
        title: None,
        category: None,
        current_bid: Some(750.0),
        bid_currency: None,
        status: Some("expired".to_string()),
        notes: Some("Winner: PlayerX".to_string()),
        end_time: None,
    };

    let updated = repository::update_auction(
        &pool,
        "auction-upd",
        &payload,
        "2026-03-18T20:00:00+00:00",
    )
    .await
    .expect("update_auction should succeed");

    let updated = updated.expect("updated auction should be returned");
    assert_eq!(updated.current_bid, Some(750.0));
    assert_eq!(updated.status, "expired");
    assert_eq!(updated.notes, Some("Winner: PlayerX".to_string()));
    // Unmodified fields should be preserved
    assert_eq!(updated.title, "Test Auction");
    assert_eq!(
        updated.bid_currency,
        Some("Tek Ceilings".to_string())
    );
}

/// update_auction returns None for a non-existent ID.
#[tokio::test]
async fn test_auction_update_missing_returns_none() {
    let pool = setup_db().await;

    let payload = UpdateAuctionPayload {
        title: Some("New Title".to_string()),
        category: None,
        current_bid: None,
        bid_currency: None,
        status: None,
        notes: None,
        end_time: None,
    };

    let result = repository::update_auction(&pool, "ghost-id", &payload, "2026-03-18T20:00:00+00:00")
        .await
        .expect("should not DB-error");

    assert!(result.is_none());
}

/// delete_auction removes the row and returns true.
#[tokio::test]
async fn test_auction_delete() {
    let pool = setup_db().await;
    let auction = sample_auction("auction-del");
    repository::insert_auction(&pool, &auction).await.unwrap();

    let deleted = repository::delete_auction(&pool, "auction-del")
        .await
        .expect("delete_auction should succeed");

    assert!(deleted, "delete should return true when row was found");

    let after = repository::get_auction_by_id(&pool, "auction-del")
        .await
        .unwrap();
    assert!(after.is_none(), "auction should be gone after delete");
}

/// delete_auction returns false when no row matched.
#[tokio::test]
async fn test_auction_delete_nonexistent_returns_false() {
    let pool = setup_db().await;

    let deleted = repository::delete_auction(&pool, "never-existed")
        .await
        .expect("should not DB-error");

    assert!(!deleted);
}

/// expire_past_auctions transitions active auctions with past end_time to 'expired'.
#[tokio::test]
async fn test_expire_past_auctions() {
    let pool = setup_db().await;

    let mut past = sample_auction("past-001");
    past.end_time = "2020-01-01T00:00:00+00:00".to_string(); // clearly in the past
    repository::insert_auction(&pool, &past).await.unwrap();

    let mut future = sample_auction("future-001");
    future.end_time = "2099-01-01T00:00:00+00:00".to_string();
    repository::insert_auction(&pool, &future).await.unwrap();

    let now = "2026-03-19T00:00:00+00:00";
    let count = repository::expire_past_auctions(&pool, now, now)
        .await
        .expect("expire_past_auctions should succeed");

    assert_eq!(count, 1, "exactly one auction should be expired");

    let past_fetched = repository::get_auction_by_id(&pool, "past-001")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(past_fetched.status, "expired");

    let future_fetched = repository::get_auction_by_id(&pool, "future-001")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(future_fetched.status, "active");
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminder round-trip
// ─────────────────────────────────────────────────────────────────────────────

fn sample_reminder(id: &str, auction_id: &str, remind_before_m: i32, remind_at: &str) -> AuctionReminder {
    AuctionReminder {
        id: id.to_string(),
        auction_id: auction_id.to_string(),
        remind_before_m,
        remind_at: remind_at.to_string(),
        is_sent: false,
        sent_at: None,
        created_at: "2026-03-17T00:00:00+00:00".to_string(),
    }
}

/// Insert a reminder and fetch it back via get_reminders_for_auction.
#[tokio::test]
async fn test_reminder_insert_and_get() {
    let pool = setup_db().await;

    // Reminder requires a parent auction (FK constraint)
    let auction = sample_auction("auction-r01");
    repository::insert_auction(&pool, &auction).await.unwrap();

    let reminder = sample_reminder(
        "reminder-001",
        "auction-r01",
        15,
        "2026-03-18T19:20:00+00:00",
    );
    repository::insert_reminder(&pool, &reminder)
        .await
        .expect("insert_reminder should succeed");

    let reminders = repository::get_reminders_for_auction(&pool, "auction-r01")
        .await
        .expect("get_reminders_for_auction should succeed");

    assert_eq!(reminders.len(), 1);
    assert_eq!(reminders[0].id, "reminder-001");
    assert_eq!(reminders[0].remind_before_m, 15);
    assert!(!reminders[0].is_sent);
}

/// get_pending_reminders returns only unsent reminders whose remind_at <= now.
#[tokio::test]
async fn test_get_pending_reminders_filters_correctly() {
    let pool = setup_db().await;

    let auction = sample_auction("auction-r02");
    repository::insert_auction(&pool, &auction).await.unwrap();

    // Due reminder (remind_at in the past)
    let due = sample_reminder(
        "reminder-due",
        "auction-r02",
        5,
        "2026-03-18T18:00:00+00:00",
    );
    repository::insert_reminder(&pool, &due).await.unwrap();

    // Future reminder (remind_at in the future)
    let future = sample_reminder(
        "reminder-future",
        "auction-r02",
        60,
        "2099-01-01T00:00:00+00:00",
    );
    repository::insert_reminder(&pool, &future).await.unwrap();

    let now = "2026-03-19T00:00:00+00:00";
    let pending = repository::get_pending_reminders(&pool, now)
        .await
        .expect("get_pending_reminders should succeed");

    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].id, "reminder-due");
}

/// mark_reminder_sent sets is_sent=true; subsequent get_pending_reminders excludes it.
#[tokio::test]
async fn test_mark_reminder_sent() {
    let pool = setup_db().await;

    let auction = sample_auction("auction-r03");
    repository::insert_auction(&pool, &auction).await.unwrap();

    let reminder = sample_reminder(
        "reminder-mark",
        "auction-r03",
        1,
        "2026-03-18T19:34:00+00:00",
    );
    repository::insert_reminder(&pool, &reminder).await.unwrap();

    let sent_at = "2026-03-18T19:34:05+00:00";
    repository::mark_reminder_sent(&pool, "reminder-mark", sent_at)
        .await
        .expect("mark_reminder_sent should succeed");

    // Should no longer appear in pending
    let now = "2026-03-19T00:00:00+00:00";
    let pending = repository::get_pending_reminders(&pool, now)
        .await
        .unwrap();

    assert!(
        pending.iter().all(|r| r.id != "reminder-mark"),
        "marked reminder should not appear in pending list"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AU-S05  –  Scheduler handles empty auction list gracefully
// ─────────────────────────────────────────────────────────────────────────────

/// AU-S05: When there are no auctions and no reminders in the DB,
/// process_tick must complete without error, send no notifications,
/// and return Ok(()).
#[tokio::test]
async fn test_au_s05_scheduler_empty_auction_list_no_crash() {
    let pool = setup_db().await;

    // Verify precondition: DB is empty
    let actives = repository::get_active_auctions(&pool)
        .await
        .expect("get_active_auctions should succeed");
    assert!(actives.is_empty(), "DB should have no auctions at this point");

    // Run the scheduler tick against an empty database — must not panic or error
    let result = auction_monitor::process_tick(&pool).await;
    assert!(
        result.is_ok(),
        "process_tick on empty DB should return Ok, got: {:?}",
        result
    );
}

/// AU-S05b: When all auctions are already expired and all reminders are sent,
/// process_tick has no work to do and returns Ok(()) gracefully.
#[tokio::test]
async fn test_au_s05_scheduler_all_sent_reminders_no_crash() {
    let pool = setup_db().await;

    // Insert an already-expired auction
    let mut auction = sample_auction("au-s05-expired");
    auction.status = "expired".to_string();
    auction.end_time = "2020-01-01T00:00:00+00:00".to_string();
    repository::insert_auction(&pool, &auction).await.unwrap();

    // Insert a reminder that is already sent
    let mut reminder = sample_reminder("rem-s05", "au-s05-expired", 5, "2020-01-01T00:00:00+00:00");
    reminder.is_sent = true;
    repository::insert_reminder(&pool, &reminder).await.unwrap();
    repository::mark_reminder_sent(&pool, "rem-s05", "2020-01-01T00:01:00+00:00")
        .await
        .unwrap();

    let result = auction_monitor::process_tick(&pool).await;
    assert!(
        result.is_ok(),
        "process_tick with all-sent reminders should return Ok, got: {:?}",
        result
    );
}
