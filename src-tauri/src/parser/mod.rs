pub mod discord;
pub mod facebook;
pub mod text_parser;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostMetadata {
    pub platform: String,
    pub post_id: Option<String>,
    pub post_timestamp: Option<String>,
    pub author: Option<String>,
    pub text_preview: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedAuctionText {
    pub title: Option<String>,
    pub duration_hours: Option<u32>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub bid_amount: Option<f64>,
    pub bid_currency: Option<String>,
    pub min_increment: Option<f64>,
    pub increment_currency: Option<String>,
    pub pickup_server: Option<String>,
    pub timezone_hint: Option<String>,
    pub raw_text: String,
}

/// Detect platform from URL and dispatch to the appropriate parser.
#[tauri::command]
pub async fn parse_source_link(url: String) -> Result<PostMetadata, String> {
    let url_lower = url.to_lowercase();

    if url_lower.contains("discord.com/channels/") {
        discord::parse(&url)
    } else if url_lower.contains("facebook.com") || url_lower.contains("fb.com") {
        facebook::extract(&url).await
    } else {
        Ok(PostMetadata {
            platform: "other".to_string(),
            post_id: None,
            post_timestamp: None,
            author: None,
            text_preview: None,
            error: Some("Unsupported platform. Only Facebook and Discord links are supported.".to_string()),
        })
    }
}

/// Parse auction post text to extract structured auction data.
#[tauri::command]
pub async fn parse_auction_text(text: String) -> Result<ParsedAuctionText, String> {
    text_parser::parse(&text)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── AU-P08: Unknown / unsupported platform URL → platform="other" ──────────

    #[tokio::test]
    async fn test_parse_source_link_unknown_platform_returns_other() {
        // A URL that is neither discord.com/channels/ nor facebook.com/fb.com
        let result = parse_source_link("https://twitter.com/some/post/123".to_string())
            .await
            .expect("parse_source_link should not return Err");

        assert_eq!(result.platform, "other");
        assert!(result.post_id.is_none());
        assert!(result.post_timestamp.is_none());
        assert!(result.error.is_some(), "unknown platform should set an error message");
    }

    #[tokio::test]
    async fn test_parse_source_link_discord_dispatches_correctly() {
        let url = "https://discord.com/channels/111/222/1234567890123456789".to_string();
        let result = parse_source_link(url).await.expect("should not error");
        assert_eq!(result.platform, "discord");
        assert_eq!(result.post_id, Some("1234567890123456789".to_string()));
    }

    #[tokio::test]
    async fn test_parse_source_link_invalid_discord_url_returns_error() {
        // AU-P07: Invalid URL → error field set, platform still = "discord"
        let url = "https://discord.com/channels/not-valid".to_string();
        let result = parse_source_link(url).await.expect("should not return Err");
        assert_eq!(result.platform, "discord");
        assert!(result.error.is_some());
    }

    // ── parse_auction_text integration with text_parser ───────────────────────

    #[tokio::test]
    async fn test_parse_auction_text_command_returns_structured_data() {
        let text = "24-hour auction\nBidding starts at 500 Tek Ceilings.".to_string();
        let result = parse_auction_text(text)
            .await
            .expect("parse_auction_text should succeed");

        assert_eq!(result.duration_hours, Some(24));
        assert_eq!(result.bid_amount, Some(500.0));
        assert_eq!(result.bid_currency, Some("Tek Ceilings".to_string()));
    }
}
