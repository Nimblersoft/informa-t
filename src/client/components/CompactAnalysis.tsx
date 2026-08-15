// # Spec: docs/specs/accessibility-shell.md

import React from "react";
import { LiveAnalysisPanel } from "./LiveAnalysisPanel";

export const CompactAnalysis: React.FC = () => (
  <div className="compact-shell" data-testid="compact-shell" data-ready="true">
    <header className="compact-header" data-testid="compact-header">
      <div>
        <p className="compact-eyebrow">informa-t / análisis contextual</p>
        <h1>Vista compacta</h1>
        <p className="compact-header-copy">
          Contrasta una URL pública o texto pegado con evidencia primaria, sin emitir un veredicto automático.
        </p>
      </div>
      <nav className="compact-route-links" aria-label="Recorridos relacionados">
        <a className="compact-full-review-link" href="/demo">
          Abrir revisión completa
        </a>
        <a className="compact-walkthrough-link" href="/walkthrough">
          Previsualización extensión de navegador
        </a>
      </nav>
    </header>

    <main className="compact-main">
      <LiveAnalysisPanel />
      <section className="compact-human-boundary" data-testid="compact-human-boundary" aria-labelledby="compact-boundary-title">
        <p className="compact-boundary-label">Límite editorial</p>
        <h2 id="compact-boundary-title">La decisión sigue siendo humana</h2>
        <p>
          Las aseveraciones, fuentes, propuestas y comparaciones son insumos auditables. Una persona debe revisar la evidencia y decidir qué publicar.
        </p>
      </section>
    </main>
  </div>
);
