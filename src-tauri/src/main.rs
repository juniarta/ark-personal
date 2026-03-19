// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

use auction_personal_lib::commands;
use auction_personal_lib::commands::transmitter::ServerListCache;
use auction_personal_lib::db;
use auction_personal_lib::scheduler;
use auction_personal_lib::tray;

fn main() {
    env_logger::init();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .setup(|app| {
            // Initialize database
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async {
                let pool = db::init_db(&app_handle)
                    .await
                    .expect("Failed to initialize database");

                app_handle.manage(pool.clone());
                app_handle.manage(std::sync::Mutex::new(ServerListCache::new()));

                // Start background scheduler
                scheduler::start(pool);
            });

            // Setup system tray
            tray::setup_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auction commands
            commands::auction::create_auction,
            commands::auction::get_active_auctions,
            commands::auction::get_auction,
            commands::auction::update_auction,
            commands::auction::delete_auction,
            commands::auction::get_auctions_by_status,
            commands::auction::get_auctions_by_category,
            // Timer/alarm commands
            commands::timer::create_alarm,
            commands::timer::get_alarms,
            commands::timer::update_alarm,
            commands::timer::delete_alarm,
            commands::timer::pause_timer,
            commands::timer::resume_timer,
            // Settings commands
            commands::settings::get_setting,
            commands::settings::set_setting,
            // Transmitter commands
            commands::transmitter::add_transmitter_server,
            commands::transmitter::get_transmitter_servers,
            commands::transmitter::update_transmitter_server,
            commands::transmitter::remove_transmitter_server,
            commands::transmitter::start_timer,
            commands::transmitter::stop_timer,
            commands::transmitter::reset_timer,
            commands::transmitter::fetch_official_servers,
            // Parser commands (implemented by parser-engine teammate)
            auction_personal_lib::parser::parse_source_link,
            auction_personal_lib::parser::parse_auction_text,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        // Keep running in background when window is closed (system tray behavior)
        if let tauri::RunEvent::ExitRequested { api, .. } = event {
            api.prevent_exit();
        }
    });
}
