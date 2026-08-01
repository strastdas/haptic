use tauri::AppHandle;
use tauri_plugin_fs::FsExt;

/// Grants read/write access to one file for the rest of the session.
///
/// `capabilities/default.json` scopes the filesystem to `$HOME/**` and
/// `$APPDATA`, which is right for collections but too narrow for "open this
/// single file": a note can legitimately live on an external volume, in `/tmp`,
/// or anywhere else the user points us at.
///
/// Widening the static scope to `**` would hand the whole filesystem to the
/// webview permanently. Instead the scope is extended one path at a time, only
/// after the user has explicitly chosen that file through the OS dialog or by
/// opening it with Haptic — which is the same consent model the dialog already
/// implies.
#[tauri::command]
pub async fn allow_file(app: AppHandle, path: String) -> Result<(), String> {
    app.fs_scope()
        .allow_file(&path)
        .map_err(|error| error.to_string())
}
