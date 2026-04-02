use serde::Serialize;
use tauri::State;

use crate::db::repository;
use crate::db::DbPool;

#[derive(Serialize)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub download_url: String,
    pub release_notes: String,
}

const GITHUB_RELEASES_API: &str =
    "https://api.github.com/repos/juniarta/ark-personal/releases/latest";

#[tauri::command]
pub async fn check_for_update() -> Result<UpdateInfo, String> {
    let current = env!("CARGO_PKG_VERSION").to_string();

    let client = reqwest::Client::builder()
        .user_agent("ark-personal-tools")
        .build()
        .map_err(|e| e.to_string())?;

    let resp: serde_json::Value = client
        .get(GITHUB_RELEASES_API)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let latest = resp["tag_name"]
        .as_str()
        .unwrap_or(&current)
        .trim_start_matches('v')
        .to_string();

    let download_url = resp["html_url"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let release_notes = resp["body"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let has_update = latest != current;

    Ok(UpdateInfo {
        current_version: current,
        latest_version: latest,
        has_update,
        download_url,
        release_notes,
    })
}

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
