// # Spec: docs/specs/accessibility-shell.md
import React, { useState } from "react";

type VariantKey = "extracts" | "meters" | "contrast" | "audit";
type VerdictType = "true" | "misleading" | "false" | "opinion" | null;

interface ExtractFixture {
  id: number;
  title: string;
  source: string;
  quote: string;
  verdict: VerdictType;
  officialSource: {
    name: string;
    doc: string;
    page: string;
    hash: string;
    url: string;
  };
  intent: {
    polarization: number;
    emotionalLoad: number;
    factualSupport: number;
  };
  questions: Array<{ q: string; ans: string; status: "match" | "conflict" | "unsupported" }>;
  notes: string;
}

const FIXTURES: ExtractFixture[] = [
  {
    id: 1,
    title: "Cifras de Pobreza Nacional (INEC)",
    source: "Debate Presidencial · Intervención Minuto 14:20",
    quote: "«Según los últimos reportes oficiales del INEC, la pobreza por ingresos a nivel nacional se ubicó en el 25,5% en junio de 2025, mientras que la pobreza extrema alcanzó el 8,4%.»",
    verdict: "true",
    officialSource: {
      name: "Instituto Nacional de Estadística y Censos (INEC)",
      doc: "Boletín Técnico ENEMDU - Pobreza y Desigualdad (Junio 2025)",
      page: "Página 12, Tabla 2.1",
      hash: "8f4a1c7e92b3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
      url: "https://www.ecuadorencifras.gob.ec",
    },
    intent: {
      polarization: 18,
      emotionalLoad: 24,
      factualSupport: 94,
    },
    questions: [
      { q: "¿La cifra coincide con el reporte oficial?", ans: "Coincidencia exacta (25,5%)", status: "match" },
      { q: "¿El periodo temporal es el correcto?", ans: "Junio 2025 oficial", status: "match" },
      { q: "¿Existe omisión de contexto crítico?", ans: "Ninguna omisión detectada", status: "match" },
    ],
    notes: "Datos verificados contra el boletín oficial de INEC. Las cifras citadas de pobreza general (25.5%) y extrema (8.4%) corresponden exactamente a la publicación de junio 2025.",
  },
  {
    id: 2,
    title: "Propuesta de Dolarización Digital Obligatoria",
    source: "Cadena Radial Guayaquil · Minuto 08:45",
    quote: "«El plan de gobierno del binomio opositor contempla la dolarización digital obligatoria y la supresión del dinero en efectivo en 90 días.»",
    verdict: "false",
    officialSource: {
      name: "Consejo Nacional Electoral (CNE)",
      doc: "Plan de Trabajo Plurianual 2025-2029 (Inscripción Oficial)",
      page: "Eje Económico, Pág. 34-38",
      hash: "3b9a7f2e1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
      url: "https://cne.gob.ec",
    },
    intent: {
      polarization: 88,
      emotionalLoad: 82,
      factualSupport: 12,
    },
    questions: [
      { q: "¿Figura la propuesta en el plan CNE?", ans: "No consta en el documento oficial", status: "conflict" },
      { q: "¿Hay mención a supresión de efectivo?", ans: "Inexistente en el plan", status: "conflict" },
      { q: "¿Cita fuentes primarias comprobables?", ans: "Sin respaldo documental", status: "unsupported" },
    ],
    notes: "Revisión exhaustiva del plan oficial inscrito ante el CNE: el eje económico habla de interoperabilidad de medios de pago, pero en ninguna parte menciona supresión de efectivo ni plazos de 90 días.",
  },
  {
    id: 3,
    title: "Caída de Inversión Extranjera Directa (BCE)",
    source: "Entrevista en Canal Televisivo · Minuto 22:10",
    quote: "«En el último trimestre la inversión extranjera directa en el país se desplomó un 80%, marcando el peor registro en dos décadas.»",
    verdict: "misleading",
    officialSource: {
      name: "Banco Central del Ecuador (BCE)",
      doc: "Informe de Balanza de Pagos e Inversión Extranjera Directa",
      page: "Sección 4: Flujos de Capital, Pág. 19",
      hash: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
      url: "https://bce.fin.ec",
    },
    intent: {
      polarization: 64,
      emotionalLoad: 70,
      factualSupport: 38,
    },
    questions: [
      { q: "¿La cifra del 80% es real?", ans: "Hubo caída de 14.2%, no del 80%", status: "conflict" },
      { q: "¿Es el peor registro en dos décadas?", ans: "2020 registró niveles más bajos", status: "conflict" },
      { q: "¿Existe tendencia a la baja?", ans: "Sí, desaceleración trimestral real", status: "match" },
    ],
    notes: "El hablante exagera la cifra multiplicándola por más de cinco (14.2% real vs 80% alegado). Si bien hay desaceleración, la afirmación desfigura la magnitud real.",
  },
];

export const PrototypePreview: React.FC = () => {
  const [activeVariant, setActiveVariant] = useState<VariantKey>("extracts");
  const [selectedExtractId, setSelectedExtractId] = useState<number>(1);
  const [verdicts, setVerdicts] = useState<Record<number, VerdictType>>({
    1: "true",
    2: "false",
    3: "misleading",
  });
  const [notes, setNotes] = useState<Record<number, string>>({
    1: FIXTURES[0].notes,
    2: FIXTURES[1].notes,
    3: FIXTURES[2].notes,
  });
  const [activeModal, setActiveModal] = useState<"claimReview" | "jti" | "trust" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentFixture = FIXTURES.find((f) => f.id === selectedExtractId) ?? FIXTURES[0];
  const currentVerdict = verdicts[currentFixture.id];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleSetVerdict = (v: VerdictType) => {
    setVerdicts((prev) => ({ ...prev, [currentFixture.id]: v }));
    const labels: Record<string, string> = {
      true: "Verdadero",
      misleading: "Engañoso / Impreciso",
      false: "Falso",
      opinion: "Opinión / Incomprobable",
    };
    triggerToast(`Veredicto actualizado para Extracto #${currentFixture.id}: ${v ? labels[v] : "Sin veredicto"}`);
  };

  const copyClaimReviewJson = () => {
    triggerToast("Schema.org ClaimReview JSON-LD copiado al portapapeles");
  };

  return (
    <div className="prototype-preview-shell" data-testid="prototype-shell" data-ready="true">
      {/* Top Header */}
      <header className="proto-header" data-testid="proto-header">
        <div className="proto-brand">
          <a href="/" className="proto-logo">
            <span className="proto-logo-icon">⚖</span>
            <span>informa-t</span>
          </a>
          <span className="proto-badge">Previsualización de Prototipo Visual</span>
          <span className="proto-subbadge">0 llamadas API · Fixtures Mínimos</span>
        </div>

        <nav className="proto-nav" aria-label="Navegación de prototipo">
          <a href="/" className="proto-nav-link">
            ← Landing Page
          </a>
          <a href="/presentation" className="proto-nav-link">
            Presentación
          </a>
          <a href="/app" className="proto-nav-link proto-nav-cta">
            🚀 Probar App en Vivo (/app)
          </a>
        </nav>
      </header>

      {/* Variant Selector Tabs */}
      <div className="proto-variant-bar" role="toolbar" aria-label="Variantes del prototipo">
        <div className="proto-variant-label">Vista de demostración:</div>
        <div className="proto-variant-buttons" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeVariant === "extracts"}
            className={`proto-variant-btn ${activeVariant === "extracts" ? "active" : ""}`}
            onClick={() => setActiveVariant("extracts")}
            data-testid="variant-btn-extracts"
          >
            📋 A: Descomposición de Extractos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeVariant === "meters"}
            className={`proto-variant-btn ${activeVariant === "meters" ? "active" : ""}`}
            onClick={() => setActiveVariant("meters")}
            data-testid="variant-btn-meters"
          >
            📊 B: Medidores de Intención
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeVariant === "contrast"}
            className={`proto-variant-btn ${activeVariant === "contrast" ? "active" : ""}`}
            onClick={() => setActiveVariant("contrast")}
            data-testid="variant-btn-contrast"
          >
            🏛️ C: Contraste con Fuentes Primarias
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeVariant === "audit"}
            className={`proto-variant-btn ${activeVariant === "audit" ? "active" : ""}`}
            onClick={() => setActiveVariant("audit")}
            data-testid="variant-btn-audit"
          >
            🔒 D: Trazabilidad & Estándares
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="proto-main">
        {/* Left Column: Claims Feed */}
        <aside className="proto-sidebar">
          <div className="proto-sidebar-header">
            <h2 className="proto-sidebar-title">Extractos Atómicos Extraídos</h2>
            <span className="proto-count-badge">3 aseveraciones</span>
          </div>

          <div className="proto-extract-list" role="list">
            {FIXTURES.map((fixture) => {
              const v = verdicts[fixture.id];
              const isSelected = fixture.id === currentFixture.id;
              return (
                <button
                  key={fixture.id}
                  type="button"
                  role="listitem"
                  onClick={() => setSelectedExtractId(fixture.id)}
                  className={`proto-extract-card ${isSelected ? "selected" : ""}`}
                  data-testid={`proto-extract-${fixture.id}`}
                >
                  <div className="proto-card-top">
                    <span className="proto-card-id">#{fixture.id}</span>
                    <span className="proto-card-source">{fixture.title}</span>
                    {v && <span className={`proto-card-vtag v-${v}`}>{v.toUpperCase()}</span>}
                  </div>
                  <p className="proto-card-quote">{fixture.quote}</p>
                </button>
              );
            })}
          </div>

          <div className="proto-standards-links">
            <button type="button" onClick={() => setActiveModal("claimReview")} className="proto-modal-btn">
              <span>📜 Schema.org ClaimReview JSON-LD</span>
            </button>
            <button type="button" onClick={() => setActiveModal("jti")} className="proto-modal-btn">
              <span>🛡️ Estándar JTI (Reporters Without Borders)</span>
            </button>
            <button type="button" onClick={() => setActiveModal("trust")} className="proto-modal-btn">
              <span>✨ The Trust Project Indicators</span>
            </button>
          </div>
        </aside>

        {/* Right Area: Dynamic Variant Panel */}
        <section className="proto-detail-panel" aria-live="polite">
          {/* Header of the active extract */}
          <div className="proto-detail-header">
            <div>
              <span className="proto-detail-eyebrow">Extracto Activo #{currentFixture.id}</span>
              <h1 className="proto-detail-title">{currentFixture.title}</h1>
              <p className="proto-detail-meta">{currentFixture.source}</p>
            </div>
            <div className="proto-detail-citation-badge">
              <span>Fuente Oficial Cotejada:</span>
              <strong>{currentFixture.officialSource.name}</strong>
            </div>
          </div>

          {/* Blockquote with verbatim text */}
          <div className="proto-quote-box">
            <span className="proto-quote-icon">“</span>
            <p className="proto-quote-text">{currentFixture.quote}</p>
          </div>

          {/* Variant Content */}
          {activeVariant === "extracts" && (
            <div className="proto-variant-content" data-testid="variant-extracts-content">
              <h3 className="proto-section-title">Contraste Fáctico y Preguntas de Control</h3>
              <div className="proto-questions-grid">
                {currentFixture.questions.map((item, idx) => (
                  <div key={idx} className={`proto-q-card status-${item.status}`}>
                    <div className="proto-q-label">{item.q}</div>
                    <div className="proto-q-status">
                      {item.status === "match" && "✔ "}
                      {item.status === "conflict" && "✖ "}
                      {item.status === "unsupported" && "⚠️ "}
                      {item.ans}
                    </div>
                  </div>
                ))}
              </div>

              <div className="proto-source-evidence-card">
                <div className="proto-sec-head">
                  <span className="proto-sec-icon">🏛️</span>
                  <strong>Evidencia Primaria CNE / INEC / BCE</strong>
                </div>
                <div className="proto-sec-body">
                  <p>
                    <strong>Documento Oficial:</strong> {currentFixture.officialSource.doc}
                  </p>
                  <p>
                    <strong>Ubicación Exacta:</strong> {currentFixture.officialSource.page}
                  </p>
                  <p className="proto-hash-row">
                    <strong>Hash SHA-256 Canónico:</strong>
                    <code>{currentFixture.officialSource.hash}</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeVariant === "meters" && (
            <div className="proto-variant-content" data-testid="variant-meters-content">
              <h3 className="proto-section-title">Medidores Objetivos de Intención Discursiva</h3>
              <p className="proto-section-desc">
                Rúbrica automatizada de referencia sobre el tono y sustentación empírica (0 a 100).
              </p>

              <div className="proto-meters-grid">
                <div className="proto-meter-card">
                  <div className="proto-meter-top">
                    <span className="proto-meter-name">Índice de Polarización</span>
                    <span className="proto-meter-val" style={{ color: "#fb7185" }}>
                      {currentFixture.intent.polarization}%
                    </span>
                  </div>
                  <div className="proto-meter-bar">
                    <div
                      className="proto-meter-fill"
                      style={{ width: `${currentFixture.intent.polarization}%`, background: "linear-gradient(90deg, #f43f5e, #fb7185)" }}
                    />
                  </div>
                  <p className="proto-meter-hint">Presencia de lenguaje divisivo, acusatorio o polarizante.</p>
                </div>

                <div className="proto-meter-card">
                  <div className="proto-meter-top">
                    <span className="proto-meter-name">Carga Emocional</span>
                    <span className="proto-meter-val" style={{ color: "#fbbf24" }}>
                      {currentFixture.intent.emotionalLoad}%
                    </span>
                  </div>
                  <div className="proto-meter-bar">
                    <div
                      className="proto-meter-fill"
                      style={{ width: `${currentFixture.intent.emotionalLoad}%`, background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }}
                    />
                  </div>
                  <p className="proto-meter-hint">Apelación al miedo, indignación o euforia sin sustento.</p>
                </div>

                <div className="proto-meter-card">
                  <div className="proto-meter-top">
                    <span className="proto-meter-name">Sustento en Datos Públicos</span>
                    <span className="proto-meter-val" style={{ color: "#38bdf8" }}>
                      {currentFixture.intent.factualSupport}%
                    </span>
                  </div>
                  <div className="proto-meter-bar">
                    <div
                      className="proto-meter-fill"
                      style={{ width: `${currentFixture.intent.factualSupport}%`, background: "linear-gradient(90deg, #0284c7, #38bdf8)" }}
                    />
                  </div>
                  <p className="proto-meter-hint">Grado de correlación con bases de datos públicas oficiales.</p>
                </div>
              </div>
            </div>
          )}

          {activeVariant === "contrast" && (
            <div className="proto-variant-content" data-testid="variant-contrast-content">
              <h3 className="proto-section-title">Contraste Directo contra Corpus Oficial de Ecuador</h3>
              <div
                className="proto-contrast-table-wrapper"
                tabIndex={0}
                role="region"
                aria-label="Tabla de contraste directo contra el corpus oficial"
              >
                <table className="proto-contrast-table">
                  <thead>
                    <tr>
                      <th>Aspecto Contrastado</th>
                      <th>Afirmación Evaluada</th>
                      <th>Registro Oficial (CNE / INEC / BCE)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Aseveración Núcleo</strong>
                      </td>
                      <td>{currentFixture.quote}</td>
                      <td>{currentFixture.officialSource.doc}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Localización</strong>
                      </td>
                      <td>{currentFixture.source}</td>
                      <td>{currentFixture.officialSource.page}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Validación Factual</strong>
                      </td>
                      <td>{currentVerdict ? currentVerdict.toUpperCase() : "Pendiente"}</td>
                      <td>Validado contra fuentes primarias públicas</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeVariant === "audit" && (
            <div className="proto-variant-content" data-testid="variant-audit-content">
              <h3 className="proto-section-title">Traza Criptográfica de Auditoría (SHA-256)</h3>
              <div className="proto-audit-log">
                <div className="proto-log-entry">
                  <span className="proto-log-time">16:52:10.104</span>
                  <span className="proto-log-type">[INGESTA]</span>
                  <span className="proto-log-desc">Texto recibido y tokenizado en V8 Worker Edge</span>
                </div>
                <div className="proto-log-entry">
                  <span className="proto-log-time">16:52:10.220</span>
                  <span className="proto-log-type">[EXTRACCIÓN]</span>
                  <span className="proto-log-desc">Segmentación fáctica atómica completada (3 claims generados)</span>
                </div>
                <div className="proto-log-entry">
                  <span className="proto-log-time">16:52:10.450</span>
                  <span className="proto-log-type">[RAG_SEARCH]</span>
                  <span className="proto-log-desc">Búsqueda híbrida (Vector + BM25) en namespace informa-t-oficial</span>
                </div>
                <div className="proto-log-entry">
                  <span className="proto-log-time">16:52:10.780</span>
                  <span className="proto-log-type">[MULTI_MODEL]</span>
                  <span className="proto-log-desc">Consenso 2/3 alcanzado (GLM-4.7 + Gemma-4 + Nemotron)</span>
                </div>
                <div className="proto-log-entry">
                  <span className="proto-log-time">16:52:11.002</span>
                  <span className="proto-log-type">[FRONTERA_HUMANA]</span>
                  <span className="proto-log-desc">Bloqueo de veredicto para intervención editorial obligatoria</span>
                </div>
              </div>
            </div>
          )}

          {/* Human-in-the-Loop Verdict Decision Box */}
          <div className="proto-verdict-boundary" data-testid="proto-verdict-boundary">
            <div className="proto-vb-header">
              <div className="proto-vb-title-wrap">
                <span className="proto-vb-icon">🛡️</span>
                <div>
                  <h3 className="proto-vb-title">Frontera Editorial Human-in-the-Loop</h3>
                  <p className="proto-vb-sub">
                    La IA no dicta sentencia: la periodista o el periodista emite la calificación final con su firma.
                  </p>
                </div>
              </div>
            </div>

            <div className="proto-verdict-actions" role="group" aria-label="Seleccionar veredicto">
              <button
                type="button"
                className={`proto-vbtn v-true ${currentVerdict === "true" ? "selected" : ""}`}
                onClick={() => handleSetVerdict("true")}
                data-testid="vbtn-true"
              >
                ✔ Verdadero
              </button>
              <button
                type="button"
                className={`proto-vbtn v-misleading ${currentVerdict === "misleading" ? "selected" : ""}`}
                onClick={() => handleSetVerdict("misleading")}
                data-testid="vbtn-misleading"
              >
                ⚠️ Engañoso
              </button>
              <button
                type="button"
                className={`proto-vbtn v-false ${currentVerdict === "false" ? "selected" : ""}`}
                onClick={() => handleSetVerdict("false")}
                data-testid="vbtn-false"
              >
                ✖ Falso
              </button>
              <button
                type="button"
                className={`proto-vbtn v-opinion ${currentVerdict === "opinion" ? "selected" : ""}`}
                onClick={() => handleSetVerdict("opinion")}
                data-testid="vbtn-opinion"
              >
                💬 Opinión / Incomprobable
              </button>
            </div>

            <div className="proto-notes-area">
              <label htmlFor="proto-editorial-notes" className="proto-notes-label">
                Justificación y notas de redacción:
              </label>
              <textarea
                id="proto-editorial-notes"
                className="proto-notes-input"
                rows={3}
                value={notes[currentFixture.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [currentFixture.id]: e.target.value })}
                data-testid="proto-notes-input"
              />
            </div>

            <div className="proto-save-row">
              <button
                type="button"
                className="proto-save-btn"
                onClick={() => triggerToast(`Veredicto y notas para Extracto #${currentFixture.id} guardados en el expediente.`)}
                data-testid="proto-save-btn"
              >
                💾 Guardar en Expediente Editorial
              </button>
              <a href="/app" className="proto-link-app">
                Ir a la App en Vivo con Modelos Reales ➔
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      {activeModal === "claimReview" && (
        <div className="proto-modal-backdrop" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true" aria-labelledby="modal-cr-title">
          <div className="proto-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="proto-modal-head">
              <h2 id="modal-cr-title">Schema.org ClaimReview JSON-LD</h2>
              <button type="button" className="proto-modal-close" onClick={() => setActiveModal(null)} aria-label="Cerrar modal">
                ✕
              </button>
            </div>
            <div className="proto-modal-body">
              <p className="proto-modal-desc">
                Estructura canónica interoperable con Google Fact Check Tools y agregadores globales de verificación.
              </p>
              <pre className="proto-code-block">
                {JSON.stringify(
                  {
                    "@context": "https://schema.org",
                    "@type": "ClaimReview",
                    datePublished: "2026-08-17",
                    url: "https://informa-t.nimblersoft.com",
                    claimReviewed: currentFixture.quote,
                    author: {
                      "@type": "Organization",
                      name: "Redacción Aliada MediaHack II",
                      url: "https://informa-t.nimblersoft.com",
                    },
                    reviewRating: {
                      "@type": "Rating",
                      ratingValue: currentVerdict === "true" ? "5" : currentVerdict === "false" ? "1" : "3",
                      bestRating: "5",
                      worstRating: "1",
                      alternateName: currentVerdict ?? "Pendiente",
                    },
                    itemReviewed: {
                      "@type": "CreativeWork",
                      author: {
                        "@type": "Person",
                        name: currentFixture.source,
                      },
                    },
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
            <div className="proto-modal-footer">
              <button type="button" className="proto-modal-copy-btn" onClick={copyClaimReviewJson}>
                Copiar JSON-LD
              </button>
              <button type="button" className="proto-modal-cancel-btn" onClick={() => setActiveModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "jti" && (
        <div className="proto-modal-backdrop" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true" aria-labelledby="modal-jti-title">
          <div className="proto-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="proto-modal-head">
              <h2 id="modal-jti-title">Journalism Trust Initiative (JTI)</h2>
              <button type="button" className="proto-modal-close" onClick={() => setActiveModal(null)} aria-label="Cerrar modal">
                ✕
              </button>
            </div>
            <div className="proto-modal-body">
              <p className="proto-modal-desc">
                Alineación con la norma internacional CEN Workshop Agreement (CWA 17493) de Reporteros Sin Fronteras.
              </p>
              <ul className="proto-modal-list">
                <li>
                  <strong>Principio 1:</strong> Transparencia en la propiedad y misión cívica.
                </li>
                <li>
                  <strong>Principio 2:</strong> Metodología de verificación pública, reproducible y con enlaces directos a fuentes primarias.
                </li>
                <li>
                  <strong>Principio 3:</strong> Separación estricta entre hechos auditables y opiniones no verificables.
                </li>
                <li>
                  <strong>Principio 4:</strong> Mecanismo accesible de rectificación y fe de erratas.
                </li>
              </ul>
            </div>
            <div className="proto-modal-footer">
              <button type="button" className="proto-modal-cancel-btn" onClick={() => setActiveModal(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "trust" && (
        <div className="proto-modal-backdrop" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true" aria-labelledby="modal-trust-title">
          <div className="proto-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="proto-modal-head">
              <h2 id="modal-trust-title">The Trust Project · 8 Indicadores de Confianza</h2>
              <button type="button" className="proto-modal-close" onClick={() => setActiveModal(null)} aria-label="Cerrar modal">
                ✕
              </button>
            </div>
            <div className="proto-modal-body">
              <p className="proto-modal-desc">
                Indicadores estandarizados para empoderar a los lectores frente a la desinformación:
              </p>
              <ul className="proto-modal-list">
                <li>
                  <strong>1. Buenas prácticas:</strong> Código de ética periodístico publicado.
                </li>
                <li>
                  <strong>2. Autoría y pericia:</strong> Firma del periodista verificador con su historial.
                </li>
                <li>
                  <strong>3. Tipo de trabajo:</strong> Etiquetado explícito como Fact-Check / Verificación.
                </li>
                <li>
                  <strong>4. Citas y referencias:</strong> Citas textuales cotejadas con fuentes oficiales (CNE, INEC, BCE).
                </li>
                <li>
                  <strong>5. Métodos y fuentes:</strong> Explicación transparente de por qué y cómo se investigó.
                </li>
              </ul>
            </div>
            <div className="proto-modal-footer">
              <button type="button" className="proto-modal-cancel-btn" onClick={() => setActiveModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="proto-toast" role="status" aria-live="polite" data-testid="proto-toast">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
