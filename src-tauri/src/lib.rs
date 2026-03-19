pub mod commands;
pub mod db;
pub mod notifications;
pub mod scheduler;
pub mod tray;
pub mod parser;

use std::sync::atomic::AtomicBool;

/// Global flag to pause/resume alert notifications.
/// Shared between the tray menu and the scheduler.
pub static ALERTS_PAUSED: AtomicBool = AtomicBool::new(false);
