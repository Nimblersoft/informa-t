import React from "react";
import type { IndexMetric } from "../../shared/contracts";

interface EvidencePanelProps {
  indices: readonly IndexMetric[];
  onNavigateToLog: (logEventId: string) => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  indices,
  onNavigateToLog,
}) => {
  return (
    <div className="tabpanel-content evidence-panel" data-testid="evidence-panel">
      <div className="panel-intro">
        <h3 className="panel-title">Señales analíticas e índices heurísticos</h3>
        <p className="panel-description">
          Métricas cuantitativas calculadas automáticamente sobre el extracto seleccionado. 
          Estas cifras constituyen insumos de consulta y no reemplazan la valoración crítica del equipo editorial.
        </p>
      </div>

      <div className="indices-grid" role="list" aria-label="Lista de índices heurísticos">
        {indices.map((metric) => (
          <article
            key={metric.id}
            className="index-card"
            data-testid={`index-card-${metric.id}`}
          >
            <div className="index-card-top">
              <div className="index-name-group">
                <h4 className="index-name">{metric.name}</h4>
                <div className="heuristic-badge" data-testid={`heuristic-label-${metric.id}`}>
                  {metric.heuristicLabel}
                </div>
              </div>
              <div className="index-score-box" data-testid={`index-score-${metric.id}`}>
                <span className="score-number">{metric.value}</span>
                <span className="score-denom">/ {metric.max}</span>
              </div>
            </div>

            <div className="index-meter-track" aria-hidden="true">
              <div
                className="index-meter-fill"
                style={{ transform: `scaleX(${metric.value / 100})` }}
              />
            </div>

            <div className="index-rubric-box">
              <span className="rubric-tag">Criterio</span>
              <p className="rubric-text">{metric.rubric}</p>
            </div>

            <div className="index-justification-box">
              <span className="justification-tag">Justificación técnica</span>
              <p className="justification-text">{metric.justification}</p>
            </div>

            <div className="index-card-actions">
              <button
                type="button"
                className="btn-inspect-trace"
                data-testid={`btn-trace-${metric.id}`}
                onClick={() => onNavigateToLog(metric.logEventId)}
              >
                Ver evento de trazabilidad en Logs →
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
