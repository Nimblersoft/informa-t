import React from "react";
import type { ExcerptItem, RelatedContextItem } from "../../shared/contracts";

interface ExtractStreamProps {
  excerpts: readonly ExcerptItem[];
  relatedContext: readonly RelatedContextItem[];
  activeExcerptId: string;
  onSelectExcerpt: (id: string) => void;
  onNavigateToLog: (logEventId: string) => void;
}

export const ExtractStream: React.FC<ExtractStreamProps> = ({
  excerpts,
  relatedContext,
  activeExcerptId,
  onSelectExcerpt,
  onNavigateToLog,
}) => {
  return (
    <section
      className="extract-stream-container"
      aria-label="Panel de extractos y evidencia"
      data-testid="extract-stream"
    >
      <div className="stream-header">
        <h2 className="stream-title">Extractos de evidencia</h2>
        <p className="stream-subtitle">
          Afirmaciones identificadas en el discurso público sujetas a contraste documental.
        </p>
      </div>

      {/* REGION 1: Primary Evidence (Strictly Separated) */}
      <div
        className="evidence-section primary-evidence-region"
        data-testid="primary-evidence-section"
      >
        <div className="section-label-bar">
          <span className="section-dot primary" aria-hidden="true" />
          <h3 className="section-heading">Evidencia primaria</h3>
        </div>
        <div className="excerpts-list" aria-label="Lista de extractos primarios">
          {excerpts.length === 0 && <p className="empty-editorial-state">Las aseveraciones extraídas aparecerán aquí al iniciar el análisis.</p>}
          {excerpts.map((item, index) => {
            const isSelected = item.id === activeExcerptId;
            return (
              <article
                key={item.id}
                className={`excerpt-card ${isSelected ? "selected" : ""}`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected ? "true" : "false"}
                  aria-label={`Extracto ${index + 1}: ${item.title}`}
                  data-testid={`excerpt-item-${item.id}`}
                  className="excerpt-card-main"
                  onClick={() => onSelectExcerpt(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectExcerpt(item.id);
                    }
                  }}
                >
                  <div className="excerpt-card-header">
                    <span className="excerpt-index">Extracto 0{index + 1}</span>
                    <span className="excerpt-source-badge">{item.sourceType}</span>
                  </div>
                  <h4 className="excerpt-item-title">{item.title}</h4>
                  <blockquote className="excerpt-quote">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                  <div className="excerpt-meta">
                    <span className="meta-speaker">{item.speaker}</span>
                    <span className="meta-sep" aria-hidden="true">•</span>
                    <span className="meta-time">{item.timestamp}</span>
                  </div>
                </div>
                <div className="excerpt-footer">
                  <button
                    type="button"
                    className="btn-link-log"
                    data-testid={`btn-log-${item.id}`}
                    aria-label={`Ver traza en Logs para ${item.title}`}
                    onClick={() => onNavigateToLog(item.logEventId)}
                  >
                    Ver traza
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* REGION 2: Related Context (Strictly Separated, Never Interleaved) */}
      <div
        className="evidence-section related-context-region"
        data-testid="related-context-section"
      >
        <div className="section-label-bar">
          <span className="section-dot context" aria-hidden="true" />
          <h3 className="section-heading">Contexto relacionado</h3>
        </div>
        <div className="context-list" aria-label="Lista de antecedentes y contexto">
          {relatedContext.length === 0 && <p className="empty-editorial-state">La evidencia oficial recuperada aparecerá como contexto relacionado.</p>}
          {relatedContext.map((item) => (
            <article
              key={item.id}
              className="context-card"
              data-testid={`context-item-${item.id}`}
            >
              <h4 className="context-item-title">{item.title}</h4>
              <p className="context-description">{item.description}</p>
              <div className="context-reference">
                <span className="reference-label">Referencia normativa:</span>
                <span className="reference-value">{item.reference}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
