use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Een tweede keer openen brengt het bestaande venster naar voren.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // Links (zoals Google Maps) openen in je gewone browser.
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("WhistleRocket kon niet starten");
}
