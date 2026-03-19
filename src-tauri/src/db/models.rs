use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Auction {
    pub id: String,
    pub title: String,
    pub category: Option<String>,
    pub source_link: Option<String>,
    pub source_type: Option<String>,
    pub source_post_id: Option<String>,
    pub duration_type: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub start_time_source: Option<String>,
    pub current_bid: Option<f64>,
    pub bid_currency: Option<String>,
    pub min_increment: Option<f64>,
    pub increment_currency: Option<String>,
    pub pickup_server: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub raw_post_text: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuctionPayload {
    pub title: String,
    pub category: Option<String>,
    pub source_link: Option<String>,
    pub source_type: Option<String>,
    pub source_post_id: Option<String>,
    pub duration_type: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub start_time_source: Option<String>,
    pub current_bid: Option<f64>,
    pub bid_currency: Option<String>,
    pub min_increment: Option<f64>,
    pub increment_currency: Option<String>,
    pub pickup_server: Option<String>,
    pub notes: Option<String>,
    pub raw_post_text: Option<String>,
    pub reminder_intervals: Option<Vec<i32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAuctionPayload {
    pub title: Option<String>,
    pub category: Option<String>,
    pub current_bid: Option<f64>,
    pub bid_currency: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuctionReminder {
    pub id: String,
    pub auction_id: String,
    pub remind_before_m: i32,
    pub remind_at: String,
    pub is_sent: bool,
    pub sent_at: Option<String>,
    pub created_at: String,
}

/// Intermediate row type for reading auction_reminders from SQLite
/// where is_sent is stored as INTEGER (0/1).
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AuctionReminderRow {
    pub id: String,
    pub auction_id: String,
    pub remind_before_m: i32,
    pub remind_at: String,
    pub is_sent: i32,
    pub sent_at: Option<String>,
    pub created_at: String,
}

impl From<AuctionReminderRow> for AuctionReminder {
    fn from(row: AuctionReminderRow) -> Self {
        AuctionReminder {
            id: row.id,
            auction_id: row.auction_id,
            remind_before_m: row.remind_before_m,
            remind_at: row.remind_at,
            is_sent: row.is_sent != 0,
            sent_at: row.sent_at,
            created_at: row.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alarm {
    pub id: String,
    pub label: String,
    pub alarm_type: String,
    pub trigger_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub is_active: bool,
    pub repeat_rule: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AlarmRow {
    pub id: String,
    pub label: String,
    pub alarm_type: String,
    pub trigger_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub is_active: i32,
    pub repeat_rule: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<AlarmRow> for Alarm {
    fn from(row: AlarmRow) -> Self {
        Alarm {
            id: row.id,
            label: row.label,
            alarm_type: row.alarm_type,
            trigger_at: row.trigger_at,
            duration_ms: row.duration_ms,
            is_active: row.is_active != 0,
            repeat_rule: row.repeat_rule,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAlarmPayload {
    pub label: String,
    pub alarm_type: String,
    pub trigger_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub repeat_rule: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAlarmPayload {
    pub label: Option<String>,
    pub trigger_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub is_active: Option<bool>,
    pub repeat_rule: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

// ─── Transmitter Server ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransmitterServer {
    pub id: String,
    pub server_name: String,
    pub server_id: Option<String>,
    pub map_name: Option<String>,
    pub cluster_id: Option<String>,
    pub is_pvp: bool,
    pub timer_duration_s: i32,    // default 900 (15 min)
    pub is_running: bool,
    pub started_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Intermediate row type for reading transmitter_servers from SQLite
/// where is_pvp and is_running are stored as INTEGER (0/1).
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TransmitterServerRow {
    pub id: String,
    pub server_name: String,
    pub server_id: Option<String>,
    pub map_name: Option<String>,
    pub cluster_id: Option<String>,
    pub is_pvp: i32,
    pub timer_duration_s: i32,
    pub is_running: i32,
    pub started_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<TransmitterServerRow> for TransmitterServer {
    fn from(row: TransmitterServerRow) -> Self {
        TransmitterServer {
            id: row.id,
            server_name: row.server_name,
            server_id: row.server_id,
            map_name: row.map_name,
            cluster_id: row.cluster_id,
            is_pvp: row.is_pvp != 0,
            timer_duration_s: row.timer_duration_s,
            is_running: row.is_running != 0,
            started_at: row.started_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTransmitterPayload {
    pub server_name: String,
    pub server_id: Option<String>,
    pub map_name: Option<String>,
    pub cluster_id: Option<String>,
    pub is_pvp: Option<bool>,
    pub timer_duration_s: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTransmitterPayload {
    pub server_name: Option<String>,
    pub server_id: Option<String>,
    pub map_name: Option<String>,
    pub cluster_id: Option<String>,
    pub is_pvp: Option<bool>,
    pub timer_duration_s: Option<i32>,
}
