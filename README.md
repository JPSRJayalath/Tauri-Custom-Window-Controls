# Tauri Custom Window Controls

A sleek, customizable window bar component for Tauri applications, featuring standard window controls (Minimize, Maximize/Restore, and Close), along with real-time window focus detection to identify whether the application window is currently active or inactive.

---

## 🛠️ Features

- **Tauri v2 Permissions Ready**: Configured for Tauri's security model with capabilities configuration.
- **Cross-Platform**: Supports Windows, macOS, and Linux titlebars.

---

## 🚀 Quick Start & Setup

### 1. Disable Window Decorations (`src-tauri/tauri.conf.json`)

Disable native window decorations so your custom titlebar takes over:

```json
"app": {
  "windows": [
    {
      "title": "windows-controls",
      "width": 800,
      "height": 600,
      "minWidth": 720,
      "minHeight": 540,
      "center": true,
      "resizable": true,
      "decorations": true,
      "titleBarStyle": "Overlay",
      "hiddenTitle": true,
      "trafficLightPosition": {
        "x": 12,
        "y": 20
      }
    }
  ],
  "security": {
    "csp": null
  }
},
```
**Note:** You can customize the window dimensions by adjusting `minWidth`, `minHeight`, `height`, and `width`. You can also change the macOS traffic light button positioning using `trafficLightPosition` by adjusting its `x` and `y` coordinates to suit your layout.

---

### 2. Configure Capabilities & Permissions (`src-tauri/capabilities/default.json`)

In Tauri v2, window manipulation APIs require permissions. Add window permissions to `src-tauri/capabilities/default.json`:

```json
"permissions": [
  "core:default",
  "core:window:default",
  "core:window:allow-close",
  "core:window:allow-minimize",
  "core:window:allow-toggle-maximize",
  "core:window:allow-start-dragging",
  "core:window:allow-is-focused"
]
```

---

### 3. Add macOS Native Dependencies (`src-tauri/Cargo.toml`)

If you are building custom window controls for macOS, you need to add the `objc2-app-kit` crate under target-specific dependencies to handle native window and view bindings in Rust:

```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2-app-kit = { version = "0.3", default-features = false, features = [
  "NSWindow",
  "NSButton",
  "NSControl",
  "NSView",
  "NSResponder",
] }
```

---

### 4. Install Tauri Frontend API

```bash
npm install @tauri-apps/api
```

---

### 5. Configure Tauri Builder (src-tauri/src/lib.rs)

Initialize your Tauri application builder and set up window event handlers or setup hooks in your main entry point:

```rs
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

#[cfg(target_os = "macos")]
fn configure_macos_window(window: &tauri::WebviewWindow) {
    use objc2_app_kit::{
        NSWindow, NSWindowButton, NSWindowTitleVisibility, NSTitlebarSeparatorStyle,
    };

    let Ok(ns_window) = window.ns_window() else {
        return;
    };

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
```



## 💻 Component Usage & Implementation

Here is the React/TypeScript implementation including the window controls titlebar and the **Code Block** component:


### 1. Create the Window Title Bar Component (`src/components/WindowTitleBar.tsx`)

Create a `WindowTitleBar.tsx` component to implement a custom window title bar. On macOS, it can accommodate the native traffic light controls (Close, Minimize, and Zoom) by positioning the custom title bar alongside or around them, depending on your window configuration.

```tsx
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function WindowTitleBar() {
  const [isActiveWindow, setIsActiveWindow] = useState(true);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    if (!isTauri()) {
      const onFocus = () => setIsActiveWindow(true);

      window.addEventListener("focus", onFocus);
      setIsActiveWindow(document.hasFocus());

      return () => {
        window.removeEventListener("focus", onFocus);
      };
    }

    const appWindow = getCurrentWindow();

    void appWindow.isFocused().then((focused) => {
      if (!disposed) setIsActiveWindow(focused);
    });

    void appWindow
      .onFocusChanged(({ payload: focused }) => {
        setIsActiveWindow(focused);
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return (
    <header className="draggable" data-tauri-drag-region>
      <div className="activeWindowsIndicator">
        <div className="activeIndicatorDot" style={{background: isActiveWindow ? "#30d158" : "#a1a1a6"}}/>
        <span className="activeIndication">
          {isActiveWindow ? "Active" : "Inactive"}
        </span>
      </div>
    </header>
  );
}
```

---

### 2. Integrate the Custom Window Title Bar (`src/main.tsx`)

Import and render the previously created `WindowTitleBar` component in `src/main.tsx` to make the custom title bar available throughout your application.

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import WindowsTitleBar from "./components/WindowTitleBar";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  
  <React.StrictMode>
    <WindowsTitleBar />
    <App />
  </React.StrictMode>,
);
```

---

## 🎨 Styles (`src/App.css`)
Add the following CSS rules to style the window controls bar, IDE code container, and copy icon button:

```css
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  color: #0f0f0f;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  -webkit-user-select: none;
  user-select: none;

  box-sizing: border-box;
  margin: 0;
  padding: 0;

}

body{
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
}

@media (prefers-color-scheme: dark) {
    body {
        background: #121212;
        color: #ffffff;
    }
}

.draggable{
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  -webkit-app-region: drag;
}

.activeWindowsIndicator{
  right: 0;
  position: absolute;
  margin-right: 10px;
  margin-top: 10px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  display: inline-flex;
  padding: 5px 11px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.03);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.activeIndicatorDot{
  width: 7px;
  height: 7px;
  border-radius: 50%;
  opacity: 0.5;
  transition: background-color 160ms ease, opacity 160ms ease, box-shadow 160ms ease;
}
```
---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
