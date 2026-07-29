// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
#[cfg(target_os = "macos")]
mod mac;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            mac::window::setup_mac_window(_app);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::folder::show_in_folder,
            commands::search::search_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
