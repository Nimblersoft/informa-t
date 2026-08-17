import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { CompactAnalysis } from "./components/CompactAnalysis";
import { LandingPage } from "./components/LandingPage";
import { LiveAnalysisHome } from "./components/LiveAnalysisHome";
import { PresentationPage } from "./components/PresentationPage";
import { PrototypePreview } from "./components/PrototypePreview";
import { PublicWalkthrough } from "./components/PublicWalkthrough";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  const renderComponent = () => {
    switch (pathname) {
      case "/":
        return <LandingPage />;
      case "/app":
      case "/app/live":
      case "/live":
        return <LiveAnalysisHome />;
      case "/presentation":
        return <PresentationPage />;
      case "/prototype":
        return <PrototypePreview />;
      case "/demo":
        return <App mode="demo" />;
      case "/compact":
        return <CompactAnalysis />;
      case "/walkthrough":
        return <PublicWalkthrough />;
      default:
        // For /app/* sub-paths or unspecified routes, default to landing page or live app
        if (pathname.startsWith("/app")) {
          return <LiveAnalysisHome />;
        }
        return <LandingPage />;
    }
  };

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {renderComponent()}
    </React.StrictMode>,
  );
}
