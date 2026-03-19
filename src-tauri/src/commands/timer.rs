use chrono::{DateTime, Utc};
use tauri::State;
use uuid::Uuid;

use crate::db::models::*;
use crate::db::repository;
use crate::db::DbPool;

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

    let alarm = Alarm {
        id,
        label: payload.label,
        alarm_type: payload.alarm_type,
        trigger_at: payload.trigger_at,
        duration_ms: payload.duration_ms,
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
    let now = Utc::now().to_rfc3339();
    repository::set_alarm_active(&db, &id, false, &now)
        .await
        .map_err(|e| format!("Failed to pause timer: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))
}

#[tauri::command]
pub async fn resume_timer(db: State<'_, DbPool>, id: String) -> Result<Alarm, String> {
    let now = Utc::now().to_rfc3339();
    repository::set_alarm_active(&db, &id, true, &now)
        .await
        .map_err(|e| format!("Failed to resume timer: {}", e))?
        .ok_or_else(|| format!("Alarm not found: {}", id))
}
