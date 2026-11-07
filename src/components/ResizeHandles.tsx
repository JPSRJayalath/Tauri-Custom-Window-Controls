import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const EDGES = [
    { direction: "North", className: "resize-handle resize-handle--n" },
    { direction: "South", className: "resize-handle resize-handle--s" },
    { direction: "East", className: "resize-handle resize-handle--e" },
    { direction: "West", className: "resize-handle resize-handle--w" },
    { direction: "NorthEast", className: "resize-handle resize-handle--ne" },
    { direction: "NorthWest", className: "resize-handle resize-handle--nw" },
    { direction: "SouthEast", className: "resize-handle resize-handle--se" },
    { direction: "SouthWest", className: "resize-handle resize-handle--sw" },
] as const;

export default function ResizeHandles() {
    if (!isTauri()) return null;

    return(
        <div className="resize-handles" aria-hidden="true">
            {EDGES.map(({direction, className}) => (
                <div
                    key={direction}
                    className={className}
                    onMouseDown={(event) => {
                        if (event.button !== 0) return;

                        void getCurrentWindow()
                            .startResizeDragging(direction)
                            .catch((error) => console.error("Failed to start window resize:", error));
                    }}
                />
            ))}
        </div>
    );
}