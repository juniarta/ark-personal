use chrono::DateTime;
use regex::Regex;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, USER_AGENT};
use scraper::{Html, Selector};

use super::PostMetadata;

/// Browser-like User-Agent to reduce chance of being blocked by Facebook.
const BROWSER_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/// Attempt to extract a post ID from various Facebook URL formats.
///
/// Supported patterns:
/// - `facebook.com/photo/?fbid=...&set=gm.<group_post_id>...`
/// - `facebook.com/groups/.../posts/<post_id>/`
/// - `facebook.com/permalink.php?story_fbid=<post_id>&id=...`
fn extract_post_id(url: &str) -> Option<String> {
    // Pattern 1: /groups/.../posts/<post_id>/
    let groups_re = Regex::new(r"facebook\.com/groups/[^/]+/posts/(\d+)").ok()?;
    if let Some(caps) = groups_re.captures(url) {
        return Some(caps.get(1)?.as_str().to_string());
    }

    // Pattern 2: story_fbid=<id> (permalink.php)
    let permalink_re = Regex::new(r"story_fbid=(\d+)").ok()?;
    if let Some(caps) = permalink_re.captures(url) {
        return Some(caps.get(1)?.as_str().to_string());
    }

    // Pattern 3: fbid=<id> (photo URLs) — also try to get gm.<group_post_id>
    // Prefer the gm. group post ID if available, otherwise use fbid
    let gm_re = Regex::new(r"set=gm\.(\d+)").ok()?;
    if let Some(caps) = gm_re.captures(url) {
        return Some(caps.get(1)?.as_str().to_string());
    }

    let fbid_re = Regex::new(r"fbid=(\d+)").ok()?;
    if let Some(caps) = fbid_re.captures(url) {
        return Some(caps.get(1)?.as_str().to_string());
    }

    None
}

/// Build browser-like request headers to mimic a real browser visit.
fn build_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static(BROWSER_USER_AGENT));
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
    );
    headers.insert(
        ACCEPT_LANGUAGE,
        HeaderValue::from_static("en-US,en;q=0.9"),
    );
    headers
}

/// Try to extract a timestamp from Open Graph or article meta tags in HTML.
///
/// Looks for:
/// - `<meta property="og:updated_time" content="...">`
/// - `<meta property="article:published_time" content="...">`
/// - `<meta property="og:published_time" content="...">`
fn extract_timestamp_from_html(html_body: &str) -> Option<String> {
    let document = Html::parse_document(html_body);

    let meta_properties = [
        "og:updated_time",
        "article:published_time",
        "og:published_time",
    ];

    for prop in &meta_properties {
        let selector_str = format!(r#"meta[property="{}"]"#, prop);
        let selector = match Selector::parse(&selector_str) {
            Ok(s) => s,
            Err(_) => continue,
        };
        if let Some(element) = document.select(&selector).next() {
            if let Some(content) = element.value().attr("content") {
                // Validate it looks like an ISO 8601 timestamp
                if DateTime::parse_from_rfc3339(content).is_ok() {
                    return Some(content.to_string());
                }
                // Try other common ISO 8601 variants Facebook may use
                if chrono::NaiveDateTime::parse_from_str(content, "%Y-%m-%dT%H:%M:%S%z")
                    .is_ok()
                {
                    return Some(content.to_string());
                }
                // If it looks like an ISO string at all, return it for best-effort
                if content.len() >= 10 && content.contains('-') {
                    return Some(content.to_string());
                }
            }
        }
    }

    None
}

/// Try to extract author name from Open Graph meta tags.
fn extract_author_from_html(html_body: &str) -> Option<String> {
    let document = Html::parse_document(html_body);

    let meta_properties = ["og:title", "author"];

    for prop in &meta_properties {
        let selector_str = format!(r#"meta[property="{}"]"#, prop);
        let selector = match Selector::parse(&selector_str) {
            Ok(s) => s,
            Err(_) => continue,
        };
        if let Some(element) = document.select(&selector).next() {
            if let Some(content) = element.value().attr("content") {
                let trimmed = content.trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }
        }
    }

    // Also try <meta name="author">
    if let Ok(selector) = Selector::parse(r#"meta[name="author"]"#) {
        let document = Html::parse_document(html_body);
        if let Some(element) = document.select(&selector).next() {
            if let Some(content) = element.value().attr("content") {
                let trimmed = content.trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }
        }
    }

    None
}

/// Try to extract a text preview from og:description.
fn extract_text_preview_from_html(html_body: &str) -> Option<String> {
    let document = Html::parse_document(html_body);

    if let Ok(selector) = Selector::parse(r#"meta[property="og:description"]"#) {
        if let Some(element) = document.select(&selector).next() {
            if let Some(content) = element.value().attr("content") {
                let trimmed = content.trim();
                if !trimmed.is_empty() {
                    // Limit preview length
                    let preview = if trimmed.len() > 300 {
                        format!("{}...", &trimmed[..297])
                    } else {
                        trimmed.to_string()
                    };
                    return Some(preview);
                }
            }
        }
    }

    None
}

/// Fetch a Facebook URL and extract post metadata including timestamp.
///
/// This uses HTTP GET with browser-like headers and parses Open Graph meta tags.
/// If scraping fails, returns PostMetadata with `post_timestamp = None` and an error message.
pub async fn extract(url: &str) -> Result<PostMetadata, String> {
    let post_id = extract_post_id(url);

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(5))
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = match client.get(url).headers(build_headers()).send().await {
        Ok(resp) => resp,
        Err(e) => {
            return Ok(PostMetadata {
                platform: "facebook".to_string(),
                post_id,
                post_timestamp: None,
                author: None,
                text_preview: None,
                error: Some(format!(
                    "Failed to fetch Facebook URL: {}. You can enter the start time manually.",
                    e
                )),
            });
        }
    };

    if !response.status().is_success() {
        return Ok(PostMetadata {
            platform: "facebook".to_string(),
            post_id,
            post_timestamp: None,
            author: None,
            text_preview: None,
            error: Some(format!(
                "Facebook returned HTTP {}. The post may be private or the URL invalid. You can enter the start time manually.",
                response.status()
            )),
        });
    }

    let html_body = match response.text().await {
        Ok(body) => body,
        Err(e) => {
            return Ok(PostMetadata {
                platform: "facebook".to_string(),
                post_id,
                post_timestamp: None,
                author: None,
                text_preview: None,
                error: Some(format!(
                    "Failed to read response body: {}. You can enter the start time manually.",
                    e
                )),
            });
        }
    };

    let post_timestamp = extract_timestamp_from_html(&html_body);
    let author = extract_author_from_html(&html_body);
    let text_preview = extract_text_preview_from_html(&html_body);

    let error = if post_timestamp.is_none() {
        Some(
            "Could not extract timestamp from Facebook page. The post may require login or Facebook blocked the request. You can enter the start time manually."
                .to_string(),
        )
    } else {
        None
    };

    Ok(PostMetadata {
        platform: "facebook".to_string(),
        post_id,
        post_timestamp,
        author,
        text_preview,
        error,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_post_id_groups() {
        let url = "https://www.facebook.com/groups/332105420766044/posts/1954220131887890/";
        assert_eq!(
            extract_post_id(url),
            Some("1954220131887890".to_string())
        );
    }

    #[test]
    fn test_extract_post_id_permalink() {
        let url = "https://www.facebook.com/permalink.php?story_fbid=123456789&id=987654321";
        assert_eq!(extract_post_id(url), Some("123456789".to_string()));
    }

    #[test]
    fn test_extract_post_id_photo_with_gm() {
        let url = "https://www.facebook.com/photo/?fbid=27091470887121330&set=gm.1954220131887890&idorvanity=332105420766044";
        // Should prefer gm. group post ID
        assert_eq!(
            extract_post_id(url),
            Some("1954220131887890".to_string())
        );
    }

    #[test]
    fn test_extract_post_id_photo_fbid_only() {
        let url = "https://www.facebook.com/photo/?fbid=27091470887121330";
        assert_eq!(
            extract_post_id(url),
            Some("27091470887121330".to_string())
        );
    }

    #[test]
    fn test_extract_post_id_no_match() {
        let url = "https://www.facebook.com/somepage";
        assert_eq!(extract_post_id(url), None);
    }

    #[test]
    fn test_extract_timestamp_from_html() {
        let html = r#"
            <html><head>
                <meta property="og:updated_time" content="2026-03-17T20:35:00+01:00">
            </head><body></body></html>
        "#;
        let ts = extract_timestamp_from_html(html);
        assert_eq!(ts, Some("2026-03-17T20:35:00+01:00".to_string()));
    }

    #[test]
    fn test_extract_timestamp_article_published() {
        let html = r#"
            <html><head>
                <meta property="article:published_time" content="2026-03-17T19:35:00+00:00">
            </head><body></body></html>
        "#;
        let ts = extract_timestamp_from_html(html);
        assert_eq!(ts, Some("2026-03-17T19:35:00+00:00".to_string()));
    }

    #[test]
    fn test_extract_timestamp_no_meta() {
        let html = r#"<html><head><title>Test</title></head><body></body></html>"#;
        let ts = extract_timestamp_from_html(html);
        assert!(ts.is_none());
    }

    #[test]
    fn test_extract_author_from_html() {
        let html = r#"
            <html><head>
                <meta property="og:title" content="John Doe">
            </head><body></body></html>
        "#;
        let author = extract_author_from_html(html);
        assert_eq!(author, Some("John Doe".to_string()));
    }

    #[test]
    fn test_extract_text_preview_from_html() {
        let html = r#"
            <html><head>
                <meta property="og:description" content="24-hour auction for rare dino...">
            </head><body></body></html>
        "#;
        let preview = extract_text_preview_from_html(html);
        assert_eq!(
            preview,
            Some("24-hour auction for rare dino...".to_string())
        );
    }
}
