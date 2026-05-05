#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::process::Command;

#[tauri::command]
fn install_bd(release: String) -> Result<String, String> {
    let output = Command::new("bun")
        .args(["run", "cli", "inject", &release])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn uninstall_bd(release: String) -> Result<String, String> {
    let output = Command::new("bun")
        .args(["run", "cli", "uninject", &release])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![install_bd, uninstall_bd])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
