import { createRoot } from "react-dom/client";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-600.css";
import App from "./app/App";
import "./ui/style.css";
import { initializeAnalytics } from "./analytics";
initializeAnalytics();
createRoot(document.getElementById("root")!).render(<App />);
