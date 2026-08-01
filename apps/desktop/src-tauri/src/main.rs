// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
#[cfg(target_os = "macos")]
mod mac;
mod open_files;

fn main() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    // Windows and Linux deliver "open with" as command-line arguments, so a
    // second launch must hand its argv to the running instance instead of
    // starting a second copy of the app. macOS sends an Apple Event to the
    // existing process already (see RunEvent::Opened below) and has no such
    // plugin.
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            open_files::open_paths(app, open_files::paths_from_args(argv));
        }));
    }

    let app = builder
        .manage(open_files::PendingFiles::default())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            mac::window::setup_mac_window(_app);

            // Files passed on the command line at first launch.
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                // No need to defer: the paths are queued, and the frontend
                // pulls them once it mounts.
                open_files::open_paths(_app.handle(), open_files::paths_from_args(std::env::args()));
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::folder::show_in_folder,
            commands::search::search_files,
            commands::trash::move_to_trash,
            commands::scope::allow_file,
            open_files::take_pending_files
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, _event| {
        // macOS (and iOS) deliver "open with" as an Apple Event, which Tauri
        // surfaces here rather than as argv.
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let tauri::RunEvent::Opened { urls } = _event {
            let paths: Vec<String> = urls
                .iter()
                .filter_map(|url| url.to_file_path().ok())
                .map(|path| path.to_string_lossy().into_owned())
                .collect();

            open_files::open_paths(_app_handle, paths);
        }
    });
}
