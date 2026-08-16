// # Spec: docs/specs/sse-analysis.md

import React, { useRef, useState } from "react";
import { streamAnalysis } from "../analysis-stream";
import type { AnalysisEvent, ClaimExtractedData } from "../../shared/analysis-events";
import type { TraceEvent } from "../../shared/contracts";

type Stage = "claims" | "evidence" | "models" | "consensus";

const STAGES: readonly { id: Stage; label: string }[] = [
  { id: "claims", label: "Aseveraciones" },
  { id: "evidence", label: "Evidencia" },
  { id: "models", label: "Propuestas" },
  { id: "consensus", label: "Comparación" },
];

export const DEFAULT_ANALYSIS_INPUT = "Según los últimos reportes oficiales del INEC, la pobreza por ingresos a nivel nacional se ubicó en el 25,5% en junio de 2025, mientras que la pobreza extrema alcanzó el 8,4%.";

interface LiveAnalysisPanelProps {
  onTraceEvent?: (event: TraceEvent) => void;
  onAnalysisReset?: () => void;
  onAnalysisEvent?: (event: AnalysisEvent) => void;
}

export const LiveAnalysisPanel: React.FC<LiveAnalysisPanelProps> = ({ onTraceEvent, onAnalysisReset, onAnalysisEvent }) => {
  const [input, setInput] = useState(DEFAULT_ANALYSIS_INPUT);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "partial" | "failed">("idle");
  const [stage, setStage] = useState<Stage | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const handleEvent = (event: AnalysisEvent) => {
    setEvents((current) => [...current, event]);
    onAnalysisEvent?.(event);
    if (event.type === "claim.extracted") onTraceEvent?.(event.data.traceEvent);
    if (event.type === "claim.extracted") setStage("claims");
    if (event.type === "evidence.retrieved") setStage("evidence");
    if (event.type === "model.completed" || event.type === "model.failed") setStage("models");
    if (event.type === "consensus.completed") setStage("consensus");
    if (event.type === "analysis.completed") setStatus(event.data.status);
  };

  const run = async () => {
    setError(null);
    setEvents([]);
    onAnalysisReset?.();
    setStage(null);
    setStatus("running");
    controller.current = new AbortController();
    try {
      const isUrl = /^https?:\/\/\S+$/i.test(input.trim());
      await streamAnalysis(isUrl ? { url: input.trim(), signal: controller.current.signal, onEvent: handleEvent } : { text: input, signal: controller.current.signal, onEvent: handleEvent });
    } catch (cause) {
      if (controller.current?.signal.aborted) return;
      setStatus("failed");
      setError(cause instanceof Error ? cause.message : "No fue posible iniciar el análisis.");
    }
  };

  const cancel = () => controller.current?.abort();
  const completedEvents = events.filter((event) => event.type === "analysis.completed");
  const completion = completedEvents.at(-1) as Extract<AnalysisEvent, { type: "analysis.completed" }> | undefined;
  const extracted = latestClaims(events);
  const claims = (extracted?.claims ?? completion?.data.claims.map((claim) => claim.claim) ?? []).filter((claim) => claim.location !== undefined);
  const hasGroundedEvidence = completion?.data.claims.some((item) => !item.claim.excluded && item.evidence.length > 0) ?? false;
  const effectiveStatus = status === "completed" && !hasGroundedEvidence ? "partial" : status;
  const limitations = completion?.data.limitations.length
    ? completion.data.limitations
    : status === "completed" && !hasGroundedEvidence
      ? ["No se puede marcar el análisis como completo porque no quedó evidencia oficial relevante."]
      : [];

  return (
    <section className="live-analysis-panel" data-testid="live-analysis-panel" aria-labelledby="live-analysis-title">
      <div className="panel-intro">
        <h2 id="live-analysis-title" className="panel-title">Análisis progresivo</h2>
      <p className="panel-description">Pega una declaración, transcripción o URL de noticia para revisar sus aseveraciones con fuentes oficiales.</p>
      </div>
      <section className="analysis-orientation" data-testid="analysis-orientation" aria-label="Ruta de lectura editorial">
        <p className="analysis-orientation-intro">La salida en vivo se lee por capas; cada capa puede quedar pendiente o degradarse sin convertirse en un veredicto.</p>
        <ul>
          <li><strong>Evidencia</strong><span>Afirmaciones y fuentes primarias recuperadas.</span></li>
          <li><strong>Estado de modelos</strong><span>Propuestas disponibles o no disponibles.</span></li>
          <li><strong>Trazabilidad</strong><span>Eventos, versiones y degradaciones observables.</span></li>
          <li><strong>Decisión humana</strong><span>La publicación queda en manos editoriales.</span></li>
        </ul>
      </section>
      <label className="form-label" htmlFor="analysis-text-input">Pegar texto o URL de noticia</label>
      <textarea
        id="analysis-text-input"
        data-testid="analysis-text-input"
        className="form-textarea analysis-input"
        rows={5}
        maxLength={20_000}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Texto de al menos 20 caracteres o https://..."
      />
      <div className="analysis-actions">
        <button type="button" className="btn-primary" data-testid="analysis-submit" disabled={status === "running" || !isValidInput(input)} onClick={() => void run()}>
          Analizar entrada
        </button>
        {status === "running" && <button type="button" className="btn-secondary" data-testid="analysis-cancel" onClick={cancel}>Cancelar</button>}
        {completion && <button type="button" className="btn-secondary" data-testid="analysis-download" onClick={() => downloadAnalysis(events, completion.data.analysisId)}>Descargar resultados parciales</button>}
      </div>
      {error && <p className="analysis-error" role="alert">{error}</p>}
      {status !== "idle" && (
        <div className="analysis-progress" data-testid="analysis-progress" aria-live="polite">
          <p className="analysis-status">Estado: {effectiveStatus === "running" ? "analizando" : effectiveStatus === "partial" ? "parcial" : effectiveStatus === "completed" ? "completo" : "fallido"}</p>
          <ol className="analysis-stage-list">
            {STAGES.map((item) => <li key={item.id} className={stage === item.id ? "active" : stage && STAGES.findIndex((stageItem) => stageItem.id === stage) > STAGES.findIndex((stageItem) => stageItem.id === item.id) ? "complete" : ""} data-testid={`analysis-stage-${item.id}`}>{item.label}</li>)}
          </ol>
        </div>
      )}
      {limitations.length > 0 && <section className="analysis-limitations" data-testid="analysis-limitations" aria-label="Limitaciones del análisis"><h3>Limitaciones</h3><ul>{limitations.map((limitation, index) => <li key={`${limitation}-${index}`}>{limitation}</li>)}</ul></section>}
      {claims.length > 0 && <p className="analysis-output-notice">El resultado se despliega en los extractos, las pestañas de evidencia y modelos, y la bitácora editorial de esta misma vista.</p>}
       <p className="analysis-audit-notice">La aseveración y su decisión se conservan durante 7 días para auditoría interna; el texto fuente completo no se guarda.</p>
      <p className="analysis-disclaimer">Las propuestas y su comparación son insumos no vinculantes. La decisión editorial siempre la toma una persona.</p>
    </section>
  );
};

function latestClaims(events: readonly AnalysisEvent[]): ClaimExtractedData | undefined {
  return events.filter((event): event is Extract<AnalysisEvent, { type: "claim.extracted" }> => event.type === "claim.extracted").at(-1)?.data;
}

function isValidInput(value: string): boolean {
  const input = value.trim();
  if (/^https?:\/\/\S+$/i.test(input)) {
    try {
      const url = new URL(input);
      return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
    } catch {
      return false;
    }
  }
  return input.length >= 20 && input.length <= 20_000;
}

function downloadAnalysis(events: readonly AnalysisEvent[], analysisId: string): void {
  const blob = new Blob([JSON.stringify({ analysisId, events }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${analysisId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
