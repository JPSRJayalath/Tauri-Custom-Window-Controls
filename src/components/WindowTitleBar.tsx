import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  type Window as TauriWindow,
} from "@tauri-apps/api/window";

function runWindowAction(action: (window: TauriWindow) => Promise<void>) {
  if (!isTauri()) return;

  void action(getCurrentWindow()).catch((error) => {
    console.error("Window action failed:", error);
  });
}

export default function WindowTitleBar() {
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
      <div className="activeWindowsIndicator">
        <div className="activeIndicatorDot" style={{background: isActiveWindow ? "#30d158" : "#a1a1a6"}}/>
        <span className="activeIndication">
          {isActiveWindow ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="titlebar__drag" data-tauri-drag-region />

      <div className="window-controls">
        <button
          type="button"
          className="window-control"
          aria-label="Minimize"
          title="Minimize"
          onClick={() => runWindowAction((window) => window.minimize())}
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
          onClick={() => runWindowAction((window) => window.close())}
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