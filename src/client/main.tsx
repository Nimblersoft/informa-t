import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { CompactAnalysis } from "./components/CompactAnalysis";
import { LiveAnalysisHome } from "./components/LiveAnalysisHome";
import { PublicWalkthrough } from "./components/PublicWalkthrough";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {pathname === "/walkthrough" ? <PublicWalkthrough /> : pathname === "/compact" ? <CompactAnalysis /> : pathname === "/demo" ? <App /> : <LiveAnalysisHome />}
    </React.StrictMode>,
  );
}
