import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function WindowTitleBar() {
  const [isActiveWindow, setIsActiveWindow] = useState(true);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    // Browser fallback so `npm run dev` also works.
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