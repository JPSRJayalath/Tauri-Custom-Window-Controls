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
      "transparent": true,
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

### 2. Configure Capabilities & Permissions (`src-tauri/capabilities/default.json`)

In Tauri v2, window manipulation APIs require permissions. Add window permissions to `src-tauri/capabilities/default.json`:

```json
"permissions": [
  "core:default",
  "core:window:allow-close",
  "core:window:allow-minimize",
  "core:window:allow-toggle-maximize",
  "core:window:allow-start-dragging",
  "core:window:allow-start-resize-dragging",
  "core:window:allow-is-focused",
  "core:window:allow-internal-toggle-maximize",
  "core:window:allow-is-maximized"
]
```

---

### 3. Install Tauri Frontend API

```bash
pnpm install @tauri-apps/api
```

---

### 4. Configure Tauri Builder (src-tauri/src/lib.rs)

Initialize your Tauri application builder and set up window event handlers or setup hooks in your main entry point:

```rs
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```



## 💻 Component Usage & Implementation

Here is the React/TypeScript implementation including the window controls titlebar and the **Code Block** component:


### 1. Create the Window Title Bar Component (`src/components/WindowTitleBar.tsx`)

Create a `WindowTitleBar.tsx` component to implement a custom window title bar. On macOS, it can accommodate the native traffic light controls (Close, Minimize, and Zoom) by positioning the custom title bar alongside or around them, depending on your window configuration.

```tsx
import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  type Window as TauriWindow,
} from "@tauri-apps/api/window";

type WindowTitleBarProps = {
  title?: string;
};

function runWindowAction(action: (window: TauriWindow) => Promise<void>) {
  if (!isTauri()) return;

  void action(getCurrentWindow()).catch((error) => {
    console.error("Window action failed:", error);
  });
}

export default function WindowTitleBar({title = "Windows Custome Controlers"}: WindowTitleBarProps) {
  const [isActiveWindow, setIsActiveWindow] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Browser fallback for `npm run dev`.
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
    document.documentElement.dataset.maximized = isMaximized ? "true" : "false";
  }, [isMaximized])


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
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
                d="M3 3V1h6v6H7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <rect
                x="1"
                y="3"
                width="6"
                height="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect
                x="1"
                y="1"
                width="8"
                height="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
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
              d="M1.5 1.5l7 7M8.5 1.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
```

---

### 2. Add Linux Resize Handles (`src/components/ResizeHandles.tsx`)

Linux window managers may require custom resize handling when native window decorations are disabled.

Create a `ResizeHandles.tsx` component to provide custom window resizing functionality by detecting pointer interactions along the window edges and corners.

This component is intended for the Linux implementation and helps maintain native-like window resizing behavior with custom window decorations.

```tsx
import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  type Window as TauriWindow,
} from "@tauri-apps/api/window";

type WindowTitleBarProps = {
  title?: string;
};

function runWindowAction(action: (window: TauriWindow) => Promise<void>) {
  if (!isTauri()) return;

  void action(getCurrentWindow()).catch((error) => {
    console.error("Window action failed:", error);
  });
}

export default function WindowTitleBar({title = "Windows Custome Controlers"}: WindowTitleBarProps) {
  const [isActiveWindow, setIsActiveWindow] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Browser fallback for `npm run dev`.
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
    document.documentElement.dataset.maximized = isMaximized ? "true" : "false";
  }, [isMaximized])


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
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
                d="M3 3V1h6v6H7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <rect
                x="1"
                y="3"
                width="6"
                height="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect
                x="1"
                y="1"
                width="8"
                height="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
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
              d="M1.5 1.5l7 7M8.5 1.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
```

---

### 3. Integrate the Custom Window Title Bar (`src/App.tsx`)

Import and render the previously created `WindowTitleBar` component in `src/main.tsx` to make the custom title bar available throughout your application.

```tsx
import "./App.css";
import ResizeHandles from "./components/ResizeHandles";
import WindowsTitleBar from "./components/WindowTitleBar";

export default function App() {
  return (
    <main className="app-shell">
      <ResizeHandles />
      <WindowsTitleBar />
      <div className="app-content">
        
      </div>
    </main>
  );
}

```

---

## 🎨 Styles (`src/App.css`)
Add the following CSS rules to style the window controls bar, IDE code container, and copy icon button:

```css
:root {
  --headerbar-height: 46px;

  /* Yaru light */
  --headerbar-bg: #f6f5f4;
  --window-bg: #ffffff;
  --headerbar-fg: #3d3d3d;
  --headerbar-border: rgba(0, 0, 0, 0.12);
  --control-hover: rgba(0, 0, 0, 0.1);
  --control-active: rgba(0, 0, 0, 0.18);
  --close-hover: #e01b24;
  --close-active: #c01c28;

  /* Ubuntu accent (Yaru orange) */
  --accent: #e95420;
  --accent-green: #2ec27e;

  --radius: 12px;

  -webkit-user-select: none;
  user-select: none;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Yaru dark */
    --headerbar-bg: #303030;
    --window-bg: #1e1e1e;
    --headerbar-fg: #f7f7f7;
    --headerbar-border: rgba(255, 255, 255, 0.1);
    --control-hover: rgba(255, 255, 255, 0.2);
    --control-active: rgba(255, 255, 255, 0.2);
  }
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

/* Transparency is what lets the rounded corners show through. */
html,
body {
  background: transparent;
}

body {
  overflow: hidden;
  color: var(--headerbar-fg);
  font-family: "Ubuntu Sans", "Ubuntu", "Cantarell", "Segoe UI", sans-serif;
}

#root {
  display: flex;
  flex-direction: column;
  background: transparent;
}

/* ---------- Window shell ---------- */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--window-bg);
  border-radius: var(--radius);
  box-shadow: 0 0 0 1px var(--headerbar-border);
}

:root[data-maximized="true"] .app-shell {
  border-radius: 0;
  box-shadow: none;
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* ---------- Header bar ---------- */
.titlebar {
  position: relative;
  display: flex;
  flex: 0 0 var(--headerbar-height);
  align-items: center;
  height: var(--headerbar-height);
  background: var(--headerbar-bg);
  box-shadow: inset 0 -1px 0 var(--headerbar-border);
  user-select: none;
  -webkit-user-select: none;
}

.titlebar__title {
  position: absolute;
  left: 50%;
  max-width: 45%;
  overflow: hidden;
  color: var(--headerbar-fg);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
  transform: translateX(-50%);
  pointer-events: none;
}

.titlebar__drag {
  flex: 1;
  align-self: stretch;
}

/* ---------- Window buttons (Yaru circular) ---------- */
.window-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding-right: 6px;
  margin-left: auto;
}

.window-control {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: var(--headerbar-fg);
  cursor: default;
  transition:
    background-color 120ms ease,
    color 120ms ease,
    opacity 120ms ease;
}

.window-control:hover {
  background: var(--control-hover);
  opacity: 1;
}

.window-control:active {
  background: var(--control-active);
}

.window-control:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.window-control--close:hover {
  background: var(--close-hover);
  color: #ffffff;
}

.window-control--close:active {
  background: var(--close-active);
  color: #ffffff;
}

/* ---------- Inactive window ---------- */
.titlebar[data-active="false"] .titlebar__title,
.titlebar[data-active="false"] .window-control {
  opacity: 0.5;
}

/* ---------- Status pill ---------- */
.activeWindowsIndicator {
  position: absolute;
  left: 8px;
  top: 50%;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 10px;
  border: 1px solid var(--headerbar-border);
  border-radius: 999px;
  background: var(--window-bg);
  color: var(--headerbar-fg);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  transform: translateY(-50%);
}

.activeIndication {
  line-height: 1;
}

.activeIndicatorDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #a1a1a6;
  opacity: 0.5;
  transition:
    background-color 160ms ease,
    opacity 160ms ease;
}

.titlebar[data-active="true"] .activeIndicatorDot {
  background: var(--accent-green);
  opacity: 1;
}

/* ---------- Resize handles ---------- */
.resize-handles {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

:root[data-maximized="true"] .resize-handles {
  display: none;
}

.resize-handle {
  position: absolute;
  pointer-events: auto;
}

.resize-handle--n { top: 0; left: 8px; right: 8px; height: 4px; cursor: ns-resize; }
.resize-handle--s { bottom: 0; left: 8px; right: 8px; height: 4px; cursor: ns-resize; }
.resize-handle--e { top: 8px; bottom: 8px; right: 0; width: 4px; cursor: ew-resize; }
.resize-handle--w { top: 8px; bottom: 8px; left: 0; width: 4px; cursor: ew-resize; }

.resize-handle--ne { top: 0; right: 0; width: 12px; height: 12px; cursor: nesw-resize; }
.resize-handle--nw { top: 0; left: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.resize-handle--se { bottom: 0; right: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.resize-handle--sw { bottom: 0; left: 0; width: 12px; height: 12px; cursor: nesw-resize; }
```
---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
