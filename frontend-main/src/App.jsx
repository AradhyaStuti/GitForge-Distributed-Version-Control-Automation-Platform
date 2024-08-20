import ProjectRoutes from "./Routes";
import { useSocket } from "./hooks/useSocket";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import CommandPalette from "./components/CommandPalette";

function App() {
  useSocket();
  useKeyboardShortcuts();
  useOnlineStatus();
  return (
    <>
      <CommandPalette />
      <ProjectRoutes />
    </>
  );
}

export default App;
