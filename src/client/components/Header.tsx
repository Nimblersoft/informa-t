import React from "react";

interface HeaderProps {
  caseId: string;
  caseLabel: string;
}

export const Header: React.FC<HeaderProps> = ({ caseId, caseLabel }) => {
  return (
    <header className="app-header" data-testid="app-header" role="banner">
      <div className="header-brand-group">
        <div className="brand-logo">
          <span className="brand-icon" aria-hidden="true">
            ⚖
          </span>
          <h1 className="brand-title" data-testid="brand-title">
            informa-t
          </h1>
        </div>
        <div
          className="case-identifier-badge"
          data-testid="case-id"
          aria-label={`Identificador del caso: Caso ${caseId.toUpperCase()}`}
        >
          Caso {caseId.toUpperCase()}
        </div>
        <div
          className="case-status-badge"
          data-testid="case-label"
          aria-label={`Etiqueta del caso: ${caseLabel}`}
        >
          {caseLabel}
        </div>
      </div>
      <div className="header-meta-group">
        <div
          className="readonly-indicator"
          data-testid="readonly-indicator"
          role="status"
          aria-label="Modo de revisión editorial (Solo lectura)"
        >
          <span className="indicator-dot" aria-hidden="true" />
          <span>Modo de revisión editorial (Solo lectura)</span>
        </div>
      </div>
    </header>
  );
};
