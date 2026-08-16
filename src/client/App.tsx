import React, { useEffect, useState } from "react";
import type { DemoCase, EvidenceExcerpt, ExtractedClaim, IndexMetric, RelatedContextItem, SourceCitation, TraceEvent } from "../shared/contracts";
import type { AnalysisEvent } from "../shared/analysis-events";
import { Header } from "./components/Header";
import { ExtractStream } from "./components/ExtractStream";
import { AnalysisTabs, type TabId } from "./components/AnalysisTabs";
import { EvidencePanel } from "./components/EvidencePanel";
import { ModelsPanel } from "./components/ModelsPanel";
import { LogsPanel } from "./components/LogsPanel";
import { EditorialDecision } from "./components/EditorialDecision";
import { LiveAnalysisPanel } from "./components/LiveAnalysisPanel";
import type { LiveModelProposal } from "./components/ModelsPanel";

declare global {
  interface Window {
    __interactiveDurationMs?: number;
  }
}

interface AppProps {
  mode?: "demo" | "live";
}

interface EditorialPresentation {
  excerpts: DemoCase["excerpts"];
  relatedContext: readonly RelatedContextItem[];
  indices: readonly IndexMetric[];
  citations: readonly SourceCitation[];
  proposals: readonly LiveModelProposal[];
  traceEvents: readonly TraceEvent[];
}

export const App: React.FC<AppProps> = ({ mode = "demo" }) => {
  const [caseData, setCaseData] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState<boolean>(mode === "demo");
  const [error, setError] = useState<string | null>(null);
  const [renderDurationMs, setRenderDurationMs] = useState<number | null>(null);

  const [activeExcerptId, setActiveExcerptId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabId>("evidence");
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [liveTraceEvents, setLiveTraceEvents] = useState<TraceEvent[]>([]);
  const [liveEvents, setLiveEvents] = useState<AnalysisEvent[]>([]);

  useEffect(() => {
    if (mode === "live") {
      setLoading(false);
      return;
    }
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
  }, [mode]);

  const handleNavigateToLog = (logEventId: string) => {
    setActiveTab("logs");
    setFocusedEventId(logEventId);
  };

  const handleClearFocusedEvent = () => {
    setFocusedEventId(null);
  };

  const handleLiveTraceEvent = (event: TraceEvent) => {
    setLiveTraceEvents((current) => current.some((item) => item.id === event.id)
      ? current
      : [...current, { ...event, title: `Ejecución en vivo · ${event.title}` }]);
  };

  const handleAnalysisReset = () => {
    setLiveTraceEvents([]);
    setLiveEvents([]);
    setFocusedEventId(null);
  };

  const handleLiveAnalysisEvent = (event: AnalysisEvent) => {
    setLiveEvents((current) => [...current, event]);
    if (event.type === "model.completed" || event.type === "model.failed") setActiveTab("models");
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

  if (error || (mode === "demo" && !caseData)) {
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

  const livePresentation = buildLivePresentation(liveEvents, liveTraceEvents);
  const showsLiveOutput = liveEvents.some((event) => event.type === "claim.extracted");
  const presentation: EditorialPresentation = showsLiveOutput || mode === "live"
    ? livePresentation
    : {
        excerpts: caseData!.excerpts,
        relatedContext: caseData!.relatedContext,
        indices: caseData!.indices,
        citations: caseData!.citations,
        proposals: [],
        traceEvents: caseData!.traceEvents,
      };
  const currentExcerptId = activeExcerptId || presentation.excerpts[0]?.id || "";
  const showFixtureModels = mode === "demo" && !showsLiveOutput;

  return (
    <div
      className="editorial-shell"
      data-testid="editorial-shell"
      data-ready="true"
      data-interactive-ms={renderDurationMs !== null ? Math.round(renderDurationMs) : undefined}
    >
      <Header caseId={mode === "live" ? "vivo" : caseData!.id} caseLabel={mode === "live" ? "Análisis editorial en vivo" : caseData!.label} />

      <main className="editorial-main-content">
        <LiveAnalysisPanel
          onTraceEvent={handleLiveTraceEvent}
          onAnalysisReset={handleAnalysisReset}
          onAnalysisEvent={handleLiveAnalysisEvent}
        />
        <div className="editorial-grid-layout">
          {/* Left Column: Extract Stream with primary and related evidence separated */}
          <div className="grid-col-left">
            <ExtractStream
              excerpts={presentation.excerpts}
              relatedContext={presentation.relatedContext}
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
                    indices={presentation.indices}
                    onNavigateToLog={handleNavigateToLog}
                  />
                ),
                models: <ModelsPanel proposals={showFixtureModels ? caseData!.proposals : undefined} liveProposals={showsLiveOutput || mode === "live" ? presentation.proposals : undefined} />,
                logs: (
                  <LogsPanel
                    events={presentation.traceEvents}
                    citations={presentation.citations}
                    proposals={showFixtureModels ? caseData!.proposals : []}
                    focusedEventId={focusedEventId}
                    onClearFocusedEvent={handleClearFocusedEvent}
                  />
                ),
              }}
            </AnalysisTabs>
          </div>
        </div>

        {/* Human Editorial Decision Boundary */}
        <div className="editorial-decision-boundary-section">
          <EditorialDecision
            caseId={mode === "live" ? "vivo" : caseData!.id}
            claims={presentation.excerpts}
          />
        </div>
      </main>
    </div>
  );
};
export default App;

function buildLivePresentation(events: readonly AnalysisEvent[], traceEvents: readonly TraceEvent[]): EditorialPresentation {
  const claimEvent = events.filter((event): event is Extract<AnalysisEvent, { type: "claim.extracted" }> => event.type === "claim.extracted").at(-1);
  const evidenceEvents = events.filter((event): event is Extract<AnalysisEvent, { type: "evidence.retrieved" }> => event.type === "evidence.retrieved");
  const modelEvents = events.filter((event): event is Extract<AnalysisEvent, { type: "model.completed" | "model.failed" }> => event.type === "model.completed" || event.type === "model.failed");
  const claims = claimEvent?.data.claims ?? [];
  const excerpts = claims.map((claim, index) => claimToExcerpt(claim, index, claimEvent?.data.traceEventId ?? ""));
  const evidence = uniqueEvidence(evidenceEvents.flatMap((event) => event.data.excerpts));
  const proposals = modelEvents.map((event) => ({
    id: event.id,
    model: event.data.proposal.model,
    provider: event.data.proposal.provenance.provider,
    status: event.data.proposal.status,
    reviewFocus: event.data.proposal.proposal?.reviewFocus,
    rationale: event.data.proposal.proposal?.rationale ?? event.data.proposal.limitation,
    uncertainty: event.data.proposal.proposal?.uncertainty,
    limitations: event.data.proposal.proposal?.limitations,
    supportingEvidenceIds: event.data.proposal.proposal?.supportingEvidenceIds,
    contraryEvidenceIds: event.data.proposal.proposal?.contraryEvidenceIds,
    indices: event.data.proposal.proposal?.indices,
    traceEventId: event.data.traceEventId,
  }));
  const traceEventId = modelEvents[0]?.data.traceEventId ?? claimEvent?.data.traceEventId ?? "";

  return {
    excerpts,
    relatedContext: evidence.map((excerpt) => evidenceToContext(excerpt)),
    indices: proposalIndices(proposals, traceEventId),
    citations: evidence.map((excerpt) => evidenceToCitation(excerpt)),
    proposals,
    traceEvents,
  };
}

function claimToExcerpt(claim: ExtractedClaim, index: number, logEventId: string) {
  return {
    id: `live-claim-${index}`,
    title: `Aseveración ${String(index + 1).padStart(2, "0")}`,
    quote: claim.verbatimText,
    speaker: `Decisión: ${claim.extractionDecision}`,
    timestamp: claim.pipelineDisposition === "continuar_con_contexto" ? "Continúa con contexto" : claim.excluded ? "Exclusión dura" : "Lista para contraste",
    sourceType: "Ejecución en vivo",
    logEventId,
  };
}

function evidenceToContext(excerpt: EvidenceExcerpt): RelatedContextItem {
  return {
    id: `live-evidence-${excerpt.id}`,
    title: excerpt.title,
    description: excerpt.excerpt,
    reference: `${excerpt.institution} · ${excerpt.citationLocation}`,
  };
}

function evidenceToCitation(excerpt: EvidenceExcerpt): SourceCitation {
  return { id: `live-citation-${excerpt.id}`, title: excerpt.title, url: excerpt.sourceUrl, publisher: excerpt.institution, type: excerpt.collection };
}

function uniqueEvidence(excerpts: readonly EvidenceExcerpt[]): EvidenceExcerpt[] {
  return [...new Map(excerpts.map((excerpt) => [excerpt.id, excerpt])).values()];
}

function proposalIndices(proposals: readonly LiveModelProposal[], logEventId: string): IndexMetric[] {
  const valid = proposals.filter((proposal): proposal is LiveModelProposal & { indices: NonNullable<LiveModelProposal["indices"]> } => proposal.status === "valid" && proposal.indices !== undefined);
  if (valid.length === 0) return [];
  const average = (key: keyof NonNullable<LiveModelProposal["indices"]>) => Math.round(valid.reduce((sum, proposal) => sum + proposal.indices[key], 0) / valid.length);
  const detail = `Promedio simple de ${valid.length} propuesta${valid.length === 1 ? " disponible" : "s disponibles"}; revise cada salida en la pestaña Modelos.`;
  return [
    { id: "live-polarization", name: "Polarización", value: average("polarization"), max: 100, rubric: "Promedio de propuestas disponibles", justification: detail, heuristicLabel: "Referencia multi-modelo", logEventId },
    { id: "live-emotional-load", name: "Carga emocional", value: average("emotionalLoad"), max: 100, rubric: "Promedio de propuestas disponibles", justification: detail, heuristicLabel: "Referencia multi-modelo", logEventId },
    { id: "live-public-data-support", name: "Soporte de datos públicos", value: average("publicDataSupport"), max: 100, rubric: "Promedio de propuestas disponibles", justification: detail, heuristicLabel: "Referencia multi-modelo", logEventId },
  ];
}
