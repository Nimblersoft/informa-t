// # Spec: docs/specs/accessibility-shell.md

import React from "react";
import { LiveAnalysisPanel } from "./LiveAnalysisPanel";

export const LiveAnalysisHome: React.FC = () => (
  <div className="live-home" data-testid="live-home" data-ready="true">
    <header className="live-home-header">
      <div>
        <p className="compact-eyebrow">informa-t / análisis en vivo</p>
        <h1>Análisis contextual</h1>
        <p className="compact-header-copy">
          Pega una declaración o URL pública para seguir sus aseveraciones, fuentes y trazas sin recibir un veredicto automático.
        </p>
      </div>
      <a className="compact-full-review-link" href="/demo">
        Abrir caso A1 de demostración
      </a>
    </header>

    <main className="live-home-main">
      <LiveAnalysisPanel />
      <section className="compact-human-boundary" data-testid="live-human-boundary" aria-labelledby="live-boundary-title">
        <p className="compact-boundary-label">Límite editorial</p>
        <h2 id="live-boundary-title">La decisión sigue siendo humana</h2>
        <p>
          Las aseveraciones, fuentes, propuestas y comparaciones son insumos auditables. Una persona debe revisar la evidencia y decidir qué publicar.
        </p>
      </section>
    </main>
  </div>
);
