use std::sync::atomic::Ordering;

use chrono::Utc;
use tokio::time::{interval, Duration};

use crate::db::repository;
use crate::db::DbPool;
use crate::notifications;
use crate::ALERTS_PAUSED;

const CHECK_INTERVAL_SECS: u64 = 30;

/// Main scheduler loop. Runs every 30 seconds to:
/// 1. Send due auction reminders
/// 2. Expire past auctions
pub async fn run_loop(pool: DbPool) {
    let mut ticker = interval(Duration::from_secs(CHECK_INTERVAL_SECS));

    loop {
        ticker.tick().await;

        if let Err(e) = process_tick(&pool).await {
            log::error!("Scheduler tick error: {}", e);
        }
    }
}

pub async fn process_tick(pool: &DbPool) -> Result<(), String> {
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    // 1. Process pending reminders
    let pending = repository::get_pending_reminders(pool, &now_str)
        .await
        .map_err(|e| format!("Failed to query pending reminders: {}", e))?;

    let alerts_paused = ALERTS_PAUSED.load(Ordering::Relaxed);

    for reminder in &pending {
        // Send notification only if alerts are not paused
        if !alerts_paused {
            let auction = repository::get_auction_by_id(pool, &reminder.auction_id)
                .await
                .map_err(|e| format!("Failed to get auction for reminder: {}", e))?;

            if let Some(auction) = auction {
                let scenario = if reminder.remind_before_m <= 1 {
                    notifications::NotificationScenario::Alarm
                } else if reminder.remind_before_m <= 5 {
                    notifications::NotificationScenario::Urgent
                } else {
                    notifications::NotificationScenario::Default
                };

                let time_remaining = format!("{} min", reminder.remind_before_m);

                if let Err(e) = notifications::send_auction_notification(
                    &auction.id,
                    &auction.title,
                    &time_remaining,
                    auction.current_bid,
                    auction.bid_currency.as_deref(),
                    scenario,
                ) {
                    log::error!(
                        "Failed to send notification for reminder {}: {}",
                        reminder.id,
                        e
                    );
                    continue;
                }
            }
        }

        // Always mark reminder as sent (even when paused, to avoid spamming when unpaused)
        let sent_at = Utc::now().to_rfc3339();
        repository::mark_reminder_sent(pool, &reminder.id, &sent_at)
            .await
            .map_err(|e| format!("Failed to mark reminder as sent: {}", e))?;
    }

    // 2. Expire past auctions
    let expired_count = repository::expire_past_auctions(pool, &now_str, &now_str)
        .await
        .map_err(|e| format!("Failed to expire auctions: {}", e))?;

    if expired_count > 0 {
        log::info!("Expired {} auction(s)", expired_count);
    }

    Ok(())
}
