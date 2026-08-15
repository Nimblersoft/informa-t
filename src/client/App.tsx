import React, { useEffect, useState } from "react";
import type { DemoCase } from "../shared/contracts";
import { Header } from "./components/Header";
import { ExtractStream } from "./components/ExtractStream";
import { AnalysisTabs, type TabId } from "./components/AnalysisTabs";
import { EvidencePanel } from "./components/EvidencePanel";
import { ModelsPanel } from "./components/ModelsPanel";
import { LogsPanel } from "./components/LogsPanel";

declare global {
  interface Window {
    __interactiveDurationMs?: number;
  }
}

export const App: React.FC = () => {
  const [caseData, setCaseData] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [renderDurationMs, setRenderDurationMs] = useState<number | null>(null);

  const [activeExcerptId, setActiveExcerptId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabId>("evidence");
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const mountTime = performance.now();

    async function fetchCase() {
      try {
        const response = await fetch("/api/demo/cases/a1");
        if (!response.ok) {
          throw new Error(`Error en respuesta del servidor: ${response.status}`);
        }
        const data = (await response.json()) as DemoCase;
        if (isMounted) {
          const duration = performance.now() - mountTime;
          setCaseData(data);
          if (data.excerpts && data.excerpts.length > 0) {
            setActiveExcerptId(data.excerpts[0].id);
          }
          setRenderDurationMs(duration);
          if (typeof window !== "undefined") {
            window.__interactiveDurationMs = duration;
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el caso",
          );
          setLoading(false);
        }
      }
    }

    void fetchCase();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavigateToLog = (logEventId: string) => {
    setActiveTab("logs");
    setFocusedEventId(logEventId);
  };

  const handleClearFocusedEvent = () => {
    setFocusedEventId(null);
  };

  if (loading) {
    return (
      <div
        className="editorial-shell loading-container"
        data-testid="editorial-shell"
        data-ready="false"
      >
        <div className="loading-spinner" aria-hidden="true" />
        <p className="loading-text">Cargando caso de demostración A1...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div
        className="editorial-shell error-container"
        data-testid="editorial-shell"
        data-ready="false"
      >
        <div className="error-box" role="alert">
          <h2 className="error-title">No fue posible cargar el caso</h2>
          <p className="error-message">{error ?? "Datos no disponibles"}</p>
        </div>
      </div>
    );
  }

  const currentExcerptId =
    activeExcerptId || (caseData.excerpts.length > 0 ? caseData.excerpts[0].id : "");

  return (
    <div
      className="editorial-shell"
      data-testid="editorial-shell"
      data-ready="true"
      data-interactive-ms={renderDurationMs !== null ? Math.round(renderDurationMs) : undefined}
    >
      <Header caseId={caseData.id} caseLabel={caseData.label} />

      <main className="editorial-main-content">
        <div className="editorial-grid-layout">
          {/* Left Column: Extract Stream with primary and related evidence separated */}
          <div className="grid-col-left">
            <ExtractStream
              excerpts={caseData.excerpts}
              relatedContext={caseData.relatedContext}
              activeExcerptId={currentExcerptId}
              onSelectExcerpt={(id) => setActiveExcerptId(id)}
              onNavigateToLog={handleNavigateToLog}
            />
          </div>

          {/* Right Column: Multi-tab analysis */}
          <div className="grid-col-right">
            <AnalysisTabs activeTab={activeTab} onTabChange={setActiveTab}>
              {{
                evidence: (
                  <EvidencePanel
                    indices={caseData.indices}
                    onNavigateToLog={handleNavigateToLog}
                  />
                ),
                models: <ModelsPanel proposals={caseData.proposals} />,
                logs: (
                  <LogsPanel
                    events={caseData.traceEvents}
                    citations={caseData.citations}
                    proposals={caseData.proposals}
                    focusedEventId={focusedEventId}
                    onClearFocusedEvent={handleClearFocusedEvent}
                  />
                ),
              }}
            </AnalysisTabs>
          </div>
        </div>
      </main>
    </div>
  );
};
export default App;
