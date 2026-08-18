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

  const routeMetadata: Record<string, string> = {
    "/": "informa-t | Asistente editorial y verificación de información electoral con fuentes auditables",
    "/app": "informa-t | Consola de Análisis en Vivo y Contraste de Fuentes",
    "/app/live": "informa-t | Consola de Análisis en Vivo y Contraste de Fuentes",
    "/live": "informa-t | Consola de Análisis en Vivo y Contraste de Fuentes",
    "/presentation": "informa-t | Pitch MediaHack II - Verificación Electoral Auditable",
    "/prototype": "informa-t | Prototipo Visual Interactivo de Cockpit Editorial",
    "/demo": "informa-t | Caso Demo A1 - Panel de Revisión Editorial",
    "/compact": "informa-t | Verificación Compacta y Widgets Embeddable",
    "/walkthrough": "informa-t | Guía y Recorrido de Trazabilidad Auditable",
  };

  const title = routeMetadata[pathname] || (pathname.startsWith("/app") ? routeMetadata["/app"] : routeMetadata["/"]);
  if (title) {
    document.title = title;
  }

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
