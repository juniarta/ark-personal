use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

use crate::db::models::*;
use crate::db::repository;
use crate::db::DbPool;

// ─── ARK Official Server List Types ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArkOfficialServer {
    pub session_name: String,
    pub session_id: String,
    pub map_name: String,
    pub cluster_id: String,
    pub is_pvp: bool,
    pub num_players: i32,
    pub max_players: i32,
}

/// Raw JSON shape from the ARK dedicated server list API.
#[derive(Debug, Deserialize)]
struct ArkServerRaw {
    #[serde(rename = "Name", default)]
    name: String,
    #[serde(rename = "SessionName", default)]
    session_name: String,
    #[serde(rename = "SessionIsPve", default)]
    session_is_pve: i32,
    #[serde(rename = "MapName", default)]
    map_name: String,
    #[serde(rename = "NumPlayers", default)]
    num_players: i32,
    #[serde(rename = "MaxPlayers", default)]
    max_players: i32,
    #[serde(rename = "ClusterId", default)]
    cluster_id: String,
    #[serde(rename = "SessionId", default)]
    session_id: String,
}

/// Cached server list with expiry.
pub struct ServerListCache {
    pub servers: Vec<ArkOfficialServer>,
    pub fetched_at: Option<chrono::DateTime<Utc>>,
}

impl ServerListCache {
    pub fn new() -> Self {
        ServerListCache {
            servers: Vec::new(),
            fetched_at: None,
        }
    }
}

// ─── Tauri Commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn add_transmitter_server(
    db: State<'_, DbPool>,
    payload: CreateTransmitterPayload,
) -> Result<TransmitterServer, String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    let server = TransmitterServer {
        id,
        server_name: payload.server_name,
        server_id: payload.server_id,
        map_name: payload.map_name,
        cluster_id: payload.cluster_id,
        is_pvp: payload.is_pvp.unwrap_or(false),
        timer_duration_s: payload.timer_duration_s.unwrap_or(900),
        is_running: false,
        started_at: None,
        created_at: now.clone(),
        updated_at: now,
    };

    repository::insert_transmitter_server(&db, &server)
        .await
        .map_err(|e| format!("Failed to create transmitter server: {}", e))?;

    Ok(server)
}

#[tauri::command]
pub async fn get_transmitter_servers(
    db: State<'_, DbPool>,
) -> Result<Vec<TransmitterServer>, String> {
    repository::get_all_transmitter_servers(&db)
        .await
        .map_err(|e| format!("Failed to get transmitter servers: {}", e))
}

#[tauri::command]
pub async fn update_transmitter_server(
    db: State<'_, DbPool>,
    id: String,
    payload: UpdateTransmitterPayload,
) -> Result<TransmitterServer, String> {
    let now = Utc::now().to_rfc3339();
    repository::update_transmitter_server(&db, &id, &payload, &now)
        .await
        .map_err(|e| format!("Failed to update transmitter server: {}", e))?
        .ok_or_else(|| format!("Transmitter server not found: {}", id))
}

#[tauri::command]
pub async fn remove_transmitter_server(
    db: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let deleted = repository::delete_transmitter_server(&db, &id)
        .await
        .map_err(|e| format!("Failed to delete transmitter server: {}", e))?;

    if deleted {
        Ok(())
    } else {
        Err(format!("Transmitter server not found: {}", id))
    }
}

#[tauri::command]
pub async fn start_timer(
    db: State<'_, DbPool>,
    id: String,
) -> Result<TransmitterServer, String> {
    let now = Utc::now().to_rfc3339();
    repository::start_transmitter_timer(&db, &id, &now)
        .await
        .map_err(|e| format!("Failed to start timer: {}", e))?
        .ok_or_else(|| format!("Transmitter server not found: {}", id))
}

#[tauri::command]
pub async fn stop_timer(
    db: State<'_, DbPool>,
    id: String,
) -> Result<TransmitterServer, String> {
    let now = Utc::now().to_rfc3339();
    repository::stop_transmitter_timer(&db, &id, &now)
        .await
        .map_err(|e| format!("Failed to stop timer: {}", e))?
        .ok_or_else(|| format!("Transmitter server not found: {}", id))
}

#[tauri::command]
pub async fn reset_timer(
    db: State<'_, DbPool>,
    id: String,
) -> Result<TransmitterServer, String> {
    let now = Utc::now().to_rfc3339();
    repository::reset_transmitter_timer(&db, &id, &now)
        .await
        .map_err(|e| format!("Failed to reset timer: {}", e))?
        .ok_or_else(|| format!("Transmitter server not found: {}", id))
}

#[tauri::command]
pub async fn fetch_official_servers(
    cache: State<'_, Mutex<ServerListCache>>,
) -> Result<Vec<ArkOfficialServer>, String> {
    // Check cache validity (5 minutes)
    {
        let cache_guard = cache.lock().map_err(|e| format!("Cache lock error: {}", e))?;
        if let Some(fetched_at) = cache_guard.fetched_at {
            let elapsed = Utc::now().signed_duration_since(fetched_at);
            if elapsed.num_seconds() < 300 && !cache_guard.servers.is_empty() {
                return Ok(cache_guard.servers.clone());
            }
        }
    }

    // Fetch from API
    let raw_servers: Vec<ArkServerRaw> =
        reqwest::get("https://cdn2.arkdedicated.com/servers/asa/officialserverlist.json")
            .await
            .map_err(|e| format!("Failed to fetch server list: {}", e))?
            .json()
            .await
            .map_err(|e| format!("Failed to parse server list: {}", e))?;

    let servers: Vec<ArkOfficialServer> = raw_servers
        .into_iter()
        .map(|raw| ArkOfficialServer {
            session_name: if raw.session_name.is_empty() {
                raw.name
            } else {
                raw.session_name
            },
            session_id: raw.session_id,
            map_name: raw.map_name,
            cluster_id: raw.cluster_id,
            is_pvp: raw.session_is_pve == 0,
            num_players: raw.num_players,
            max_players: raw.max_players,
        })
        .collect();

    // Update cache
    {
        let mut cache_guard = cache.lock().map_err(|e| format!("Cache lock error: {}", e))?;
        cache_guard.servers = servers.clone();
        cache_guard.fetched_at = Some(Utc::now());
    }

    Ok(servers)
}
