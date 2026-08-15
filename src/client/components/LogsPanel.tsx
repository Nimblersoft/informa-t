import React, { useEffect, useRef, useState } from "react";
import type {
  SourceCitation,
  TraceEvent,
  SyntheticProposal,
} from "../../shared/contracts";

interface LogsPanelProps {
  events: readonly TraceEvent[];
  citations: readonly SourceCitation[];
  proposals: readonly SyntheticProposal[];
  focusedEventId: string | null;
  onClearFocusedEvent: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({
  events,
  citations,
  proposals,
  focusedEventId,
  onClearFocusedEvent,
}) => {
  const [selectedStage, setSelectedStage] = useState<string>("Todas");
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(["evt-ingesta", "evt-extraccion", "evt-analisis", "evt-consenso"]),
  );

  const eventRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Focus and scroll when focusedEventId changes
  useEffect(() => {
    if (focusedEventId) {
      // Ensure stage filter doesn't hide the focused event
      const targetEvent = events.find((e) => e.id === focusedEventId);
      if (targetEvent && selectedStage !== "Todas" && targetEvent.stage !== selectedStage) {
        setSelectedStage("Todas");
      }

      // Ensure the event is expanded
      setExpandedEventIds((prev) => {
        const next = new Set(prev);
        next.add(focusedEventId);
        return next;
      });

      const element = eventRefs.current.get(focusedEventId);
      if (element) {
        element.scrollIntoView?.({ behavior: "smooth", block: "center" });
        element.focus();
      }
    }
  }, [focusedEventId, events, selectedStage]);

  const toggleEventExpansion = (id: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredEvents =
    selectedStage === "Todas"
      ? events
      : events.filter((evt) => evt.stage === selectedStage);

  return (
    <div className="tabpanel-content logs-panel" data-testid="logs-panel">
      <div className="panel-intro">
        <h3 className="panel-title">Trazabilidad, auditoría y fuentes primarias</h3>
        <p className="panel-description">
          Registro inmutable de eventos de procesamiento, comparación de propuestas sintéticas y enlaces directos a las fuentes originales.
        </p>
      </div>

      {/* SECTION 1: STAGE FILTER & TRACE EVENTS */}
      <section className="logs-section" aria-label="Línea de tiempo de eventos">
        <div className="logs-filter-bar">
          <label htmlFor="stage-filter-select" className="filter-label">
            Filtrar por etapa:
          </label>
          <select
            id="stage-filter-select"
            className="stage-filter-select"
            data-testid="stage-filter"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            <option value="Todas">Todas las etapas</option>
            <option value="Ingesta">Ingesta</option>
            <option value="Extracción">Extracción</option>
            <option value="Análisis">Análisis</option>
            <option value="Consenso">Consenso</option>
          </select>
        </div>

        <div className="events-timeline" role="feed" aria-label="Eventos de auditoría">
          {filteredEvents.map((evt) => {
            const isExpanded = expandedEventIds.has(evt.id);
            const isFocused = evt.id === focusedEventId;

            return (
              <article
                key={evt.id}
                ref={(node) => {
                  if (node) {
                    eventRefs.current.set(evt.id, node);
                  } else {
                    eventRefs.current.delete(evt.id);
                  }
                }}
                tabIndex={0}
                className={`event-card ${isFocused ? "highlighted" : ""}`}
                data-testid={`event-card-${evt.id}`}
                aria-labelledby={`event-title-${evt.id}`}
              >
                <div className="event-card-header">
                  <div className="event-stage-group">
                    <span className={`stage-tag stage-${evt.stage.toLowerCase()}`}>
                      {evt.stage}
                    </span>
                    <span className="event-time">{evt.timestamp}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-toggle-event"
                    aria-expanded={isExpanded}
                    aria-controls={`event-details-${evt.id}`}
                    data-testid={`toggle-event-${evt.id}`}
                    onClick={() => toggleEventExpansion(evt.id)}
                  >
                    {isExpanded ? "Ocultar detalles ▲" : "Ver detalles ▼"}
                  </button>
                </div>

                <h4 id={`event-title-${evt.id}`} className="event-title">
                  {evt.title}
                </h4>
                <p className="event-description">{evt.description}</p>

                {isExpanded && (
                  <div
                    id={`event-details-${evt.id}`}
                    className="event-expanded-details"
                    data-testid={`event-details-${evt.id}`}
                  >
                    <div className="detail-row">
                      <span className="detail-label">Estado de ejecución:</span>
                      <span className="detail-value status-success">{evt.status}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Detalle técnico:</span>
                      <span className="detail-value">{evt.details}</span>
                    </div>
                    <div className="detail-row hash-row">
                      <span className="detail-label">Hash canónico (SHA-256):</span>
                      <code className="canonical-hash" data-testid={`hash-${evt.id}`}>
                        {evt.canonicalHash}
                      </code>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: SIDE-BY-SIDE PROPOSAL COMPARISON */}
      <section
        className="logs-section comparison-section"
        aria-label="Comparación paralela de propuestas"
        data-testid="side-by-side-comparison"
      >
        <div className="section-subtitle-bar">
          <h4 className="section-subheading">Comparación paralela de propuestas</h4>
          <span className="comparison-badge">Matriz de contraste no vinculante</span>
        </div>
        <div className="proposals-comparison-columns">
          {proposals.map((prop, idx) => (
            <div
              key={`comp-prop-${idx}`}
              className="comparison-col"
              data-testid={`comparison-col-${idx}`}
            >
              <div className="col-header">
                <span className="col-title">Propuesta 0{idx + 1}</span>
                <span className="col-status">Sintética</span>
              </div>
              <p className="col-content">{prop.message}</p>
              <div className="col-footer">
                <span className="col-attribution">
                  {prop.attributed ? "Atribuida" : "Sin atribución a modelo o autor"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: AUDITABLE PRIMARY SOURCE CITATIONS */}
      <section
        className="logs-section citations-section"
        aria-label="Citas y fuentes primarias auditables"
        data-testid="citations-section"
      >
        <div className="section-subtitle-bar">
          <h4 className="section-subheading">Citas y fuentes primarias auditables</h4>
          <span className="citations-badge">Fuentes documentales abiertas</span>
        </div>
        <div className="citations-list" role="list">
          {citations.map((cite) => (
            <div
              key={cite.id}
              className="citation-card"
              data-testid={`citation-${cite.id}`}
            >
              <div className="citation-info">
                <span className="citation-type-tag">{cite.type}</span>
                <h5 className="citation-title">{cite.title}</h5>
                <span className="citation-publisher">
                  Publicado por: {cite.publisher}
                </span>
              </div>
              <div className="citation-link-box">
                <a
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="citation-external-link"
                  data-testid={`link-cite-${cite.id}`}
                  aria-label={`Abrir fuente oficial: ${cite.title}`}
                >
                  Abrir fuente oficial ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
