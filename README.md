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
      "transparent": false,
      "shadow": true,
      "decorations": false
    }
  ],
  "security": {
    "csp": null
  }
},
```
**Note:** You can customize the window dimensions by adjusting `minWidth`, `minHeight`, `height`, and `width`.

---

### 2. Install the Tauri OS Plugin
Run the following command inside the src-tauri directory to add the OS Information plugin to your Rust dependencies.

```bash
cargo add tauri-plugin-os
```
`(optional)` If you also want to use the plugin from your frontend (React/TypeScript), install its JavaScript package:
```bash
npm install @tauri-apps/plugin-os
```

---

### 3. Configure Capabilities & Permissions (`src-tauri/capabilities/default.json`)

In Tauri v2, window manipulation APIs require permissions. Add window permissions to `src-tauri/capabilities/default.json`:

```json
"permissions": [
  "core:default",
  "core:window:default",
  "core:window:allow-close",
  "core:window:allow-minimize",
  "core:window:allow-toggle-maximize",
  "core:window:allow-start-dragging",
  "core:window:allow-is-focused",
  "core:window:allow-internal-toggle-maximize",
  "core:window:allow-is-maximized",
  "os:default"
]
```

---

### 4. Add macOS Native Dependencies (`src-tauri/Cargo.toml`)

If you are building custom window controls for macOS, you need to add the `objc2-app-kit` crate under target-specific dependencies to handle native window and view bindings in Rust:

```toml
[target.'cfg(target_os = "windows")'.dependencies]
windows = { version = "0.62", features = [
    "Win32_Foundation",
    "Win32_Graphics_Dwm",
    "Win32_UI_WindowsAndMessaging"
] }
```

---

### 5. Install Tauri Frontend API

```bash
npm install @tauri-apps/api
```

---

### 6. Configure Tauri Builder (src-tauri/src/lib.rs)

Initialize your Tauri application builder and set up window event handlers or setup hooks in your main entry point:

```rs
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    configure_macos_window(&window);
                }
            }

            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    round_window_corners(&window);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "windows")]
fn round_window_corners(window: &tauri::WebviewWindow) {
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
    };

    let Ok(hwnd) = window.hwnd() else {
        return;
    };

    let preference = DWMWCP_ROUND;

    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &preference as *const _ as *const _,
            std::mem::size_of_val(&preference) as u32,
        );
    }
}
```



## 💻 Component Usage & Implementation

Here is the React/TypeScript implementation including the window controls titlebar and the **Code Block** component:


### 1. Create the Window Title Bar Component (`src/components/WindowTitleBar.tsx`)

Create a `WindowTitleBar.tsx` component to implement a custom window title bar. On macOS, it can accommodate the native traffic light controls (Close, Minimize, and Zoom) by positioning the custom title bar alongside or around them, depending on your window configuration.

```tsx
import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow, type Window as TauriWindow } from "@tauri-apps/api/window";
import { version } from "@tauri-apps/plugin-os";

type WindowTitleBarProps = {
  title?: string;
};

function runWindowAction(action: (window: TauriWindow) => Promise<void>) {
  if (!isTauri()) return;

  void action(getCurrentWindow()).catch((error) => {
    console.error("Window action failed:", error);
  });
}

export default function WindowTitleBar({title = "Traffic Lights"}: WindowTitleBarProps) {
  const [isActiveWindow, setIsActiveWindow] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) {
      const onFocus = () => setIsActiveWindow(true);
      const onBlur = () => setIsActiveWindow(false);

      window.addEventListener("focus", onFocus);
      window.addEventListener("blur", onBlur);
      setIsActiveWindow(document.hasFocus());

      return () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("blur", onBlur);
      };
    }

    const appWindow = getCurrentWindow();
    let disposed = false;
    let unlistenFocus: (() => void) | undefined;
    let unlistenResize: (() => void) | undefined;

    const syncMaximized = () => {
      void appWindow
        .isMaximized()
        .then((maximized) => {
          if (!disposed) setIsMaximized(maximized);
        })
        .catch(console.error);
    };

    void appWindow
      .isFocused()
      .then((focused) => {
        if (!disposed) setIsActiveWindow(focused);
      })
      .catch(console.error);

    syncMaximized();

    void appWindow
      .onFocusChanged(({ payload: focused }) => {
        if (!disposed) setIsActiveWindow(focused);
      })
      .then((fn) => {
        if (disposed) fn();
        else unlistenFocus = fn;
      })
      .catch(console.error);

    void appWindow
      .onResized(() => {
        syncMaximized();
      })
      .then((fn) => {
        if (disposed) fn();
        else unlistenResize = fn;
      })
      .catch(console.error);

    return () => {
      disposed = true;
      unlistenFocus?.();
      unlistenResize?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    try {
      const build = Number(version().split(".")[2] ?? 0);

      if (Number.isFinite(build)) {
        document.documentElement.dataset.windows = build >= 22000 ? "11" : "10";
      }
    } catch (error) {
      console.error("Could not read OS version:", error);
    }
  }, []);

  const toggleMaximize = useCallback(async () => {
    if (!isTauri()) return;

    const appWindow = getCurrentWindow();

    try {
      await appWindow.toggleMaximize();
      setIsMaximized(await appWindow.isMaximized());
    } catch (error) {
      console.error("Window action failed:", error);
    }
  }, []);

  return (
    <header
      className="titlebar"
      data-active={isActiveWindow ? "true" : "false"}
      data-tauri-drag-region
    >
      <div className="activeWindowsIndicator" data-tauri-drag-region>
        <span className="activeIndicatorDot" aria-hidden="true" />
        <span className="activeIndication">
          {isActiveWindow ? "Active" : "Inactive"}
        </span>
      </div>

      <span className="titlebar__title" data-tauri-drag-region>
        {title}
      </span>

      <div className="titlebar__drag" data-tauri-drag-region />

      <div className="window-controls">
        <button
          type="button"
          className="window-control"
          aria-label="Minimize"
          title="Minimize"
          onClick={() => runWindowAction((win) => win.minimize())}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          type="button"
          className="window-control"
          aria-label={isMaximized ? "Restore" : "Maximize"}
          title={isMaximized ? "Restore" : "Maximize"}
          onClick={toggleMaximize}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M2.5 2.5V.5h7v7h-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <rect
                x=".5"
                y="2.5"
                width="7"
                height="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect
                x=".5"
                y=".5"
                width="9"
                height="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="window-control window-control--close"
          aria-label="Close"
          title="Close"
          onClick={() => runWindowAction((win) => win.close())}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M.5.5l9 9M9.5.5l-9 9"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </button>
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
  --titlebar-height: 40px;
  --bg: #ffffff;
  --text: #1b1b1b;
  --text-secondary: #5f5f5f;
  --titlebar-hover: rgba(0, 0, 0, 0.06);
  --titlebar-pill-border: rgba(119, 117, 117, 0.8);
  --titlebar-pill-bg: rgba(255, 255, 255, 0.7);
  --accent-active: #30d158;
  --accent-inactive: #a1a1a6;
  -webkit-user-select: none;
  user-select: none;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #000000;
    --text: #f5f5f5;
    --text-secondary: #b3b3b3;
    --titlebar-hover: rgba(255, 255, 255, 0.08);
    --titlebar-pill-border: rgba(255, 255, 255, 0.22);
    --titlebar-pill-bg: rgba(255, 255, 255, 0.06);
  }
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: "Segoe UI Variable", "Segoe UI", sans-serif;
}

#root {
  display: flex;
  flex-direction: column;
}

/* ---------- Title bar ---------- */
.titlebar {
  position: relative; /* required: the pill and title are absolute */
  display: flex;
  flex: 0 0 var(--titlebar-height);
  align-items: center;
  height: var(--titlebar-height);
  background: var(--bg);
  user-select: none;
  -webkit-user-select: none;
}

.titlebar__title {
  position: absolute;
  left: 50%;
  max-width: 45%;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  transform: translateX(-50%);
  pointer-events: none; /* clicks fall through to the drag region */
}

.titlebar__drag {
  flex: 1;
  align-self: stretch;
}

/* ---------- Caption buttons ---------- */
.window-controls {
  display: flex;
  height: 100%;
}

.window-control {
  display: grid;
  place-items: center;
  width: 46px;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: default;
  transition:
    background-color 120ms ease,
    color 120ms ease;
}

.window-control:hover {
  background: var(--titlebar-hover);
  color: var(--text);
}

.window-control:active {
  background: rgba(0, 0, 0, 0.12);
}

.window-control:focus-visible {
  outline: 2px solid #0067c0;
  outline-offset: -2px;
}

.window-control--close:hover,
.window-control--close:active {
  background: #c42b1c;
  color: #ffffff;
}

.window-control--close:active {
  background: #a02618;
}

/* ---------- Inactive window ---------- */
.titlebar[data-active="false"] .titlebar__title {
  color: var(--text-secondary);
}

.titlebar[data-active="false"] .window-control svg {
  opacity: 0.5;
}

/* ...but never dim the icon on the red close hover */
.titlebar[data-active="false"] .window-control:hover svg {
  opacity: 1;
}

/* ---------- Active indicator ---------- */
.activeWindowsIndicator {
  position: absolute;
  left: 10px;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 4px 10px;
  border: 1px solid var(--titlebar-pill-border);
  border-radius: 999px;
  background: var(--titlebar-pill-bg);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.03);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  transform: translateY(-50%);
}

.activeIndication {
  line-height: 1;
  color: var(--text-secondary);
}

.activeIndicatorDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-inactive);
  opacity: 0.5;
  transition:
    background-color 160ms ease,
    opacity 160ms ease,
    box-shadow 160ms ease;
}

.titlebar[data-active="true"] .activeIndicatorDot {
  background: var(--accent-active);
  opacity: 1;
  box-shadow: 0 0 0 3px rgba(48, 209, 88, 0.18);
}

/* ---------- Windows 11: rounded, inset caption buttons ---------- */
:root[data-windows="11"] .window-control {
  height: calc(100% - 4px);
  border-radius: 0 4px 0 0;
}

/* Windows 10: square, edge-to-edge */
:root[data-windows="10"] .window-control {
  border-radius: 0;
}
```
---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
