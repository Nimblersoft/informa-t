// # Spec: docs/specs/accessibility-shell.md
import React from "react";

export const PresentationPage: React.FC = () => {
  return (
    <div className="presentation-shell" data-testid="presentation-shell" data-ready="true">
      <header className="presentation-top-bar">
        <div className="presentation-brand-group">
          <a href="/" className="presentation-back-link" title="Volver a la página principal">
            <span aria-hidden="true">←</span> Inicio
          </a>
          <div className="presentation-title-group">
            <h1 className="presentation-page-title">informa-t · Presentación MediaHack II</h1>
            <span className="presentation-badge">Pitch Deck Interactivo</span>
          </div>
        </div>
        <div className="presentation-actions">
          <a href="/presentation/index.html" target="_blank" rel="noopener noreferrer" className="presentation-action-btn secondary">
            <span>Pantalla Completa</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <a href="/app" className="presentation-action-btn primary">
            <span>Abrir App en Vivo</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      </header>

      <main className="presentation-frame-container">
        <iframe
          src="/presentation/index.html"
          title="Presentación de Pitch informa-t MediaHack II"
          className="presentation-iframe"
          data-testid="presentation-iframe"
          allow="fullscreen"
        />
      </main>
    </div>
  );
};
