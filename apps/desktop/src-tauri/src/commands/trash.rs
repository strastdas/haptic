/// Moves a file or directory to the OS recycle bin / trash.
///
/// Replaces a hand-rolled rename into `$HOME/<per-OS trash dir>`, which only
/// ever worked on macOS:
///
/// - Windows: `$Recycle.Bin` lives at the drive root, not in the home
///   directory, and cannot be populated by a rename — it needs the shell API.
/// - Linux: the freedesktop spec requires a matching `.trashinfo` entry under
///   `.../Trash/info/`. Renaming the file into `.../Trash/files/` alone leaves
///   it in the bin but un-restorable.
///
/// The `trash` crate implements the correct mechanism per platform, so this
/// removes the platform branch rather than adding to it.
#[tauri::command]
pub async fn move_to_trash(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|error| error.to_string())
}
