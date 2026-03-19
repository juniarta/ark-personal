use chrono::{Datelike, FixedOffset, NaiveDate, NaiveDateTime, NaiveTime, TimeZone, Utc};
use regex::Regex;

use super::ParsedAuctionText;

/// Map common game-community timezone strings to a UTC offset in seconds.
///
/// For timezones that observe DST (e.g., CET/CEST, GMT/BST), this function uses
/// a naive approach: if the given reference month falls in April..October, assume
/// summer time (DST). This is an approximation suitable for best-effort parsing.
fn timezone_offset_seconds(tz_hint: &str, reference_month: Option<u32>) -> Option<i32> {
    let normalized = tz_hint
        .trim()
        .to_lowercase()
        .replace("time", "")
        .trim()
        .to_string();

    let is_summer = reference_month.is_some_and(|m| (4..=10).contains(&m));

    match normalized.as_str() {
        // European
        "german" | "cet" | "met" => {
            if is_summer {
                Some(2 * 3600) // CEST
            } else {
                Some(3600) // CET
            }
        }
        "cest" => Some(2 * 3600),
        "uk" | "gmt" => {
            if is_summer {
                Some(3600) // BST
            } else {
                Some(0) // GMT
            }
        }
        "bst" => Some(3600),
        "eet" => {
            if is_summer {
                Some(3 * 3600) // EEST
            } else {
                Some(2 * 3600) // EET
            }
        }
        "eest" => Some(3 * 3600),
        "wet" => {
            if is_summer {
                Some(3600) // WEST
            } else {
                Some(0) // WET
            }
        }

        // US timezones
        "est" | "eastern" => Some(-5 * 3600),
        "edt" => Some(-4 * 3600),
        "cst" | "central" => Some(-6 * 3600),
        "cdt" => Some(-5 * 3600),
        "mst" | "mountain" => Some(-7 * 3600),
        "mdt" => Some(-6 * 3600),
        "pst" | "pacific" => Some(-8 * 3600),
        "pdt" => Some(-7 * 3600),

        // Indonesian timezones
        "wib" => Some(7 * 3600),
        "wita" => Some(8 * 3600),
        "wit" => Some(9 * 3600),

        // UTC / GMT
        "utc" | "z" => Some(0),

        // Asia
        "jst" => Some(9 * 3600),  // Japan
        "kst" => Some(9 * 3600),  // Korea
        "ist" => Some(5 * 3600 + 1800), // India (UTC+5:30)
        "sgt" => Some(8 * 3600),  // Singapore
        "hkt" => Some(8 * 3600),  // Hong Kong
        "aest" => Some(10 * 3600), // Australian Eastern
        "aedt" => Some(11 * 3600), // Australian Eastern Daylight
        "nzst" => Some(12 * 3600), // New Zealand
        "nzdt" => Some(13 * 3600), // New Zealand Daylight

        _ => None,
    }
}

/// Parse a time string like "8:35 PM" or "20:35" into (hour, minute).
fn parse_time_str(time_str: &str) -> Option<(u32, u32)> {
    let time_str = time_str.trim();

    // 12-hour format: "8:35 PM", "12:00 AM"
    let re_12h = Regex::new(r"(?i)^(\d{1,2}):(\d{2})\s*(AM|PM)$").ok()?;
    if let Some(caps) = re_12h.captures(time_str) {
        let mut hour: u32 = caps.get(1)?.as_str().parse().ok()?;
        let minute: u32 = caps.get(2)?.as_str().parse().ok()?;
        let ampm = caps.get(3)?.as_str().to_uppercase();

        if ampm == "PM" && hour != 12 {
            hour += 12;
        } else if ampm == "AM" && hour == 12 {
            hour = 0;
        }

        if hour < 24 && minute < 60 {
            return Some((hour, minute));
        }
        return None;
    }

    // 24-hour format: "20:35"
    let re_24h = Regex::new(r"^(\d{1,2}):(\d{2})$").ok()?;
    if let Some(caps) = re_24h.captures(time_str) {
        let hour: u32 = caps.get(1)?.as_str().parse().ok()?;
        let minute: u32 = caps.get(2)?.as_str().parse().ok()?;

        if hour < 24 && minute < 60 {
            return Some((hour, minute));
        }
    }

    None
}

/// Parse a date string like "17/03/2026" or "03/17/2026" into a NaiveDate.
/// Assumes DD/MM/YYYY format first (common in non-US communities), falls back to MM/DD/YYYY.
fn parse_date_str(date_str: &str) -> Option<NaiveDate> {
    let date_str = date_str.trim();

    let re = Regex::new(r"^(\d{1,2})/(\d{1,2})/(\d{4})$").ok()?;
    let caps = re.captures(date_str)?;

    let a: u32 = caps.get(1)?.as_str().parse().ok()?;
    let b: u32 = caps.get(2)?.as_str().parse().ok()?;
    let year: i32 = caps.get(3)?.as_str().parse().ok()?;

    // Try DD/MM/YYYY first
    if let Some(date) = NaiveDate::from_ymd_opt(year, b, a) {
        return Some(date);
    }

    // Fallback: MM/DD/YYYY
    if let Some(date) = NaiveDate::from_ymd_opt(year, a, b) {
        return Some(date);
    }

    None
}

/// Convert a NaiveDateTime + timezone offset to a UTC ISO 8601 string.
fn to_utc_iso8601(naive_dt: NaiveDateTime, offset_seconds: i32) -> Option<String> {
    let offset = FixedOffset::east_opt(offset_seconds)?;
    let local_dt = offset.from_local_datetime(&naive_dt).single()?;
    let utc_dt = local_dt.with_timezone(&Utc);
    Some(utc_dt.to_rfc3339())
}

/// Parse a datetime string like "8:35 PM German time 17/03/2026" into a UTC ISO 8601 string.
/// Returns (iso_string, timezone_hint).
fn parse_datetime_line(text: &str) -> Option<(String, String)> {
    // Pattern: time [AM/PM] [timezone_text] date
    // e.g., "8:35 PM German time 17/03/2026"
    let re = Regex::new(
        r"(?i)(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s+(.+?)\s+(\d{1,2}/\d{1,2}/\d{4})"
    ).ok()?;

    let caps = re.captures(text)?;
    let time_str = caps.get(1)?.as_str();
    let tz_str = caps.get(2)?.as_str().trim();
    let date_str = caps.get(3)?.as_str();

    let (hour, minute) = parse_time_str(time_str)?;
    let date = parse_date_str(date_str)?;
    let naive_dt = NaiveDateTime::new(date, NaiveTime::from_hms_opt(hour, minute, 0)?);

    let offset = timezone_offset_seconds(tz_str, Some(date.month()))?;
    let iso = to_utc_iso8601(naive_dt, offset)?;

    Some((iso, tz_str.to_string()))
}

/// Extract auction duration in hours from text.
fn parse_duration(text: &str) -> Option<u32> {
    // Patterns: "24-hour auction", "48h auction", "12 Jam auction", "24 hour"
    let re = Regex::new(r"(?i)(\d+)\s*[-\s]?\s*(?:hour|h|jam)\b").ok()?;
    let caps = re.captures(text)?;
    let hours: u32 = caps.get(1)?.as_str().parse().ok()?;

    // Sanity check: auction duration is typically 1-168 hours (1 week max)
    if (1..=168).contains(&hours) {
        Some(hours)
    } else {
        None
    }
}

/// Extract starting bid amount and currency.
/// Patterns: "Bidding starts at 500 Tek Ceilings", "Start price: 1,500 Ingots"
fn parse_bid(text: &str) -> Option<(f64, String)> {
    let re = Regex::new(
        r"(?i)(?:bidding\s+starts?\s+at|start(?:ing)?\s*(?:bid|price)\s*[:\s])\s*([\d,._]+)\s+([\w\s]+?)(?:\.|$|\n)"
    ).ok()?;

    let caps = re.captures(text)?;
    let amount_str = caps.get(1)?.as_str().replace([',', '_'], "");
    let amount: f64 = amount_str.parse().ok()?;
    let currency = caps.get(2)?.as_str().trim().to_string();

    if amount > 0.0 && !currency.is_empty() {
        Some((amount, currency))
    } else {
        None
    }
}

/// Extract minimum bid increment and its currency.
/// Patterns: "Minimum increments: 50 Tek Ceilings", "Min increment 100 ingots"
fn parse_min_increment(text: &str) -> Option<(f64, String)> {
    let re = Regex::new(
        r"(?i)min(?:imum)?\s*increment[s]?\s*[:\s]\s*([\d,._]+)\s+([\w\s]+?)(?:\.|$|\n)"
    ).ok()?;

    let caps = re.captures(text)?;
    let amount_str = caps.get(1)?.as_str().replace([',', '_'], "");
    let amount: f64 = amount_str.parse().ok()?;
    let currency = caps.get(2)?.as_str().trim().to_string();

    if amount > 0.0 && !currency.is_empty() {
        Some((amount, currency))
    } else {
        None
    }
}

/// Extract start time from text.
/// Pattern: "Starts 8:35 PM German time 17/03/2026"
fn parse_start_time(text: &str) -> Option<(String, String)> {
    let re = Regex::new(
        r"(?i)(?:starts?)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?\s+.+?\s+\d{1,2}/\d{1,2}/\d{4})"
    ).ok()?;

    let caps = re.captures(text)?;
    let datetime_text = caps.get(1)?.as_str();
    parse_datetime_line(datetime_text)
}

/// Extract end time from text.
/// Pattern: "Ends 8:35 PM German time 18/03/2026"
fn parse_end_time(text: &str) -> Option<(String, String)> {
    let re = Regex::new(
        r"(?i)(?:ends?)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?\s+.+?\s+\d{1,2}/\d{1,2}/\d{4})"
    ).ok()?;

    let caps = re.captures(text)?;
    let datetime_text = caps.get(1)?.as_str();
    parse_datetime_line(datetime_text)
}

/// Extract pickup server location.
/// Patterns: "Winner pick on my Astraeos or Ragnarok server", "Pick up at my Island server"
fn parse_pickup_server(text: &str) -> Option<String> {
    let re = Regex::new(
        r"(?i)(?:winner\s+)?pick\s*(?:up)?\s*(?:on|at)\s*(?:my\s+)?(.+?)(?:\s*server)?(?:\.|$|\n)"
    ).ok()?;

    let caps = re.captures(text)?;
    let server = caps.get(1)?.as_str().trim().to_string();

    if !server.is_empty() {
        Some(server)
    } else {
        None
    }
}

/// Attempt to extract a title from the first meaningful line of text.
/// Heuristic: skip very short lines or lines with only emojis, take the first
/// substantive line as the title.
fn parse_title(text: &str) -> Option<String> {
    for line in text.lines() {
        let cleaned: String = line
            .chars()
            .filter(|c| c.is_ascii() || c.is_alphanumeric())
            .collect::<String>()
            .trim()
            .to_string();

        // Skip empty or very short lines
        if cleaned.len() < 5 {
            continue;
        }

        // Skip lines that are clearly metadata (starts, ends, bidding, minimum, pick)
        let lower = cleaned.to_lowercase();
        if lower.starts_with("start")
            || lower.starts_with("end")
            || lower.starts_with("bid")
            || lower.starts_with("min")
            || lower.starts_with("pick")
            || lower.starts_with("winner")
            || lower.starts_with("good luck")
        {
            continue;
        }

        // Use the original line (preserving unicode), trimmed
        let title = line.trim().to_string();
        if title.len() >= 5 {
            // Limit title length
            return if title.len() > 200 {
                Some(format!("{}...", &title[..197]))
            } else {
                Some(title)
            };
        }
    }

    None
}

/// Compare two UTC ISO 8601 timestamps and determine whether they conflict.
///
/// Returns `true` when the absolute difference exceeds `threshold_secs`.
/// Used for AU-T14/AU-T15: comparing a link-extracted timestamp against a
/// text-parsed timestamp to detect data-entry conflicts.
pub fn timestamps_conflict(iso_a: &str, iso_b: &str, threshold_secs: i64) -> Option<bool> {
    use chrono::DateTime;
    let a = DateTime::parse_from_rfc3339(iso_a).ok()?;
    let b = DateTime::parse_from_rfc3339(iso_b).ok()?;
    let diff = (a - b).num_seconds().abs();
    Some(diff > threshold_secs)
}

/// Parse auction post text and extract all available structured fields.
///
/// All fields are optional (best-effort extraction). The raw text is always preserved.
pub fn parse(text: &str) -> Result<ParsedAuctionText, String> {
    let duration_hours = parse_duration(text);

    let (bid_amount, bid_currency) = parse_bid(text).unzip();

    let (min_increment, increment_currency) = parse_min_increment(text).unzip();

    let (start_time, start_tz) = match parse_start_time(text) {
        Some((time, tz)) => (Some(time), Some(tz)),
        None => (None, None),
    };

    let (end_time, end_tz) = match parse_end_time(text) {
        Some((time, tz)) => (Some(time), Some(tz)),
        None => (None, None),
    };

    let pickup_server = parse_pickup_server(text);

    let title = parse_title(text);

    // Use the first timezone hint we find
    let timezone_hint = start_tz.or(end_tz);

    Ok(ParsedAuctionText {
        title,
        duration_hours,
        start_time,
        end_time,
        bid_amount,
        bid_currency,
        min_increment,
        increment_currency,
        pickup_server,
        timezone_hint,
        raw_text: text.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timezone_offset_cet_winter() {
        let offset = timezone_offset_seconds("German time", Some(1));
        assert_eq!(offset, Some(3600)); // UTC+1 in January
    }

    #[test]
    fn test_timezone_offset_cet_summer() {
        let offset = timezone_offset_seconds("German time", Some(7));
        assert_eq!(offset, Some(7200)); // UTC+2 in July (CEST)
    }

    #[test]
    fn test_timezone_offset_est() {
        let offset = timezone_offset_seconds("EST", None);
        assert_eq!(offset, Some(-18000)); // UTC-5
    }

    #[test]
    fn test_timezone_offset_wib() {
        let offset = timezone_offset_seconds("WIB", None);
        assert_eq!(offset, Some(25200)); // UTC+7
    }

    #[test]
    fn test_timezone_offset_unknown() {
        let offset = timezone_offset_seconds("Narnia time", None);
        assert_eq!(offset, None);
    }

    #[test]
    fn test_parse_time_12h() {
        assert_eq!(parse_time_str("8:35 PM"), Some((20, 35)));
        assert_eq!(parse_time_str("12:00 AM"), Some((0, 0)));
        assert_eq!(parse_time_str("12:00 PM"), Some((12, 0)));
        assert_eq!(parse_time_str("1:05 am"), Some((1, 5)));
    }

    #[test]
    fn test_parse_time_24h() {
        assert_eq!(parse_time_str("20:35"), Some((20, 35)));
        assert_eq!(parse_time_str("0:00"), Some((0, 0)));
        assert_eq!(parse_time_str("23:59"), Some((23, 59)));
    }

    #[test]
    fn test_parse_date_dd_mm_yyyy() {
        let date = parse_date_str("17/03/2026").unwrap();
        assert_eq!(date, NaiveDate::from_ymd_opt(2026, 3, 17).unwrap());
    }

    #[test]
    fn test_parse_duration() {
        assert_eq!(parse_duration("24-hour auction"), Some(24));
        assert_eq!(parse_duration("48h auction"), Some(48));
        assert_eq!(parse_duration("12 Jam auction"), Some(12));
        assert_eq!(parse_duration("24 hour"), Some(24));
        assert_eq!(parse_duration("no duration here"), None);
    }

    #[test]
    fn test_parse_bid() {
        let (amount, currency) =
            parse_bid("Bidding starts at 500 Tek Ceilings.").unwrap();
        assert_eq!(amount, 500.0);
        assert_eq!(currency, "Tek Ceilings");

        let (amount, currency) =
            parse_bid("Start price: 1,500 Ingots.").unwrap();
        assert_eq!(amount, 1500.0);
        assert_eq!(currency, "Ingots");
    }

    #[test]
    fn test_parse_min_increment() {
        let (amount, currency) =
            parse_min_increment("Minimum increments: 50 Tek Ceilings.").unwrap();
        assert_eq!(amount, 50.0);
        assert_eq!(currency, "Tek Ceilings");
    }

    #[test]
    fn test_parse_start_time() {
        // March is not summer, so CET = UTC+1
        let (iso, tz) =
            parse_start_time("Starts 8:35 PM German time 17/03/2026").unwrap();
        assert_eq!(tz, "German time");
        // 8:35 PM CET (UTC+1) = 7:35 PM UTC = 19:35 UTC
        assert!(iso.contains("19:35:00"));
    }

    #[test]
    fn test_parse_end_time() {
        let (iso, tz) =
            parse_end_time("Ends 8:35 PM German time 18/03/2026").unwrap();
        assert_eq!(tz, "German time");
        assert!(iso.contains("19:35:00"));
    }

    #[test]
    fn test_parse_pickup_server() {
        let server =
            parse_pickup_server("Winner pick on my Astraeos or Ragnarok server.")
                .unwrap();
        assert_eq!(server, "Astraeos or Ragnarok");
    }

    #[test]
    fn test_full_parse_example() {
        let text = r#"I starting Trait Mobile Armor auction!
24-hour auction. Pack of 5 Great Mobile traits (60% bonus)
Bidding starts at 500 Tek Ceilings.
Minimum increments: 50 Tek Ceilings.
Starts 8:35 PM German time 17/03/2026
Ends 8:35 PM German time 18/03/2026
Winner pick on my Astraeos or Ragnarok server.
Good luck!"#;

        let result = parse(text).unwrap();
        assert_eq!(result.duration_hours, Some(24));
        assert_eq!(result.bid_amount, Some(500.0));
        assert_eq!(result.bid_currency, Some("Tek Ceilings".to_string()));
        assert_eq!(result.min_increment, Some(50.0));
        assert_eq!(
            result.increment_currency,
            Some("Tek Ceilings".to_string())
        );
        assert!(result.start_time.is_some());
        assert!(result.end_time.is_some());
        assert_eq!(
            result.pickup_server,
            Some("Astraeos or Ragnarok".to_string())
        );
        assert_eq!(
            result.timezone_hint,
            Some("German time".to_string())
        );
        assert_eq!(result.raw_text, text);
    }

    #[test]
    fn test_parse_empty_text() {
        let result = parse("").unwrap();
        assert!(result.title.is_none());
        assert!(result.duration_hours.is_none());
        assert!(result.bid_amount.is_none());
        assert!(result.start_time.is_none());
        assert!(result.end_time.is_none());
        assert_eq!(result.raw_text, "");
    }

    #[test]
    fn test_parse_partial_text() {
        let text = "48h auction for rare dinos";
        let result = parse(text).unwrap();
        assert_eq!(result.duration_hours, Some(48));
        assert!(result.bid_amount.is_none());
    }

    // ── AU-T14: Link time matches text time (diff ≤ threshold) ───────────────

    /// AU-T14: When a Discord/FB link gives 8:30 PM and the text says 8:35 PM
    /// (5-minute difference), the difference is within the 10-minute tolerance,
    /// so timestamps_conflict should return false.
    #[test]
    fn test_au_t14_timestamps_within_tolerance_no_conflict() {
        // link timestamp: 8:30 PM UTC
        let link_ts = "2026-03-20T20:30:00+00:00";
        // text-parsed timestamp: 8:35 PM UTC  (5 min later)
        let text_ts = "2026-03-20T20:35:00+00:00";

        // threshold = 10 minutes = 600 seconds
        let conflict = timestamps_conflict(link_ts, text_ts, 600).unwrap();
        assert!(
            !conflict,
            "5-minute difference should NOT be flagged as a conflict (threshold=10min)"
        );
    }

    // ── AU-T15: Link time conflicts with text time (diff > threshold) ─────────

    /// AU-T15: When the link gives 7:00 PM and the text says 8:35 PM
    /// (95-minute difference), the difference exceeds the 10-minute tolerance,
    /// so timestamps_conflict should return true.
    #[test]
    fn test_au_t15_timestamps_exceed_tolerance_flags_conflict() {
        // link timestamp: 7:00 PM UTC
        let link_ts = "2026-03-20T19:00:00+00:00";
        // text-parsed timestamp: 8:35 PM UTC  (95 min later)
        let text_ts = "2026-03-20T20:35:00+00:00";

        // threshold = 10 minutes = 600 seconds
        let conflict = timestamps_conflict(link_ts, text_ts, 600).unwrap();
        assert!(
            conflict,
            "95-minute difference SHOULD be flagged as a conflict (threshold=10min)"
        );
    }

    /// Boundary check: exactly threshold seconds apart is NOT a conflict
    /// (condition is strictly `>`).
    #[test]
    fn test_au_t14_boundary_exactly_threshold_is_not_conflict() {
        let ts_a = "2026-03-20T20:00:00+00:00";
        let ts_b = "2026-03-20T20:10:00+00:00"; // exactly 600 seconds apart

        let conflict = timestamps_conflict(ts_a, ts_b, 600).unwrap();
        assert!(
            !conflict,
            "Exactly threshold seconds apart should NOT be a conflict"
        );
    }

    /// timestamps_conflict returns None for invalid ISO 8601 input.
    #[test]
    fn test_timestamps_conflict_invalid_input_returns_none() {
        assert!(timestamps_conflict("not-a-date", "2026-03-20T20:00:00+00:00", 600).is_none());
        assert!(timestamps_conflict("2026-03-20T20:00:00+00:00", "bad", 600).is_none());
    }
}
