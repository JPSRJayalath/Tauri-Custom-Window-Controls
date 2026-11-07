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

