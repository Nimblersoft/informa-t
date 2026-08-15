import React from "react";
import type { SyntheticProposal } from "../../shared/contracts";

interface ModelsPanelProps {
  proposals: readonly SyntheticProposal[];
}

export const ModelsPanel: React.FC<ModelsPanelProps> = ({ proposals }) => {
  return (
    <div className="tabpanel-content models-panel" data-testid="models-panel">
      <div className="panel-intro">
        <h3 className="panel-title">Propuestas de análisis automatizado</h3>
        <p className="panel-description">
          Respuestas preliminares emitidas por agentes sintéticos anónimos. 
          Estas propuestas no tienen carácter vinculante ni constituyen veredictos verificados.
        </p>
      </div>

      <div
        className="proposals-grid"
        role="list"
        aria-label="Lista de propuestas de modelos anónimos"
      >
        {proposals.map((proposal, index) => (
          <article
            key={`proposal-${index}`}
            className="proposal-card"
            data-testid={`proposal-card-${index}`}
            role="listitem"
          >
            <div className="proposal-card-header">
              <div className="proposal-badge-group">
                <span className="proposal-num">Propuesta 0{index + 1}</span>
                <span
                  className="anonymity-badge"
                  data-testid={`proposal-anon-${index}`}
                >
                  Anónima / Sin atribución
                </span>
              </div>
              <span className="placeholder-tag">Insumo sintético</span>
            </div>

            <div className="proposal-body">
              <h4 className="proposal-state-title">Estado de la propuesta</h4>
              <p className="proposal-message" data-testid={`proposal-msg-${index}`}>
                {proposal.message}
              </p>
            </div>

            <div className="proposal-metadata-list">
              <div className="meta-row">
                <span className="meta-key">Atribución a modelo:</span>
                <span className="meta-val">
                  {proposal.attributed ? "Atribuida" : "Ninguna (no atribuida)"}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Naturaleza del registro:</span>
                <span className="meta-val">
                  {proposal.placeholder ? "Marcador de posición sintético" : "Registro real"}
                </span>
              </div>
            </div>

            <div className="proposal-footer-notice">
              <span className="notice-icon" aria-hidden="true">ℹ</span>
              <span>Propuesta independiente para evaluación comparativa en redacción.</span>
            </div>
          </article>
        ))}
      </div>

      <div
        className="models-disclaimer-card"
        data-testid="models-disclaimer"
        role="note"
        aria-label="Aviso de control editorial humano"
      >
        <h4 className="disclaimer-title">Principio de control editorial humano</h4>
        <p className="disclaimer-text">
          Cada propuesta técnica es evaluada exclusivamente como insumo de contraste documental. 
          Ningún algoritmo ni modelo de inteligencia artificial emite resoluciones de verificación pública en esta plataforma.
        </p>
      </div>
    </div>
  );
};
