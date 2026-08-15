// # Spec: docs/specs/sse-analysis.md

import React, { useRef, useState } from "react";
import { streamAnalysis } from "../analysis-stream";
import type { AnalysisEvent, ClaimExtractedData } from "../../shared/analysis-events";

type Stage = "claims" | "evidence" | "models" | "consensus";

const STAGES: readonly { id: Stage; label: string }[] = [
  { id: "claims", label: "Aseveraciones" },
  { id: "evidence", label: "Evidencia" },
  { id: "models", label: "Propuestas" },
  { id: "consensus", label: "Comparación" },
];

interface LiveAnalysisPanelProps {
  onNavigateToLog?: (eventId: string) => void;
}

export const LiveAnalysisPanel: React.FC<LiveAnalysisPanelProps> = ({ onNavigateToLog }) => {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "partial" | "failed">("idle");
  const [stage, setStage] = useState<Stage | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const handleEvent = (event: AnalysisEvent) => {
    setEvents((current) => [...current, event]);
    if (event.type === "claim.extracted") setStage("claims");
    if (event.type === "evidence.retrieved") setStage("evidence");
    if (event.type === "model.completed" || event.type === "model.failed") setStage("models");
    if (event.type === "consensus.completed") setStage("consensus");
    if (event.type === "analysis.completed") setStatus(event.data.status);
  };

  const run = async () => {
    setError(null);
    setEvents([]);
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
  const evidence = events.filter((event): event is Extract<AnalysisEvent, { type: "evidence.retrieved" }> => event.type === "evidence.retrieved");
  const proposals = events.filter((event): event is Extract<AnalysisEvent, { type: "model.completed" | "model.failed" }> => event.type === "model.completed" || event.type === "model.failed");
  const consensus = events.filter((event): event is Extract<AnalysisEvent, { type: "consensus.completed" }> => event.type === "consensus.completed");
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
      {claims.length > 0 && <section className="analysis-results" aria-label="Aseveraciones extraídas"><h3>Aseveraciones extraídas</h3>{claims.map((claim, index) => <article key={`${claim.location?.start ?? claim.verbatimText}-${index}`} className="analysis-result-card"><p>{claim.verbatimText}</p>{claim.rationale && <p>{claim.rationale}</p>}<span>{claim.excluded ? "Excluida de propuestas" : "Lista para contraste"}</span></article>)}</section>}
      {evidence.length > 0 && <section className="analysis-results" aria-label="Evidencia recuperada"><h3>Evidencia recuperada</h3>{evidence.flatMap((event) => event.data.excerpts.map((excerpt) => <article key={excerpt.id} className="analysis-result-card"><a href={excerpt.sourceUrl} target="_blank" rel="noreferrer">{excerpt.title}</a><p>{excerpt.excerpt}</p><button type="button" className="btn-link-log" onClick={() => event.data.traceEventId && onNavigateToLog?.(event.data.traceEventId)}>Ver traza: {event.data.traceEventId ?? "no disponible"}</button></article>))}</section>}
      {proposals.length > 0 && <section className="analysis-results" aria-label="Propuestas no vinculantes"><h3>Propuestas no vinculantes</h3>{proposals.map((event, index) => <article key={`${event.id || event.type}-${index}`} className="analysis-result-card"><strong>{event.data.proposal.model}</strong><span>Proveedor: {event.data.proposal.provenance.provider} · {event.type === "model.failed" ? "No disponible" : "Disponible"}</span><p>{event.data.proposal.proposal?.reviewFocus ?? event.data.proposal.limitation}</p><button type="button" className="btn-link-log" onClick={() => onNavigateToLog?.(event.data.traceEventId)}>Ver traza: {event.data.traceEventId}</button></article>)}</section>}
      {consensus.length > 0 && <section className="analysis-results" aria-label="Comparación no vinculante"><h3>Comparación no vinculante</h3>{consensus.map((event) => <article key={event.id} className="analysis-result-card"><p>{event.data.consensus ? `Acuerdo reportado: ${event.data.consensus.agreement}` : "No se reportó acuerdo suficiente entre propuestas."}</p><span>{event.data.consensus?.reviewFocus ?? "La comparación queda pendiente de revisión humana."}</span><button type="button" className="btn-link-log" onClick={() => onNavigateToLog?.(event.data.traceEventId)}>Ver traza: {event.data.traceEventId}</button></article>)}</section>}
      {events.length > 0 && <section className="analysis-live-log" aria-label="Logs del análisis"><h3>Logs del análisis</h3>{events.map((event, index) => <article key={`${event.id || event.type}-${index}`} className="analysis-log-entry"><button type="button" className="btn-link-log" onClick={() => traceId(event) && onNavigateToLog?.(traceId(event) as string)}>{event.type}</button><span>Versión {event.data.pipelineVersion} · {event.data.durationMs} ms · Reintentos: {event.data.retries}</span><span>Uso: {event.data.usage ? JSON.stringify(event.data.usage) : "no reportado"}</span><span>Degradaciones: {event.data.degradations.length > 0 ? event.data.degradations.join("; ") : "ninguna"}</span></article>)}</section>}
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

function traceId(event: AnalysisEvent): string | undefined {
  return "traceEventId" in event.data ? event.data.traceEventId || undefined : undefined;
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
