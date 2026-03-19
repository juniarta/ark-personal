use chrono::{DateTime, TimeZone, Utc};
use regex::Regex;

use super::PostMetadata;

/// Discord epoch: 2015-01-01T00:00:00Z in milliseconds.
const DISCORD_EPOCH_MS: u64 = 1_420_070_400_000;

/// Convert a Discord Snowflake ID to a UTC timestamp.
///
/// Discord Snowflake layout (64 bits):
///   bits 63..22 = milliseconds since Discord epoch
///   bits 21..17 = internal worker ID
///   bits 16..12 = internal process ID
///   bits 11..0  = per-process increment
fn snowflake_to_timestamp(snowflake: u64) -> Option<DateTime<Utc>> {
    let timestamp_ms = (snowflake >> 22) + DISCORD_EPOCH_MS;
    Utc.timestamp_millis_opt(timestamp_ms as i64).single()
}

/// Extract guild_id, channel_id, and message_id from a Discord message URL.
///
/// Expected format: `https://discord.com/channels/{guild_id}/{channel_id}/{message_id}`
fn extract_message_id(url: &str) -> Result<(String, String, String), String> {
    let re = Regex::new(r"discord\.com/channels/(\d+)/(\d+)/(\d+)")
        .map_err(|e| format!("Regex compilation error: {}", e))?;

    let caps = re
        .captures(url)
        .ok_or_else(|| "URL does not match Discord message link pattern (discord.com/channels/{guild}/{channel}/{message})".to_string())?;

    let guild_id = caps.get(1).unwrap().as_str().to_string();
    let channel_id = caps.get(2).unwrap().as_str().to_string();
    let message_id = caps.get(3).unwrap().as_str().to_string();

    Ok((guild_id, channel_id, message_id))
}

/// Parse a Discord message link and return PostMetadata with the timestamp
/// derived from the Snowflake message ID. No API call is needed.
pub fn parse(url: &str) -> Result<PostMetadata, String> {
    let (_guild_id, _channel_id, message_id_str) = match extract_message_id(url) {
        Ok(ids) => ids,
        Err(err) => {
            return Ok(PostMetadata {
                platform: "discord".to_string(),
                post_id: None,
                post_timestamp: None,
                author: None,
                text_preview: None,
                error: Some(err),
            });
        }
    };

    let message_id: u64 = message_id_str.parse().map_err(|_| {
        format!(
            "Failed to parse message ID '{}' as a number",
            message_id_str
        )
    })?;

    let timestamp = snowflake_to_timestamp(message_id);

    Ok(PostMetadata {
        platform: "discord".to_string(),
        post_id: Some(message_id_str),
        post_timestamp: timestamp.map(|ts| ts.to_rfc3339()),
        author: None,
        text_preview: None,
        error: if timestamp.is_none() {
            Some("Failed to convert Snowflake ID to timestamp".to_string())
        } else {
            None
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_snowflake_to_timestamp() {
        // Known Discord Snowflake: 175928847299117063 -> 2016-04-30 11:18:25.796 UTC
        let ts = snowflake_to_timestamp(175928847299117063).unwrap();
        // Verify it produces a reasonable date (after Discord epoch, before ~2033)
        assert!(ts.timestamp() > 1420070400);
        assert!(ts.timestamp() < 2000000000);
        // The expected ms timestamp for this snowflake:
        // (175928847299117063 >> 22) + 1420070400000 = 1461999505796 + ...
        // Just verify year 2016
        assert_eq!(ts.format("%Y").to_string(), "2016");
    }

    #[test]
    fn test_snowflake_known_value() {
        // Snowflake 0 should equal Discord epoch exactly
        let ts = snowflake_to_timestamp(0).unwrap();
        assert_eq!(ts.timestamp_millis(), DISCORD_EPOCH_MS as i64);
    }

    #[test]
    fn test_extract_message_id() {
        let url = "https://discord.com/channels/123456789/987654321/111222333444555666";
        let (guild, channel, message) = extract_message_id(url).unwrap();
        assert_eq!(guild, "123456789");
        assert_eq!(channel, "987654321");
        assert_eq!(message, "111222333444555666");
    }

    #[test]
    fn test_parse_valid_url() {
        let url = "https://discord.com/channels/332105420766044/987654321/1234567890123456789";
        let result = parse(url).unwrap();
        assert_eq!(result.platform, "discord");
        assert_eq!(result.post_id, Some("1234567890123456789".to_string()));
        assert!(result.post_timestamp.is_some());
        assert!(result.error.is_none());
    }

    #[test]
    fn test_parse_invalid_url() {
        let url = "https://discord.com/channels/not-valid";
        let result = parse(url).unwrap();
        assert_eq!(result.platform, "discord");
        assert!(result.error.is_some());
    }
}
