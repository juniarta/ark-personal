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

            // Hide window on close instead of destroying it
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = w.hide();
                    }
                });
            }

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
            commands::settings::check_for_update,
            // Transmitter commands
            commands::transmitter::add_transmitter_server,
            commands::transmitter::get_transmitter_servers,
            commands::transmitter::update_transmitter_server,
            commands::transmitter::remove_transmitter_server,
            commands::transmitter::start_timer,
            commands::transmitter::stop_timer,
            commands::transmitter::reset_timer,
            commands::transmitter::sync_timer,
            commands::transmitter::fetch_official_servers,
            // Inventory commands
            commands::inventory::create_category,
            commands::inventory::get_categories,
            commands::inventory::update_category,
            commands::inventory::delete_category,
            commands::inventory::add_category_field,
            commands::inventory::get_category_fields,
            commands::inventory::remove_category_field,
            commands::inventory::create_inventory_item,
            commands::inventory::get_inventory_items,
            commands::inventory::get_inventory_by_category,
            commands::inventory::update_inventory_item,
            commands::inventory::delete_inventory_item,
            commands::inventory::search_inventory,
            // Expense commands
            commands::expense::create_transaction,
            commands::expense::get_transactions,
            commands::expense::get_transactions_by_type,
            commands::expense::get_transactions_by_date_range,
            commands::expense::update_transaction,
            commands::expense::delete_transaction,
            commands::expense::get_expense_summary,
            commands::expense::get_income_summary,
            commands::expense::get_profit_loss,
            commands::expense::get_monthly_summary,
            // Parser commands (implemented by parser-engine teammate)
            auction_personal_lib::parser::parse_source_link,
            auction_personal_lib::parser::parse_auction_text,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        // Keep running in background when window is closed (system tray behavior)
        // But allow exit when triggered by app.exit() (e.g., tray Quit)
        if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
            // code is Some when app.exit(code) was called explicitly
            if code.is_none() {
                api.prevent_exit();
            }
        }
    });
}
