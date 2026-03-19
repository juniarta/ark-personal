use chrono::{DateTime, Duration, Utc};
use tauri::State;
use uuid::Uuid;

use crate::db::models::*;
use crate::db::repository;
use crate::db::DbPool;

const DEFAULT_REMINDER_INTERVALS: &[i32] = &[60, 30, 15, 5, 1];

/// Return only the reminder intervals (in minutes) that are still in the future
/// relative to `now_dt`, given that the auction ends at `end_time`.
///
/// This is extracted for unit-testability (AU-U06).
#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn filter_future_intervals(
    intervals: &[i32],
    end_time: DateTime<Utc>,
    now_dt: DateTime<Utc>,
) -> Vec<i32> {
    intervals
        .iter()
        .filter(|&&minutes| {
            let remind_at = end_time - Duration::minutes(minutes as i64);
            remind_at > now_dt
        })
        .copied()
        .collect()
}

#[tauri::command]
pub async fn create_auction(
    db: State<'_, DbPool>,
    payload: CreateAuctionPayload,
) -> Result<Auction, String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    let auction = Auction {
        id: id.clone(),
        title: payload.title,
        category: payload.category,
        source_link: payload.source_link,
        source_type: payload.source_type,
        source_post_id: payload.source_post_id,
        duration_type: payload.duration_type,
        start_time: payload.start_time,
        end_time: payload.end_time.clone(),
        start_time_source: payload.start_time_source,
        current_bid: payload.current_bid,
        bid_currency: payload.bid_currency,
        min_increment: payload.min_increment,
        increment_currency: payload.increment_currency,
        pickup_server: payload.pickup_server,
        status: "active".to_string(),
        notes: payload.notes,
        raw_post_text: payload.raw_post_text,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    repository::insert_auction(&db, &auction)
        .await
        .map_err(|e| format!("Failed to create auction: {}", e))?;

    // Generate reminders
    let intervals = payload
        .reminder_intervals
        .as_deref()
        .unwrap_or(DEFAULT_REMINDER_INTERVALS);

    let end_time = DateTime::parse_from_rfc3339(&payload.end_time)
        .map_err(|e| format!("Invalid end_time format: {}", e))?
        .with_timezone(&Utc);

    let now_dt = Utc::now();

    for &minutes in intervals {
        let remind_at = end_time - Duration::minutes(minutes as i64);

        // Skip reminders that would be in the past
        if remind_at <= now_dt {
            continue;
        }

        let reminder = AuctionReminder {
            id: Uuid::new_v4().to_string(),
            auction_id: id.clone(),
            remind_before_m: minutes,
            remind_at: remind_at.to_rfc3339(),
            is_sent: false,
            sent_at: None,
            created_at: now.clone(),
        };

        repository::insert_reminder(&db, &reminder)
            .await
            .map_err(|e| format!("Failed to create reminder: {}", e))?;
    }

    Ok(auction)
}

#[tauri::command]
pub async fn get_active_auctions(db: State<'_, DbPool>) -> Result<Vec<Auction>, String> {
    repository::get_active_auctions(&db)
        .await
        .map_err(|e| format!("Failed to get active auctions: {}", e))
}

#[tauri::command]
pub async fn get_auction(db: State<'_, DbPool>, id: String) -> Result<Auction, String> {
    repository::get_auction_by_id(&db, &id)
        .await
        .map_err(|e| format!("Failed to get auction: {}", e))?
        .ok_or_else(|| format!("Auction not found: {}", id))
}

#[tauri::command]
pub async fn update_auction(
    db: State<'_, DbPool>,
    id: String,
    payload: UpdateAuctionPayload,
) -> Result<Auction, String> {
    let now = Utc::now().to_rfc3339();
    repository::update_auction(&db, &id, &payload, &now)
        .await
        .map_err(|e| format!("Failed to update auction: {}", e))?
        .ok_or_else(|| format!("Auction not found: {}", id))
}

#[tauri::command]
pub async fn delete_auction(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    let deleted = repository::delete_auction(&db, &id)
        .await
        .map_err(|e| format!("Failed to delete auction: {}", e))?;

    if deleted {
        Ok(())
    } else {
        Err(format!("Auction not found: {}", id))
    }
}

#[tauri::command]
pub async fn get_auctions_by_status(
    db: State<'_, DbPool>,
    status: String,
) -> Result<Vec<Auction>, String> {
    repository::get_auctions_by_status(&db, &status)
        .await
        .map_err(|e| format!("Failed to get auctions by status: {}", e))
}

#[tauri::command]
pub async fn get_auctions_by_category(
    db: State<'_, DbPool>,
    category: String,
) -> Result<Vec<Auction>, String> {
    repository::get_auctions_by_category(&db, &category)
        .await
        .map_err(|e| format!("Failed to get auctions by category: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

    // ── AU-U06: Skip reminder if less than interval remaining ─────────────────

    /// When an auction ends in 10 minutes, only the 5min and 1min reminders
    /// should be created; the 60min, 30min, and 15min intervals are already
    /// in the past and must be skipped.
    #[test]
    fn test_au_u06_skip_reminder_if_less_than_interval_remaining() {
        let now = Utc::now();
        // Auction ends in exactly 10 minutes from now
        let end_time = now + Duration::minutes(10);

        let filtered = filter_future_intervals(DEFAULT_REMINDER_INTERVALS, end_time, now);

        // 60m remind_at = end - 60m → 50 min in the past → skipped
        // 30m remind_at = end - 30m → 20 min in the past → skipped
        // 15m remind_at = end - 15m → 5 min in the past  → skipped
        // 5m  remind_at = end - 5m  → 5 min in the future → kept
        // 1m  remind_at = end - 1m  → 9 min in the future → kept
        assert_eq!(filtered, vec![5, 1]);
    }

    /// When an auction ends in 60 minutes exactly, the 60-minute reminder
    /// is right at the boundary (remind_at == now) and must be skipped
    /// (condition is strictly `>`).
    #[test]
    fn test_au_u06_boundary_exact_60min_skipped() {
        let now = Utc::now();
        let end_time = now + Duration::minutes(60);

        let filtered = filter_future_intervals(DEFAULT_REMINDER_INTERVALS, end_time, now);

        // remind_at for 60m = end - 60m = now → NOT strictly greater → skipped
        // All shorter intervals (30, 15, 5, 1) are in the future
        assert!(!filtered.contains(&60));
        assert!(filtered.contains(&30));
        assert!(filtered.contains(&15));
        assert!(filtered.contains(&5));
        assert!(filtered.contains(&1));
    }

    /// When the auction ends more than 60 minutes away, all default intervals
    /// survive the filter.
    #[test]
    fn test_au_u06_all_intervals_kept_when_plenty_of_time() {
        let now = Utc::now();
        // 2 hours away → all 5 default intervals should be in the future
        let end_time = now + Duration::hours(2);

        let filtered = filter_future_intervals(DEFAULT_REMINDER_INTERVALS, end_time, now);

        assert_eq!(filtered, vec![60, 30, 15, 5, 1]);
    }

    /// Custom intervals respect the same skip logic.
    #[test]
    fn test_au_u06_custom_intervals_filtered() {
        let now = Utc::now();
        // Auction ends in 90 minutes
        let end_time = now + Duration::minutes(90);
        let custom = vec![120, 60, 10];

        let filtered = filter_future_intervals(&custom, end_time, now);

        // 120m remind_at = end - 120m → 30 min in the past → skipped
        // 60m  remind_at = end - 60m  → 30 min in the future → kept
        // 10m  remind_at = end - 10m  → 80 min in the future → kept
        assert_eq!(filtered, vec![60, 10]);
    }
}
