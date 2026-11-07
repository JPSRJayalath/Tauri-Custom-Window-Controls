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