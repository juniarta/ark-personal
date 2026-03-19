use tauri::State;

use crate::db::repository;
use crate::db::DbPool;

#[tauri::command]
pub async fn get_setting(
    db: State<'_, DbPool>,
    key: String,
) -> Result<Option<String>, String> {
    repository::get_setting(&db, &key)
        .await
        .map_err(|e| format!("Failed to get setting '{}': {}", key, e))
}

#[tauri::command]
pub async fn set_setting(
    db: State<'_, DbPool>,
    key: String,
    value: String,
) -> Result<(), String> {
    repository::set_setting(&db, &key, &value)
        .await
        .map_err(|e| format!("Failed to set setting '{}': {}", key, e))
}
