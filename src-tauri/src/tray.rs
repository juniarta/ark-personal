use std::sync::atomic::Ordering;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    App, Manager,
};

use crate::ALERTS_PAUSED;

/// Set up the system tray icon with context menu.
pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let open = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let pause_alerts = MenuItem::with_id(app, "pause_alerts", "Pause Alerts", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open, &pause_alerts, &quit])?;

    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
        .expect("Failed to load tray icon");

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("Ark Personal Tools")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "pause_alerts" => {
                let was_paused = ALERTS_PAUSED.load(Ordering::Relaxed);
                let now_paused = !was_paused;
                ALERTS_PAUSED.store(now_paused, Ordering::Relaxed);

                // Update menu item text to reflect current state
                if let Some(item) = app.menu().and_then(|m| m.get("pause_alerts")) {
                    if let Some(menu_item) = item.as_menuitem() {
                        let _ = menu_item.set_text(if now_paused {
                            "Resume Alerts"
                        } else {
                            "Pause Alerts"
                        });
                    }
                }

                log::info!(
                    "Alerts {}",
                    if now_paused { "paused" } else { "resumed" }
                );
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
