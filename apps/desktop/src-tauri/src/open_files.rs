use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_fs::FsExt;

/// Signal telling the frontend to drain [`take_pending_files`].
///
/// The paths are deliberately NOT the payload. Opening a file from the Finder
/// launches the app and delivers the Apple Event immediately, long before the
/// webview has mounted its listener — an emit at that moment goes nowhere,
/// because Tauri events are not buffered. So the paths are queued here and the
/// frontend pulls them: once when it mounts (covering cold start) and again
/// whenever this fires (covering an already-running app).
pub const OPEN_FILES_EVENT: &str = "haptic-open-files";

/// Extensions accepted from "open with", drag-and-drop and CLI args. Anything
/// else the OS hands us is ignored rather than opened as text.
const ACCEPTED: [&str; 4] = ["md", "markdown", "mdx", "txt"];

/// Paths waiting for the frontend to collect.
#[derive(Default)]
pub struct PendingFiles(Mutex<Vec<String>>);

fn is_note(path: &str) -> bool {
    std::path::Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ACCEPTED.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

/// Queues notes for the frontend, granting each one filesystem access first.
///
/// The static fs scope is `$HOME/**`, but a file opened from the Finder can
/// live anywhere, so each is allowed individually — see
/// `commands::scope::allow_file` for why this is per-path rather than a wider
/// static scope. (The dialog plugin does this itself; nothing hands us a dialog
/// here.)
pub fn open_paths(app: &AppHandle, paths: Vec<String>) {
    let notes: Vec<String> = paths.into_iter().filter(|path| is_note(path)).collect();

    if notes.is_empty() {
        return;
    }

    for path in &notes {
        if let Err(error) = app.fs_scope().allow_file(path) {
            eprintln!("failed to allow {path}: {error}");
        }
    }

    if let Some(pending) = app.try_state::<PendingFiles>() {
        if let Ok(mut queue) = pending.0.lock() {
            queue.extend(notes);
        }
    }

    // Bring the window forward — the user just asked for this file.
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }

    if let Err(error) = app.emit(OPEN_FILES_EVENT, ()) {
        eprintln!("failed to emit {OPEN_FILES_EVENT}: {error}");
    }
}

/// Hands over every queued path and clears the queue.
#[tauri::command]
pub fn take_pending_files(pending: State<PendingFiles>) -> Vec<String> {
    pending
        .0
        .lock()
        .map(|mut queue| std::mem::take(&mut *queue))
        .unwrap_or_default()
}

/// Note paths passed on the command line, skipping argv[0] and any flags.
///
/// This is how Windows and Linux deliver "open with"; macOS uses an Apple Event
/// surfaced as `RunEvent::Opened` instead, so this is dead code there.
#[cfg(any(target_os = "windows", target_os = "linux"))]
pub fn paths_from_args<I: IntoIterator<Item = String>>(args: I) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .filter(|arg| is_note(arg))
        .collect()
}
