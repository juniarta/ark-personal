pub mod auction_monitor;

use crate::db::DbPool;

/// Spawn the background scheduler on a tokio task.
/// Runs the auction monitor loop every 30 seconds.
pub fn start(pool: DbPool) {
    tokio::spawn(async move {
        auction_monitor::run_loop(pool).await;
    });
    log::info!("Background scheduler started");
}
