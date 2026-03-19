use super::NotificationScenario;

use windows::core::HSTRING;
use windows::Data::Xml::Dom::XmlDocument;
use windows::UI::Notifications::{ToastNotification, ToastNotificationManager};

const APP_ID: &str = "com.arkauction.personal";

/// Build Toast XML and show the notification via Windows APIs.
pub fn show_toast(
    auction_id: &str,
    heading: &str,
    body: &str,
    bid_info: &str,
    scenario: NotificationScenario,
) -> Result<(), String> {
    let xml = build_toast_xml(auction_id, heading, body, bid_info, scenario);

    let doc = XmlDocument::new().map_err(|e| format!("XmlDocument::new failed: {}", e))?;
    doc.LoadXml(&HSTRING::from(&xml))
        .map_err(|e| format!("LoadXml failed: {}", e))?;

    let toast = ToastNotification::CreateToastNotification(&doc)
        .map_err(|e| format!("CreateToastNotification failed: {}", e))?;

    let notifier = ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(APP_ID))
        .map_err(|e| format!("CreateToastNotifier failed: {}", e))?;

    notifier
        .Show(&toast)
        .map_err(|e| format!("Show toast failed: {}", e))?;

    log::info!(
        "Toast notification sent for auction {} (scenario: {:?})",
        auction_id,
        scenario
    );

    Ok(())
}

fn build_toast_xml(
    auction_id: &str,
    heading: &str,
    body: &str,
    bid_info: &str,
    scenario: NotificationScenario,
) -> String {
    let scenario_attr = match scenario {
        NotificationScenario::Default => r#"scenario="default""#,
        NotificationScenario::Urgent => r#"scenario="urgent""#,
        NotificationScenario::Alarm => r#"scenario="alarm""#,
    };

    let audio_xml = match scenario {
        NotificationScenario::Alarm => {
            r#"<audio src="ms-winsoundevent:Notification.Looping.Alarm" loop="true" />"#
        }
        NotificationScenario::Urgent => {
            r#"<audio src="ms-winsoundevent:Notification.Default" />"#
        }
        NotificationScenario::Default => {
            r#"<audio src="ms-winsoundevent:Notification.Default" />"#
        }
    };

    // Escape XML special characters in user content
    let heading = xml_escape(heading);
    let body = xml_escape(body);
    let bid_info = xml_escape(bid_info);

    format!(
        r#"<toast {scenario_attr} activationType="protocol" launch="auction://detail/{auction_id}">
  <visual>
    <binding template="ToastGeneric">
      <text>{heading}</text>
      <text>{body}</text>
      <text>{bid_info}</text>
    </binding>
  </visual>
  <actions>
    <action content="Open Auction" activationType="foreground" arguments="open:{auction_id}" />
    <action content="Snooze 5min" activationType="background" arguments="snooze:{auction_id}" />
    <action content="Dismiss" activationType="system" arguments="dismiss" />
  </actions>
  {audio_xml}
</toast>"#
    )
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── xml_escape ────────────────────────────────────────────────────────────

    #[test]
    fn test_xml_escape_ampersand() {
        assert_eq!(xml_escape("A & B"), "A &amp; B");
    }

    #[test]
    fn test_xml_escape_less_than() {
        assert_eq!(xml_escape("1 < 2"), "1 &lt; 2");
    }

    #[test]
    fn test_xml_escape_greater_than() {
        assert_eq!(xml_escape("2 > 1"), "2 &gt; 1");
    }

    #[test]
    fn test_xml_escape_double_quote() {
        assert_eq!(xml_escape(r#"say "hello""#), "say &quot;hello&quot;");
    }

    #[test]
    fn test_xml_escape_single_quote() {
        assert_eq!(xml_escape("it's"), "it&apos;s");
    }

    #[test]
    fn test_xml_escape_combined() {
        let input = r#"<tag attr="val" /> & 'more'"#;
        let expected = "&lt;tag attr=&quot;val&quot; /&gt; &amp; &apos;more&apos;";
        assert_eq!(xml_escape(input), expected);
    }

    #[test]
    fn test_xml_escape_clean_string() {
        // String with no special chars should pass through unchanged
        let input = "Auction ends in 5 min";
        assert_eq!(xml_escape(input), input);
    }

    // ── build_toast_xml ───────────────────────────────────────────────────────

    #[test]
    fn test_build_toast_xml_default_scenario() {
        let xml = build_toast_xml(
            "auction-001",
            "Auction Reminder",
            "My Dino - 15 min remaining",
            "Current bid: 500 Tek Ceilings",
            NotificationScenario::Default,
        );
        assert!(xml.contains(r#"scenario="default""#));
        assert!(xml.contains("Auction Reminder"));
        assert!(xml.contains("My Dino - 15 min remaining"));
        assert!(xml.contains("Current bid: 500 Tek Ceilings"));
        assert!(xml.contains("auction-001"));
        assert!(xml.contains(r#"ms-winsoundevent:Notification.Default"#));
    }

    #[test]
    fn test_build_toast_xml_urgent_scenario() {
        let xml = build_toast_xml(
            "auction-002",
            "AUCTION ENDING SOON",
            "My Dino - 5 min remaining",
            "",
            NotificationScenario::Urgent,
        );
        assert!(xml.contains(r#"scenario="urgent""#));
        assert!(xml.contains("AUCTION ENDING SOON"));
        assert!(xml.contains("auction-002"));
    }

    #[test]
    fn test_build_toast_xml_alarm_scenario() {
        let xml = build_toast_xml(
            "auction-003",
            "LAST CALL - AUCTION ENDING!",
            "My Dino - 1 min remaining",
            "",
            NotificationScenario::Alarm,
        );
        assert!(xml.contains(r#"scenario="alarm""#));
        assert!(xml.contains("LAST CALL - AUCTION ENDING!"));
        // Alarm uses looping alarm sound
        assert!(xml.contains("Notification.Looping.Alarm"));
        assert!(xml.contains(r#"loop="true""#));
    }

    #[test]
    fn test_build_toast_xml_contains_actions() {
        let xml = build_toast_xml(
            "auction-004",
            "Reminder",
            "body",
            "",
            NotificationScenario::Default,
        );
        assert!(xml.contains("Open Auction"));
        assert!(xml.contains("Snooze 5min"));
        assert!(xml.contains("Dismiss"));
    }

    #[test]
    fn test_build_toast_xml_launch_protocol() {
        let xml = build_toast_xml(
            "auction-xyz",
            "Reminder",
            "body",
            "",
            NotificationScenario::Default,
        );
        // Launch attribute should contain the auction ID in the deep link
        assert!(xml.contains("auction://detail/auction-xyz"));
    }

    #[test]
    fn test_build_toast_xml_escapes_special_chars() {
        let xml = build_toast_xml(
            "auction-005",
            "Reminder & Alert",
            "Dino <rare> trait - 5 min",
            "Bid: 500 \"Tek\" Ceilings",
            NotificationScenario::Default,
        );
        // Heading special chars should be escaped
        assert!(xml.contains("Reminder &amp; Alert"));
        assert!(xml.contains("Dino &lt;rare&gt; trait"));
        assert!(xml.contains("&quot;Tek&quot;"));
        // Raw special chars must NOT appear in the content nodes
        assert!(!xml.contains("Reminder & Alert"));
        assert!(!xml.contains("<rare>"));
    }
}
