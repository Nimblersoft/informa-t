import React from "react";

interface HeaderProps {
  caseId: string;
  caseLabel: string;
}

export const Header: React.FC<HeaderProps> = ({ caseId, caseLabel }) => {
  return (
    <header className="app-header" data-testid="app-header">
      <div className="header-brand-group">
        <div className="brand-logo">
          <span className="brand-icon" aria-hidden="true">
            ⚖
          </span>
          <span className="brand-title" data-testid="brand-title">
            informa-t
          </span>
        </div>
        <div className="case-identifier-badge" data-testid="case-id">
          Caso {caseId.toUpperCase()}
        </div>
        <div className="case-status-badge" data-testid="case-label">
          {caseLabel}
        </div>
      </div>
      <div className="header-meta-group">
        <div className="readonly-indicator" data-testid="readonly-indicator">
          <span className="indicator-dot" aria-hidden="true" />
          <span>Modo de revisión editorial (Solo lectura)</span>
        </div>
      </div>
    </header>
  );
};
