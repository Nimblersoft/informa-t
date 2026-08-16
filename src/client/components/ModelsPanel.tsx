import React from "react";
import type { SyntheticProposal } from "../../shared/contracts";

export interface LiveModelProposal {
  id: string;
  model: string;
  provider: string;
  status: "valid" | "failed";
  reviewFocus?: string;
  rationale?: string;
  uncertainty?: string;
  limitations?: readonly string[];
  supportingEvidenceIds?: readonly string[];
  contraryEvidenceIds?: readonly string[];
  indices?: { polarization: number; emotionalLoad: number; publicDataSupport: number };
  traceEventId: string;
}

interface ModelsPanelProps {
  proposals?: readonly SyntheticProposal[];
  liveProposals?: readonly LiveModelProposal[];
  onNavigateToLog?: (eventId: string) => void;
}

export const ModelsPanel: React.FC<ModelsPanelProps> = ({ proposals = [], liveProposals, onNavigateToLog }) => {
  const isLive = liveProposals !== undefined;

  return (
    <div className="tabpanel-content models-panel" data-testid="models-panel">
      <div className="panel-intro">
        <h3 className="panel-title">Propuestas de análisis automatizado</h3>
        <p className="panel-description">
          {isLive
            ? "Salidas completas de cada modelo para contraste editorial. No constituyen veredictos verificados."
            : "Respuestas preliminares emitidas por agentes sintéticos anónimos. Estas propuestas no tienen carácter vinculante ni constituyen veredictos verificados."}
        </p>
      </div>

      <div
        className="proposals-grid"
        role="list"
        aria-label="Lista de propuestas de modelos anónimos"
      >
        {!isLive && proposals.map((proposal, index) => (
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
        {isLive && liveProposals.length === 0 && <p className="empty-editorial-state">Las propuestas multi-modelo aparecerán aquí cuando estén disponibles.</p>}
        {isLive && liveProposals.map((proposal, index) => (
          <article
            key={proposal.id}
            className="proposal-card"
            data-testid={`live-proposal-card-${index}`}
            role="listitem"
          >
            <div className="proposal-card-header">
              <div className="proposal-badge-group">
                <span className="proposal-num">Propuesta 0{index + 1}</span>
                <span className="anonymity-badge">Ejecución en vivo</span>
              </div>
              <span className="placeholder-tag">{proposal.status === "valid" ? "Disponible" : "No disponible"}</span>
            </div>

            <div className="proposal-body">
              <h4 className="proposal-state-title">{proposal.reviewFocus ?? proposal.model}</h4>
              <p className="proposal-message">{proposal.rationale ?? proposal.uncertainty ?? "El modelo no entregó una propuesta utilizable."}</p>
            </div>

            <div className="proposal-metadata-list">
              <div className="meta-row"><span className="meta-key">Modelo:</span><span className="meta-val">{proposal.model}</span></div>
              <div className="meta-row"><span className="meta-key">Proveedor:</span><span className="meta-val">{proposal.provider}</span></div>
              {proposal.uncertainty && <div className="meta-row"><span className="meta-key">Incertidumbre:</span><span className="meta-val">{proposal.uncertainty}</span></div>}
              {proposal.supportingEvidenceIds && <div className="meta-row"><span className="meta-key">Evidencia de apoyo:</span><span className="meta-val">{proposal.supportingEvidenceIds.length}</span></div>}
              {proposal.contraryEvidenceIds && <div className="meta-row"><span className="meta-key">Evidencia contraria:</span><span className="meta-val">{proposal.contraryEvidenceIds.length}</span></div>}
              {proposal.indices && <div className="meta-row"><span className="meta-key">Índices:</span><span className="meta-val">Polarización {proposal.indices.polarization} · Carga emocional {proposal.indices.emotionalLoad} · Soporte público {proposal.indices.publicDataSupport}</span></div>}
            </div>

            {proposal.limitations && proposal.limitations.length > 0 && <div className="proposal-footer-notice"><span>Limitaciones: {proposal.limitations.join(" ")}</span></div>}
            {onNavigateToLog && <button type="button" className="btn-link-log" onClick={() => onNavigateToLog(proposal.traceEventId)}>Ver traza de la propuesta</button>}
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
