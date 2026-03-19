pub mod windows_toast;

/// Notification urgency scenario matching Windows Toast XML schema.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NotificationScenario {
    /// Normal toast, auto-dismisses after ~7 seconds. For reminders >= 15 min.
    Default,
    /// Persistent toast, stays on screen. For reminders <= 5 min.
    Urgent,
    /// Looping alarm sound, persistent. For 1 min LAST CALL.
    Alarm,
}

/// Determine the notification scenario from the remind_before_m value.
///
/// This mirrors the logic in the scheduler so it can be tested in isolation.
pub fn scenario_for_remind_before_m(remind_before_m: i32) -> NotificationScenario {
    if remind_before_m <= 1 {
        NotificationScenario::Alarm
    } else if remind_before_m <= 5 {
        NotificationScenario::Urgent
    } else {
        NotificationScenario::Default
    }
}

/// Build the notification heading string for a given scenario.
pub fn heading_for_scenario(scenario: NotificationScenario) -> &'static str {
    match scenario {
        NotificationScenario::Alarm => "LAST CALL - AUCTION ENDING!",
        NotificationScenario::Urgent => "AUCTION ENDING SOON",
        NotificationScenario::Default => "Auction Reminder",
    }
}

/// Send an auction reminder notification via Windows Toast.
pub fn send_auction_notification(
    auction_id: &str,
    title: &str,
    time_remaining: &str,
    current_bid: Option<f64>,
    bid_currency: Option<&str>,
    scenario: NotificationScenario,
) -> Result<(), String> {
    let bid_text = match (current_bid, bid_currency) {
        (Some(bid), Some(currency)) => format!("Current bid: {} {}", bid, currency),
        (Some(bid), None) => format!("Current bid: {}", bid),
        _ => String::new(),
    };

    let heading = heading_for_scenario(scenario);

    windows_toast::show_toast(
        auction_id,
        heading,
        &format!("{} - {} remaining", title, time_remaining),
        &bid_text,
        scenario,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── NotificationScenario determination ────────────────────────────────────

    #[test]
    fn test_scenario_alarm_at_1_min() {
        // remind_before_m = 1 → Alarm (LAST CALL)
        assert_eq!(
            scenario_for_remind_before_m(1),
            NotificationScenario::Alarm
        );
    }

    #[test]
    fn test_scenario_alarm_at_0_min() {
        // remind_before_m = 0 → also Alarm (≤ 1)
        assert_eq!(
            scenario_for_remind_before_m(0),
            NotificationScenario::Alarm
        );
    }

    #[test]
    fn test_scenario_urgent_at_5_min() {
        // remind_before_m = 5 → Urgent
        assert_eq!(
            scenario_for_remind_before_m(5),
            NotificationScenario::Urgent
        );
    }

    #[test]
    fn test_scenario_urgent_at_2_min() {
        // remind_before_m = 2 → Urgent (2 <= 5 but > 1)
        assert_eq!(
            scenario_for_remind_before_m(2),
            NotificationScenario::Urgent
        );
    }

    #[test]
    fn test_scenario_default_at_15_min() {
        // remind_before_m = 15 → Default
        assert_eq!(
            scenario_for_remind_before_m(15),
            NotificationScenario::Default
        );
    }

    #[test]
    fn test_scenario_default_at_6_min() {
        // remind_before_m = 6 → Default (just over the Urgent threshold)
        assert_eq!(
            scenario_for_remind_before_m(6),
            NotificationScenario::Default
        );
    }

    #[test]
    fn test_scenario_default_at_60_min() {
        assert_eq!(
            scenario_for_remind_before_m(60),
            NotificationScenario::Default
        );
    }

    // ── Heading text for each scenario ────────────────────────────────────────

    #[test]
    fn test_heading_alarm() {
        assert_eq!(
            heading_for_scenario(NotificationScenario::Alarm),
            "LAST CALL - AUCTION ENDING!"
        );
    }

    #[test]
    fn test_heading_urgent() {
        assert_eq!(
            heading_for_scenario(NotificationScenario::Urgent),
            "AUCTION ENDING SOON"
        );
    }

    #[test]
    fn test_heading_default() {
        assert_eq!(
            heading_for_scenario(NotificationScenario::Default),
            "Auction Reminder"
        );
    }

    // ── Scheduler boundary: exact threshold values ─────────────────────────────

    #[test]
    fn test_scenario_boundary_1_is_alarm_not_urgent() {
        // 1 min must be Alarm, not Urgent
        let s = scenario_for_remind_before_m(1);
        assert_ne!(s, NotificationScenario::Urgent);
        assert_eq!(s, NotificationScenario::Alarm);
    }

    #[test]
    fn test_scenario_boundary_5_is_urgent_not_default() {
        // 5 min must be Urgent, not Default
        let s = scenario_for_remind_before_m(5);
        assert_ne!(s, NotificationScenario::Default);
        assert_eq!(s, NotificationScenario::Urgent);
    }
}
