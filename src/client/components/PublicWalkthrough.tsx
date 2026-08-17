export const PublicWalkthrough: React.FC = () => (
  <div className="walkthrough-shell" data-testid="walkthrough-shell" data-ready="true">
    <header className="walkthrough-header">
      <p className="walkthrough-eyebrow">informa-t / guía pública</p>
      <h1>Recorrido de la demostración</h1>
      <p className="walkthrough-intro">
        Una guía breve para explorar cómo informa-t organiza evidencia y contexto para una revisión periodística.
      </p>
    </header>

    <main className="walkthrough-main">
      <section aria-labelledby="walkthrough-steps-title">
        <h2 id="walkthrough-steps-title">Tres formas de recorrer el prototipo</h2>
        <ol className="walkthrough-steps">
          <li className="walkthrough-step">
            <span aria-hidden="true">1</span>
            <article>
              <h3>Inicia un análisis en vivo</h3>
              <p>
                Pega texto o una URL pública para organizar afirmaciones, evidencia primaria enlazable y límites del análisis.
              </p>
              <a className="walkthrough-action" href="/app">
                Iniciar análisis en vivo
              </a>
            </article>
          </li>
          <li className="walkthrough-step">
            <span aria-hidden="true">2</span>
            <article>
              <h3>Revisa el caso A1 reproducible</h3>
              <p>
                Consulta un caso estático con evidencia, trazabilidad y el espacio donde una periodista documenta su decisión editorial.
              </p>
              <a className="walkthrough-action" href="/demo">
                Abrir caso A1 de demostración
              </a>
            </article>
          </li>
          <li className="walkthrough-step">
            <span aria-hidden="true">3</span>
            <article>
              <h3>Prueba el flujo en ventana pequeña</h3>
              <p>
                Usa la versión compacta del análisis en vivo, diseñada para conservar las acciones y los límites editoriales en menos espacio.
              </p>
              <a className="walkthrough-action" href="/compact">
                Abrir vista compacta
              </a>
            </article>
          </li>
        </ol>
      </section>

      <aside className="walkthrough-boundary" aria-labelledby="walkthrough-boundary-title">
        <p className="walkthrough-boundary-label">Límites transparentes</p>
        <h2 id="walkthrough-boundary-title">La decisión editorial no se automatiza</h2>
        <p>
          Las propuestas de modelos y cualquier consenso son insumos no vinculantes. Solo una periodista o un periodista revisa la evidencia y decide qué publicar.
        </p>
        <p>
          Cuando falta información o un servicio no está disponible, informa-t expone esa limitación sin simular certeza. Esta guía no solicita acceso a extensiones, pestañas, historial ni datos personales.
        </p>
      </aside>
    </main>
  </div>
);
