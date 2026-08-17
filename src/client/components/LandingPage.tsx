// # Spec: docs/specs/accessibility-shell.md
import React, { useState } from "react";

export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="landing-shell" data-testid="landing-shell" data-ready="true">
      {/* Top Fixed Header */}
      <header className="landing-header" role="banner">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <a href="/" className="landing-logo" aria-label="informa-t inicio">
              <span className="landing-logo-icon" aria-hidden="true">
                ⚖
              </span>
              <span className="landing-logo-text">informa-t</span>
            </a>
            <span className="landing-badge">MediaHack II · Quito 2026</span>
          </div>

          <nav className="landing-nav" aria-label="Navegación principal">
            <a href="#problema" className="landing-nav-link">
              Problema
            </a>
            <a href="#solucion" className="landing-nav-link">
              Solución
            </a>
            <a href="#arquitectura" className="landing-nav-link">
              Arquitectura
            </a>
            <a href="#matriz" className="landing-nav-link">
              Comparativa
            </a>
            <a href="#gobernanza" className="landing-nav-link">
              Ficha Ética
            </a>
            <a href="#incubacion" className="landing-nav-link">
              Incubación
            </a>
          </nav>

          <div className="landing-header-actions">
            <a href="/presentation" className="landing-btn-secondary" title="Ver presentación interactiva de pitch">
              <span>Presentación</span>
            </a>
            <a href="/prototype" className="landing-btn-secondary" title="Explorar prototipo visual sin APIs">
              <span>Prototipo</span>
            </a>
            <a href="/app" className="landing-btn-primary" data-testid="landing-cta-app">
              <span>Abrir App en Vivo</span>
              <span aria-hidden="true">➔</span>
            </a>
          </div>
        </div>
      </header>

      <main className="landing-main">
        {/* HERO SECTION */}
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-hero-content">
            <div className="landing-hero-pill">
              <span className="status-live-dot" aria-hidden="true" />
              <span>Civic Tech Ecuador · Elecciones Presidenciales 29 Nov 2026</span>
            </div>

            <h1 id="hero-title" className="landing-hero-title">
              Asistente editorial con IA auditable para salas de redacción contra la{" "}
              <span className="landing-gradient-cyan">desinformación electoral</span> en Ecuador.
            </h1>

            <p className="landing-hero-subtitle">
              Automatiza la extracción de aseveraciones fácticas, el contraste contra fuentes primarias oficiales (CNE,
              INEC, BCE) y el arbitraje multi-modelo en <strong>menos de 45 segundos</strong>. La decisión editorial y
              el veredicto final permanecen <strong>100% en manos humanas</strong>.
            </p>

            <div className="landing-hero-stats-row">
              <div className="landing-stat-pill">
                <span className="stat-label">Problema</span>
                <strong className="stat-val rose">Desinformación Viral con IA</strong>
              </div>
              <div className="landing-stat-divider" aria-hidden="true" />
              <div className="landing-stat-pill">
                <span className="stat-label">Ética</span>
                <strong className="stat-val emerald">Human-in-the-Loop Obligatorio</strong>
              </div>
              <div className="landing-stat-divider" aria-hidden="true" />
              <div className="landing-stat-pill">
                <span className="stat-label">Corpus Oficial</span>
                <strong className="stat-val cyan">CNE 2026 · INEC · BCE</strong>
              </div>
              <div className="landing-stat-divider" aria-hidden="true" />
              <div className="landing-stat-pill">
                <span className="stat-label">Estándar</span>
                <strong className="stat-val violet">Schema.org ClaimReview + SHA-256</strong>
              </div>
            </div>

            <div className="landing-hero-actions">
              <a href="/app" className="landing-hero-btn primary" data-testid="hero-launch-app">
                <span className="btn-icon">🚀</span>
                <span>Probar App en Vivo (/app)</span>
              </a>
              <a href="/presentation" className="landing-hero-btn secondary" data-testid="hero-launch-presentation">
                <span className="btn-icon">📽️</span>
                <span>Ver Presentación Interpolar</span>
              </a>
              <a href="/prototype" className="landing-hero-btn outline" data-testid="hero-launch-prototype">
                <span className="btn-icon">🧪</span>
                <span>Explorar Prototipo Visual</span>
              </a>
            </div>
          </div>

          {/* Hero Visual Cockpit */}
          <div className="landing-hero-visual">
            <div className="landing-visual-card">
              <div className="visual-card-topbar">
                <div className="window-dots" aria-hidden="true">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <span className="window-title">Cockpit Editorial informa-t · Panel de Verificación en Tiempo Real</span>
                <span className="window-badge">Modo en Vivo Activo</span>
              </div>
              <div className="visual-card-frame">
                <img
                  src="/assets/hero-cockpit.jpg"
                  alt="Interfaz del panel editorial de informa-t mostrando descomposición atómica y contraste RAG"
                  className="visual-img"
                />
              </div>
              <div className="visual-card-footer">
                <div className="vcf-item">
                  <span className="vcf-dot active" />
                  <span>Pipeline Serverless: Anycast Edge &lt; 50ms</span>
                </div>
                <div className="vcf-item">
                  <span className="vcf-badge">3 LLMs en Paralelo</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: EL PROBLEMA EN ECUADOR */}
        <section id="problema" className="landing-section" aria-labelledby="section-prob-title">
          <div className="section-header">
            <span className="section-tag amber">Diagnóstico Periodístico</span>
            <h2 id="section-prob-title" className="section-title">
              La Asimetría en las Salas de Redacción
            </h2>
            <p className="section-subtitle">
              El contenido viral malicioso se genera en segundos; contrastarlo manualmente toma horas de búsqueda en PDFs
              dispersos.
            </p>
          </div>

          <div className="landing-grid-3">
            <div className="landing-card prob-card">
              <div className="card-big-num rose">90%</div>
              <h3 className="card-title">Contenido Viral Alterado</h3>
              <p className="card-desc">
                <strong>Ecuador Chequea y Lupa Media</strong> documentaron que 9 de cada 10 piezas virales auditadas en
                periodos electorales contenían elementos falsos, sacados de contexto o generados con IA.
              </p>
            </div>

            <div className="landing-card prob-card">
              <div className="card-big-num amber">4 a 6 Horas</div>
              <h3 className="card-title">Búsqueda Manual Agotadora</h3>
              <p className="card-desc">
                Buscar en PDFs escaneados del CNE, boletines técnicos del INEC o decretos del Registro Oficial colapsa la
                capacidad operativa de periodistas locales y medios comunitarios.
              </p>
            </div>

            <div className="landing-card prob-card">
              <div className="card-big-num cyan">2%</div>
              <h3 className="card-title">Cobertura Real sin IA</h3>
              <p className="card-desc">
                Las redacciones tradicionales solo alcanzan a desmentir una fracción mínima de los bulos antes de que
                afecten de forma irreversible la decisión de voto del electorado.
              </p>
            </div>
          </div>

          {/* Diagrama de Cuello de Botella */}
          <div className="landing-card diagram-card">
            <div className="diagram-card-head">
              <span className="diagram-title">Flujo Tradicional vs. Cuello de Botella Periodístico</span>
              <span className="diagram-pill rose">Llegada Tardía</span>
            </div>
            <div className="flow-steps-grid">
              <div className="flow-step-box step-red">
                <div className="step-icon">⚡</div>
                <strong>Viralización en Segundos</strong>
                <span>TikTok, WhatsApp, X, Telegram</span>
              </div>
              <div className="flow-arrow-div" aria-hidden="true">
                ➔
              </div>
              <div className="flow-step-box step-yellow">
                <div className="step-icon">⏳</div>
                <strong>Búsqueda Lenta en PDFs</strong>
                <span>CNE, INEC, Leyes (4 a 6 Horas)</span>
              </div>
              <div className="flow-arrow-div" aria-hidden="true">
                ➔
              </div>
              <div className="flow-step-box step-red">
                <div className="step-icon">❌</div>
                <strong>Llegada Tardía</strong>
                <span>El electorado vota desinformado</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: LA SOLUCIÓN INFORMA-T */}
        <section id="solucion" className="landing-section alt-bg" aria-labelledby="section-sol-title">
          <div className="section-header">
            <span className="section-tag cyan">Innovación Aplicada</span>
            <h2 id="section-sol-title" className="section-title">
              informa-t: El Copiloto Editorial Auditable
            </h2>
            <p className="section-subtitle">
              No reemplaza el criterio periodístico: automatiza la extracción atómica, el cotejo y la trazabilidad en
              menos de 45 segundos.
            </p>
          </div>

          <div className="landing-grid-2">
            <div className="landing-card solution-card">
              <div className="card-icon-wrap cyan">🎯</div>
              <h3 className="card-title">Contraste con Fuentes Primarias (RAG Oficial)</h3>
              <p className="card-desc">
                Búsqueda híbrida (semántica y léxica BM25) sobre el corpus oficial de Ecuador: Planes de gobierno CNE
                2026 inscritos, series de pobreza y empleo del INEC, cifras del Banco Central (BCE) y Registro Oficial con
                citas exactas por página, párrafo y hash SHA-256.
              </p>
            </div>

            <div className="landing-card solution-card">
              <div className="card-icon-wrap violet">⚖️</div>
              <h3 className="card-title">Consenso Multi-Modelo (2/3)</h3>
              <p className="card-desc">
                Inferencia paralela con 3 modelos independientes (GLM-4.7, Gemma-4 y Nemotron). Aplica regla de mayoría
                estricta (2 de 3) y calcula 3 índices objetivos: <strong>Polarización</strong>,{" "}
                <strong>Carga Emocional</strong> y <strong>Sustento en Datos</strong>. Si hay discrepancia, se expone
                transparentemente.
              </p>
            </div>

            <div className="landing-card solution-card highlight-green">
              <div className="card-icon-wrap emerald">🛡️</div>
              <h3 className="card-title">Frontera Ética: Human-in-the-Loop</h3>
              <p className="card-desc">
                <strong>Ninguna IA dicta un veredicto público:</strong> El selector de calificación inicia vacío y
                bloqueado. La periodista o el periodista analiza la evidencia cotejada, selecciona la categoría y firma la
                verificación con su nombre y justificación.
              </p>
            </div>

            <div className="landing-card solution-card">
              <div className="card-icon-wrap amber">📜</div>
              <h3 className="card-title">Exportación Estándar ClaimReview JSON-LD</h3>
              <p className="card-desc">
                Estructura compatible al 100% con <code>Schema.org ClaimReview</code>, Google Fact Check Tools y redes de
                medios globales, respaldada por un log de auditoría canónico con hashes SHA-256 para reproducibilidad
                cívica total.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: TOPOLOGÍA DE ARQUITECTURA CLOUDFLARE */}
        <section id="arquitectura" className="landing-section" aria-labelledby="section-arch-title">
          <div className="section-header">
            <span className="section-tag emerald">Viabilidad Técnica & Arquitectura</span>
            <h2 id="section-arch-title" className="section-title">
              Topología Serverless en Cloudflare Edge AI
            </h2>
            <p className="section-subtitle">
              Arquitectura unificada de latencia ultrabaja (&lt; 50ms): ingestión, inferencia RAG, consenso multi-modelo
              y registro de auditoría en el borde global.
            </p>
          </div>

          <div className="landing-card arch-card">
            {/* Stage 1: Ingress */}
            <div className="arch-layer">
              <div className="arch-layer-head">
                <span className="layer-tag cyan">Capa 1: Ingress & Cliente Accesible</span>
                <span className="layer-metric">Cero Servidores Ociosos</span>
              </div>
              <div className="arch-boxes-grid-2">
                <div className="arch-sub-box">
                  <div className="box-title">💻 Periodista / Sala de Redacción</div>
                  <div className="box-sub">SPA React 19 accesible (WCAG 2.1 AA) · Entrada de texto o URL pública</div>
                </div>
                <div className="arch-sub-box">
                  <div className="box-title">🛡️ Anycast Global Edge + Turnstile</div>
                  <div className="box-sub">Red distribuida en 330+ ciudades · Protección anti-bot & rate limiting</div>
                </div>
              </div>
            </div>

            <div className="arch-connector" aria-hidden="true">
              <span className="connector-line" />
              <span className="connector-text">HTTPS / SSE Stream</span>
              <span className="connector-line" />
            </div>

            {/* Stage 2: Worker Orchestrator */}
            <div className="arch-layer highlight-layer">
              <div className="arch-layer-head">
                <span className="layer-tag violet">Capa 2: Cloudflare Worker Orquestador</span>
                <span className="layer-badges">
                  <code>Hono API</code>
                  <code>Static Assets</code>
                  <code>Pipeline SSE</code>
                </span>
              </div>
              <p className="arch-layer-desc">
                Coordina en memoria compartida la segmentación atómica de claims, la consulta vectorial RAG y la
                inferencia paralela hacia los modelos de IA.
              </p>
            </div>

            <div className="arch-connector" aria-hidden="true">
              <span className="connector-line" />
              <span className="connector-text">Bindings Nativos Cloudflare</span>
              <span className="connector-line" />
            </div>

            {/* Stage 3: 4 Native Bindings */}
            <div className="arch-layer">
              <div className="arch-layer-head">
                <span className="layer-tag amber">Capa 3: 4 Servicios Serverless Nativos</span>
              </div>
              <div className="arch-boxes-grid-4">
                <div className="arch-service-card amber-border">
                  <strong className="serv-title">🌐 Browser Run</strong>
                  <code className="serv-binding">env.BROWSER</code>
                  <p className="serv-desc">Extracción web remota de artículos y medios públicos sin riesgos.</p>
                </div>

                <div className="arch-service-card emerald-border">
                  <strong className="serv-title">🔍 AI Search (RAG)</strong>
                  <code className="serv-binding">informa-t-oficial</code>
                  <p className="serv-desc">Búsqueda híbrida vectorial + BM25 sobre CNE 2026, INEC y BCE.</p>
                </div>

                <div className="arch-service-card violet-border">
                  <strong className="serv-title">🧠 Workers AI GPUs</strong>
                  <code className="serv-binding">env.AI (3 LLMs)</code>
                  <p className="serv-desc">Inferencia en paralelo: GLM-4.7, Gemma-4 y Nemotron.</p>
                </div>

                <div className="arch-service-card rose-border">
                  <strong className="serv-title">💾 Workers KV & D1</strong>
                  <code className="serv-binding">AUDIT_DB</code>
                  <p className="serv-desc">Registro inmutable SHA-256 con retención de 7 días.</p>
                </div>
              </div>
            </div>

            {/* Stage 4: Output Boundary */}
            <div className="arch-boundary-footer">
              <div className="boundary-left">
                <strong>Frontera de Salida:</strong> Decisión Humana obligatoria ➔ Exportación{" "}
                <code>Schema.org ClaimReview JSON-LD</code> + Audit Trail SHA-256.
              </div>
              <span className="boundary-badge">Interoperabilidad Global</span>
            </div>
          </div>
        </section>

        {/* SECTION: MATRIZ COMPARATIVA DIFERENCIADORA */}
        <section id="matriz" className="landing-section alt-bg" aria-labelledby="section-matriz-title">
          <div className="section-header">
            <span className="section-tag violet">Propuesta de Valor Única</span>
            <h2 id="section-matriz-title" className="section-title">
              ¿Por qué informa-t frente a lo Existente?
            </h2>
            <p className="section-subtitle">
              Comparación directa con chatbots comerciales, bots de mensajería y métodos de chequeo manual.
            </p>
          </div>

          <div className="landing-card table-card">
            <div
              className="table-responsive"
              tabIndex={0}
              role="region"
              aria-label="Tabla de comparación de capacidades de verificación"
            >
              <table className="matrix-table" data-testid="comparison-table">
                <thead>
                  <tr>
                    <th>Capacidad Evaluada</th>
                    <th className="th-highlight">informa-t (MVP)</th>
                    <th>Chatbots Genéricos (ChatGPT/Perplexity/Grok)</th>
                    <th>Bots de WhatsApp</th>
                    <th>Chequeo Manual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Corpus Oficial Curado (Ecuador)</strong>
                    </td>
                    <td className="td-highlight">
                      <span className="check-icon">✔</span> CNE 2026, INEC, BCE, Registro Oficial
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Web abierta sin curaduría oficial
                    </td>
                    <td>
                      <span className="check-icon">✔</span> Solo notas ya verificadas
                    </td>
                    <td>
                      <span className="check-icon">✔</span> Búsqueda dispersa
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Trazabilidad & Citas Exactas</strong>
                    </td>
                    <td className="td-highlight">
                      <span className="check-icon">✔</span> Página, párrafo y hash SHA-256
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Alucinaciones frecuentes
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Sin citas a fuentes primarias
                    </td>
                    <td>
                      <span className="check-icon">✔</span> Manual
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Consenso Multi-Modelo (2/3)</strong>
                    </td>
                    <td className="td-highlight">
                      <span className="check-icon">✔</span> 3 LLMs en paralelo con cálculo de desacuerdo
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Modelo único con sesgo opaco
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Sin arbitraje multi-IA
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> No aplica
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Frontera Ética Human-in-the-Loop</strong>
                    </td>
                    <td className="td-highlight">
                      <span className="check-icon">✔</span> Veredicto exclusivo del periodista
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Emite veredictos automáticos no auditados
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Respuesta automatizada
                    </td>
                    <td>
                      <span className="check-icon">✔</span> 100% Humano
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Exportación Estándar</strong>
                    </td>
                    <td className="td-highlight">
                      <span className="check-icon">✔</span> Schema.org ClaimReview JSON-LD
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Solo texto plano
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Mensaje de chat
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> Carga manual en CMS
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Tiempo de Respuesta</strong>
                    </td>
                    <td className="td-highlight">
                      <span className="check-icon">✔</span> <strong>&lt; 45 segundos</strong>
                    </td>
                    <td>
                      <span className="check-icon">✔</span> ~10 segundos
                    </td>
                    <td>
                      <span className="check-icon">✔</span> ~15 segundos
                    </td>
                    <td>
                      <span className="cross-icon">✖</span> <strong>4 a 6 horas</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION: GOBERNANZA ÉTICA & LOPDP */}
        <section id="gobernanza" className="landing-section" aria-labelledby="section-gob-title">
          <div className="section-header">
            <span className="section-tag emerald">Marco Ético UNESCO · KAS · Openlab</span>
            <h2 id="section-gob-title" className="section-title">
              Cumplimiento Ético & LOPDP Sin Concesiones
            </h2>
            <p className="section-subtitle">
              Alineación total con estándares internacionales y la Ley Orgánica de Protección de Datos Personales de
              Ecuador.
            </p>
          </div>

          <div className="landing-grid-2-custom">
            <div className="landing-grid-2">
              <div className="landing-card ethical-card">
                <div className="card-icon-wrap emerald">👤</div>
                <h3 className="card-title">Supervisión Humana Obligatoria</h3>
                <p className="card-desc">
                  La IA jamás publica directamente. El selector inicia bloqueado en blanco y requiere la firma y
                  justificación explícita de un periodista.
                </p>
              </div>

              <div className="landing-card ethical-card">
                <div className="card-icon-wrap cyan">⚖️</div>
                <h3 className="card-title">Neutralidad Simétrica</h3>
                <p className="card-desc">
                  Mismo corpus oficial, idénticos prompts y misma rúbrica algorítmica para todas las candidaturas sin
                  sesgo partidista.
                </p>
              </div>

              <div className="landing-card ethical-card">
                <div className="card-icon-wrap violet">🔒</div>
                <h3 className="card-title">Privacidad & LOPDP</h3>
                <p className="card-desc">
                  Cero perfilamiento ideológico. Sin cookies de rastreo, sin almacenamiento de datos personales y
                  expiración de trazas en 7 días.
                </p>
              </div>

              <div className="landing-card ethical-card">
                <div className="card-icon-wrap amber">📖</div>
                <h3 className="card-title">Código Abierto & Datos Libres</h3>
                <p className="card-desc">
                  Licencia abierta (MIT) y guías documentadas en Creative Commons (CC) para facilitar la auditoría cívica y
                  la adopción comunitaria.
                </p>
              </div>
            </div>

            <div className="landing-card ethical-image-card">
              <img
                src="/assets/human-verification.jpg"
                alt="Periodista verificando evidencia electoral y firmando veredicto con traza criptográfica"
                className="ethical-img"
              />
              <div className="ethical-badge-row">
                <span className="badge-check">✔ Ficha Ética Registrada 100%</span>
                <span className="badge-note">Prohibición de vigilancia o manipulación</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: RUTA DE INCUBACIÓN */}
        <section id="incubacion" className="landing-section alt-bg" aria-labelledby="section-inc-title">
          <div className="section-header">
            <span className="section-tag amber">Impacto & Continuidad</span>
            <h2 id="section-inc-title" className="section-title">
              Ruta de Incubación: Septiembre - Octubre 2026
            </h2>
            <p className="section-subtitle">
              Plan de 8 semanas para pilotar con medios aliados antes de los comicios presidenciales del 29 de noviembre.
            </p>
          </div>

          <div className="landing-grid-2">
            <div className="landing-card roadmap-card cyan-border">
              <div className="roadmap-head">
                <h3 className="roadmap-title">Mes 1: Pilotaje en Caliente (Septiembre)</h3>
                <span className="roadmap-tag cyan">Semanas 1 a 4</span>
              </div>
              <ul className="roadmap-list">
                <li>
                  <strong>Testeo en salas de redacción aliadas:</strong> Despliegue con CORAPE, Primera Plana o Tinta
                  Digital en coberturas de precampaña.
                </li>
                <li>
                  <strong>Calibración editorial:</strong> Ajuste fino de prompts e índices fácticos con retroalimentación
                  directa de periodistas de campo.
                </li>
                <li>
                  <strong>Evaluación cuantitativa:</strong> Medición del ahorro en horas de contraste y tasa de acierto.
                </li>
              </ul>
            </div>

            <div className="landing-card roadmap-card violet-border">
              <div className="roadmap-head">
                <h3 className="roadmap-title">Mes 2: Escalabilidad & Cobertura (Octubre)</h3>
                <span className="roadmap-tag violet">Semanas 5 a 8</span>
              </div>
              <ul className="roadmap-list">
                <li>
                  <strong>Expansión masiva del corpus oficial:</strong> Ingesta del 100% de planes CNE 2026, decretos y
                  sentencias del Tribunal Contencioso Electoral (TCE).
                </li>
                <li>
                  <strong>Caché de alta concurrencia:</strong> Optimización en Cloudflare AI Gateway para tráfico masivo el
                  día de elecciones.
                </li>
                <li>
                  <strong>Liberación comunitaria:</strong> Publicación de guías en Creative Commons y código abierto en
                  GitHub.
                </li>
              </ul>
            </div>
          </div>

          <div className="landing-card milestone-bar">
            <div className="m-item">
              <div className="m-date">Septiembre 2026</div>
              <div className="m-label">Pilotaje en Redacciones</div>
            </div>
            <div className="m-divider" aria-hidden="true" />
            <div className="m-item">
              <div className="m-date emerald">29 Noviembre 2026</div>
              <div className="m-label">Elecciones Presidenciales Ecuador</div>
            </div>
            <div className="m-divider" aria-hidden="true" />
            <div className="m-item">
              <div className="m-date">Código Abierto</div>
              <div className="m-label">Beneficio para la Sociedad Civil</div>
            </div>
          </div>
        </section>

        {/* SECTION: ACCESOS RÁPIDOS & DEMO HUB */}
        <section className="landing-section" aria-labelledby="section-hub-title">
          <div className="section-header">
            <span className="section-tag cyan">Recursos & Entornos</span>
            <h2 id="section-hub-title" className="section-title">
              Explora todos los Módulos de informa-t
            </h2>
            <p className="section-subtitle">
              Accede a las distintas vistas interactivas del sistema según tu necesidad de revisión.
            </p>
          </div>

          <div className="landing-grid-3">
            <a href="/app" className="landing-hub-card active-hub" data-testid="hub-card-app">
              <div className="hub-icon">🚀</div>
              <h3 className="hub-title">Aplicación en Vivo (/app)</h3>
              <p className="hub-desc">
                Pega texto o URL para correr el pipeline en vivo con SSE, RAG híbrido y consenso multi-modelo real.
              </p>
              <span className="hub-link-text">Iniciar Análisis en Vivo ➔</span>
            </a>

            <a href="/presentation" className="landing-hub-card" data-testid="hub-card-presentation">
              <div className="hub-icon">📽️</div>
              <h3 className="hub-title">Presentación (/presentation)</h3>
              <p className="hub-desc">
                Diapositivas interactivas completas con notas de orador, diagramas y visión estratégica de incubación.
              </p>
              <span className="hub-link-text">Ver Diapositivas ➔</span>
            </a>

            <a href="/prototype" className="landing-hub-card" data-testid="hub-card-prototype">
              <div className="hub-icon">🧪</div>
              <h3 className="hub-title">Prototipo Visual (/prototype)</h3>
              <p className="hub-desc">
                Previsualización con fixtures mínimos, selector de variantes, medidores de intención y modales ClaimReview.
              </p>
              <span className="hub-link-text">Explorar Prototipo ➔</span>
            </a>

            <a href="/demo" className="landing-hub-card" data-testid="hub-card-demo">
              <div className="hub-icon">📋</div>
              <h3 className="hub-title">Caso A1 Reproducible (/demo)</h3>
              <p className="hub-desc">
                Caso estático de auditoría con datos de INEC junio 2025 para validar accesibilidad y decisiones editoriales.
              </p>
              <span className="hub-link-text">Abrir Caso A1 ➔</span>
            </a>

            <a href="/compact" className="landing-hub-card" data-testid="hub-card-compact">
              <div className="hub-icon">📱</div>
              <h3 className="hub-title">Vista Compacta (/compact)</h3>
              <p className="hub-desc">
                Versión minimalista adaptada para extensiones de navegador y paneles laterales de redacción.
              </p>
              <span className="hub-link-text">Abrir Vista Compacta ➔</span>
            </a>

            <a href="/walkthrough" className="landing-hub-card" data-testid="hub-card-walkthrough">
              <div className="hub-icon">🧭</div>
              <h3 className="hub-title">Guía Pública (/walkthrough)</h3>
              <p className="hub-desc">
                Recorrido guiado de 3 pasos que explica los límites de la IA y el rol irremplazable del periodista.
              </p>
              <span className="hub-link-text">Abrir Recorrido ➔</span>
            </a>
          </div>
        </section>

        {/* SECTION: PREGUNTAS FRECUENTES (FAQ) */}
        <section className="landing-section alt-bg" aria-labelledby="section-faq-title">
          <div className="section-header">
            <span className="section-tag violet">Preguntas Frecuentes</span>
            <h2 id="section-faq-title" className="section-title">
              Dudas Clave sobre informa-t
            </h2>
          </div>

          <div className="landing-faq-list">
            {[
              {
                q: "¿La IA de informa-t decide si una noticia es falsa o verdadera?",
                a: "No. informa-t es un asistente de contraste y extracción. Procesa afirmaciones, busca citas en documentos oficiales y calcula consensos estadísticos entre 3 modelos de IA, pero el veredicto final lo emite exclusivamente una periodista o un periodista, quien firma la verificación.",
              },
              {
                q: "¿Qué fuentes oficiales componen el corpus de Ecuador?",
                a: "El sistema indexa planes de gobierno oficiales inscritos en el CNE para las Elecciones 2026, boletines técnicos y series estadísticas del INEC (ENEMDU, pobreza, inflación), informes de balanza de pagos del Banco Central (BCE) y normativas del Registro Oficial.",
              },
              {
                q: "¿Qué ocurre si los 3 modelos de IA no se ponen de acuerdo?",
                a: "Si no se alcanza una mayoría de al menos 2 de 3 modelos, el sistema declara explícitamente 'Sin consenso' y expone las discrepancias y limitaciones encontradas para que el equipo editorial investigue a fondo sin asumir certezas falsas.",
              },
              {
                q: "¿Cómo protege la privacidad y cumple con la LOPDP de Ecuador?",
                a: "informa-t no rastrea a usuarios individuales, no utiliza cookies analíticas de perfilamiento político ni almacena datos personales innecesarios. Las trazas de auditoría se conservan exclusivamente con propósitos de reproducibilidad técnica durante 7 días.",
              },
            ].map((faq, idx) => (
              <div key={idx} className={`faq-item ${activeFaq === idx ? "active" : ""}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={activeFaq === idx}
                >
                  <span>{faq.q}</span>
                  <span className="faq-toggle-icon" aria-hidden="true">
                    {activeFaq === idx ? "−" : "+"}
                  </span>
                </button>
                {activeFaq === idx && <div className="faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* SECTION: CTA BANNER FINAL */}
        <section className="landing-cta-banner" aria-labelledby="cta-banner-title">
          <div className="cta-banner-card">
            <h2 id="cta-banner-title" className="cta-title">
              Democracia informada, <span className="landing-gradient-cyan">periodismo fortalecido.</span>
            </h2>
            <p className="cta-subtitle">
              Las elecciones presidenciales de Ecuador no esperan. La desinformación tampoco. Comienza a verificar con
              evidencia auditable en tiempo real.
            </p>
            <div className="cta-btn-group">
              <a href="/app" className="landing-hero-btn primary" data-testid="cta-bottom-app">
                <span>Lanzar Aplicación en Vivo</span>
                <span aria-hidden="true">➔</span>
              </a>
              <a href="/presentation" className="landing-hero-btn secondary">
                <span>Ver Presentación Interpolar</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="landing-footer" role="contentinfo">
        <div className="landing-footer-inner">
          <div className="footer-col brand-col">
            <div className="footer-logo">
              <span className="footer-icon" aria-hidden="true">
                ⚖
              </span>
              <strong>informa-t</strong>
            </div>
            <p className="footer-desc">
              Asistente editorial con IA auditable para salas de redacción contra la desinformación electoral en Ecuador.
            </p>
            <div className="footer-tags">
              <span className="ftag">MediaHack II</span>
              <span className="ftag">Quito 2026</span>
              <span className="ftag">Civic Tech</span>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Navegación</h4>
            <ul className="footer-links">
              <li>
                <a href="#problema">Problema</a>
              </li>
              <li>
                <a href="#solucion">Solución</a>
              </li>
              <li>
                <a href="#arquitectura">Arquitectura Serverless</a>
              </li>
              <li>
                <a href="#matriz">Matriz Comparativa</a>
              </li>
              <li>
                <a href="#gobernanza">Ficha Ética UNESCO</a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Entornos del MVP</h4>
            <ul className="footer-links">
              <li>
                <a href="/app">App de Análisis en Vivo (/app)</a>
              </li>
              <li>
                <a href="/presentation">Presentación Interactiva (/presentation)</a>
              </li>
              <li>
                <a href="/prototype">Prototipo Visual (/prototype)</a>
              </li>
              <li>
                <a href="/demo">Caso A1 de Demostración (/demo)</a>
              </li>
              <li>
                <a href="/compact">Vista Compacta (/compact)</a>
              </li>
              <li>
                <a href="/walkthrough">Recorrido Público (/walkthrough)</a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Gobernanza & Licencia</h4>
            <ul className="footer-links">
              <li>
                <span>Licencia de Código: MIT</span>
              </li>
              <li>
                <span>Documentación: CC BY-SA 4.0</span>
              </li>
              <li>
                <span>Corpus: Fuentes Públicas CNE, INEC, BCE</span>
              </li>
              <li>
                <span>Privacidad: Cumplimiento LOPDP Ecuador</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © 2026 <strong>informa-t</strong> · Desarrollado para MediaHack II por <strong>Nimblersoft</strong> &
            Periodistas Aliados en Quito, Ecuador.
          </div>
          <div>Human-in-the-Loop · Sin decisiones autónomas vinculantes</div>
        </div>
      </footer>
    </div>
  );
};
