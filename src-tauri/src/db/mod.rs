pub mod models;
pub mod repository;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;
use tauri::AppHandle;

pub type DbPool = SqlitePool;

/// Initialize the SQLite database, run migrations, and return the pool.
pub async fn init_db(_app: &AppHandle) -> Result<DbPool, Box<dyn std::error::Error>> {
    let app_dir = std::env::current_exe()
        .expect("Failed to get current exe path")
        .parent()
        .expect("Failed to get exe directory")
        .to_path_buf();

    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("auction_personal.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.to_string_lossy());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .pragma("foreign_keys", "ON");

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    run_migrations(&pool).await?;

    log::info!("Database initialized at {:?}", db_path);

    Ok(pool)
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::raw_sql(include_str!("migrations/001_initial.sql"))
        .execute(pool)
        .await?;

    sqlx::raw_sql(include_str!("migrations/002_transmitter.sql"))
        .execute(pool)
        .await?;

    sqlx::raw_sql(include_str!("migrations/003_inventory_expense.sql"))
        .execute(pool)
        .await?;

    Ok(())
}
