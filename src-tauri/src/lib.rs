#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    configure_macos_window(&window);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Keep the native macOS window chrome predictable:
/// - no separator line between the transparent title bar and the content
/// - the standard traffic lights stay visible
#[cfg(target_os = "macos")]
fn configure_macos_window(window: &tauri::WebviewWindow) {
    use objc2_app_kit::{
        NSWindow, NSWindowButton, NSWindowTitleVisibility, NSTitlebarSeparatorStyle,
    };

    let Ok(ns_window) = window.ns_window() else {
        return;
    };

    // Safety: `setup` runs on the main thread and Tauri hands us a valid NSWindow.
    let ns_window = unsafe { &*(ns_window as *mut NSWindow) };

    ns_window.setTitlebarAppearsTransparent(true);
    ns_window.setTitleVisibility(NSWindowTitleVisibility::Hidden);
    ns_window.setTitlebarSeparatorStyle(NSTitlebarSeparatorStyle::None);

    for kind in [
        NSWindowButton::CloseButton,
        NSWindowButton::MiniaturizeButton,
        NSWindowButton::ZoomButton,
    ] {
        if let Some(button) = ns_window.standardWindowButton(kind) {
            button.setHidden(false);
        }
    }
}
