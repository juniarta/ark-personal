pub mod commands;
pub mod db;
pub mod notifications;
pub mod scheduler;
pub mod tray;

// TODO: parser-engine teammate will create src/parser/ module.
// This module is expected to export PostMetadata, ParsedAuctionText,
// and the Tauri commands parse_source_link and parse_auction_text.
pub mod parser;
