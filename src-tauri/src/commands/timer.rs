use chrono::{DateTime, Utc};
use tauri::State;
use uuid::Uuid;

use crate::db::models::*;
use crate::db::repository;
use crate::db::DbPool;
use crate::notifications::windows_toast;

#[tauri::command]
pub async fn create_alarm(
    db: State<'_, DbPool>,
    payload: CreateAlarmPayload,
) -> Result<Alarm, String> {
    // Validate alarm_type
    match payload.alarm_type.as_str() {
        "alarm" | "timer" | "stopwatch" => {}
        other => return Err(format!("Invalid alarm_type: '{}'. Must be 'alarm', 'timer', or 'stopwatch'", other)),
    }

    // Validate timer duration > 0
    if payload.alarm_type == "timer" {
        match payload.duration_ms {
            Some(ms) if ms > 0 => {}
            Some(ms) => return Err(format!("Timer duration must be > 0, got: {}", ms)),
            None => return Err("Timer requires duration_ms".to_string()),
        }
    }

    // Validate alarm trigger_at is in the future
    if payload.alarm_type == "alarm" {
        match &payload.trigger_at {
            Some(trigger_str) => {
                let trigger_dt = DateTime::parse_from_rfc3339(trigger_str)
                    .map_err(|e| format!("Invalid trigger_at format: {}", e))?
                    .with_timezone(&Utc);
                if trigger_dt <= Utc::now() {
                    return Err("Alarm trigger_at must be in the future".to_string());
                }
            }
            None => return Err("Alarm requires trigger_at".to_string()),
        }
    }

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    // Timers start running immediately — record when they started
    let started_at = if payload.alarm_type == "timer" {
        Some(now.clone())
    } else {
        None
    };

    let alarm = Alarm {
        id,
        label: payload.label,
        alarm_type: payload.alarm_type,
        trigger_at: payload.trigger_at,
        original_duration_ms: payload.duration_ms,
        duration_ms: payload.duration_ms,
        started_at,
        is_active: true,
        repeat_rule: payload.repeat_rule,
        created_at: now.clone(),
        updated_at: now,
    };

    repository::insert_alarm(&db, &alarm)
        .await
        .map_err(|e| format!("Failed to create alarm: {}", e))?;

    Ok(alarm)
}

#[tauri::command]
pub async fn get_alarms(db: State<'_, DbPool>) -> Result<Vec<Alarm>, String> {
    repository::get_all_alarms(&db)
        .await
        .map_err(|e| format!("Failed to get alarms: {}", e))
}

#[tauri::command]
pub async fn update_alarm(
    db: State<'_, DbPool>,
    id: String,
    payload: UpdateAlarmPayload,
) -> Result<Alarm, String> {
    // Validate trigger_at if provided
    if let Some(ref trigger_str) = payload.trigger_at {
        let trigger_dt = DateTime::parse_from_rfc3339(trigger_str)
            .map_err(|e| format!("Invalid trigger_at format: {}", e))?
            .with_timezone(&Utc);
        if trigger_dt <= Utc::now() {
            return Err("Alarm trigger_at must be in the future".to_string());
        }
    }

    // Validate duration_ms if provided
    if let Some(ms) = payload.duration_ms {
        if ms <= 0 {
            return Err(format!("Timer duration must be > 0, got: {}", ms));
        }
    }

    let now = Utc::now().to_rfc3339();
    repository::update_alarm_record(&db, &id, &payload, &now)
        .await
        .map_err(|e| format!("Failed to update alarm: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))
}

#[tauri::command]
pub async fn delete_alarm(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    let deleted = repository::delete_alarm_record(&db, &id)
        .await
        .map_err(|e| format!("Failed to delete alarm: {}", e))?;

    if deleted {
        Ok(())
    } else {
        Err(format!("Alarm not found: {}", id))
    }
}

#[tauri::command]
pub async fn pause_timer(db: State<'_, DbPool>, id: String) -> Result<Alarm, String> {
    let alarm = repository::get_alarm_by_id(&db, &id)
        .await
        .map_err(|e| format!("Failed to get alarm: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))?;

    let now = Utc::now();
    let now_str = now.to_rfc3339();

    // Compute how much time is left so we can persist it
    let remaining_ms = if let (Some(started_str), Some(duration)) = (&alarm.started_at, alarm.duration_ms) {
        let started = DateTime::parse_from_rfc3339(started_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or(now);
        let elapsed_ms = (now - started).num_milliseconds().max(0);
        (duration - elapsed_ms).max(0)
    } else {
        alarm.duration_ms.unwrap_or(0)
    };

    repository::pause_alarm(&db, &id, remaining_ms, &now_str)
        .await
        .map_err(|e| format!("Failed to pause timer: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))
}

#[tauri::command]
pub async fn resume_timer(db: State<'_, DbPool>, id: String) -> Result<Alarm, String> {
    let now = Utc::now().to_rfc3339();
    repository::resume_alarm(&db, &id, &now, &now)
        .await
        .map_err(|e| format!("Failed to resume timer: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))
}

#[tauri::command]
pub async fn notify_timer_done(label: String) -> Result<(), String> {
    windows_toast::show_timer_toast(&label)
}

#[tauri::command]
pub async fn mark_timer_done(db: State<'_, DbPool>, id: String) -> Result<Alarm, String> {
    let now = Utc::now().to_rfc3339();
    repository::mark_timer_done(&db, &id, &now)
        .await
        .map_err(|e| format!("Failed to mark timer done: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))
}

#[tauri::command]
pub async fn replay_timer(db: State<'_, DbPool>, id: String) -> Result<Alarm, String> {
    let alarm = repository::get_alarm_by_id(&db, &id)
        .await
        .map_err(|e| format!("Failed to get alarm: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))?;

    // original_duration_ms is set for all new timers.
    // For old timers created before this feature, fall back to duration_ms
    // (which may be 0 if already done — in that case we cannot replay).
    let original_ms = alarm.original_duration_ms
        .or(alarm.duration_ms.filter(|&d| d > 0))
        .ok_or_else(|| {
            "Cannot replay: original duration unknown. Delete this timer and create a new one.".to_string()
        })?;

    let now = Utc::now().to_rfc3339();
    repository::replay_timer_with_duration(&db, &id, original_ms, &now, &now)
        .await
        .map_err(|e| format!("Failed to replay timer: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))
}
