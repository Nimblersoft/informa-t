import React, { useState } from "react";
import { CATEGORIES, type Category, isCategory } from "../../shared/contracts";
import {
  buildClaimReviewJsonLd,
  buildEditorialTraceExport,
  type ClaimItem,
  type EditorialEvent,
} from "../../shared/claim-review";
import { downloadClaimReviewJsonLd, downloadEditorialTrace } from "../export";

export interface EditorialDecisionProps {
  caseId: string;
  claims: ClaimItem[];
  caseUrl?: string;
  initialAuthor?: string;
}

export const EditorialDecision: React.FC<EditorialDecisionProps> = ({
  caseId,
  claims,
  caseUrl,
  initialAuthor = "",
}) => {
  const [author, setAuthor] = useState<string>(initialAuthor);
  const [category, setCategory] = useState<Category | null>(null);
  const [justification, setJustification] = useState<string>("");
  const [events, setEvents] = useState<EditorialEvent[]>([]);
  const [showTraceHistory, setShowTraceHistory] = useState<boolean>(false);

  const isAuthorValid = author.trim().length > 0;
  const isCategoryValid = category !== null && isCategory(category);
  const isJustificationValid = justification.trim().length > 0;
  const isExportReady = isAuthorValid && isCategoryValid && isJustificationValid;

  const handleCategorySelect = (newVal: string) => {
    if (!newVal) {
      if (category !== null) {
        // Withdrawing decision
        const event: EditorialEvent = {
          id: `edt-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: "withdrawn",
          timestamp: new Date().toISOString(),
          category: null,
          previousCategory: category,
          author: author.trim(),
          justificationSummary: justification.trim() || undefined,
          details: `Decisión retirada por el periodista (categoría anterior: ${category})`,
        };
        setEvents((prev) => [...prev, event]);
        setCategory(null);
      }
      return;
    }

    if (isCategory(newVal)) {
      if (category === null) {
        // Transition: Empty -> Selected
        const event: EditorialEvent = {
          id: `edt-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: "selected",
          timestamp: new Date().toISOString(),
          category: newVal,
          previousCategory: null,
          author: author.trim(),
          justificationSummary: justification.trim() || undefined,
          details: `Categoría seleccionada por el periodista: ${newVal}`,
        };
        setEvents((prev) => [...prev, event]);
        setCategory(newVal);
      } else if (category !== newVal) {
        // Transition: Selected -> Changed
        const event: EditorialEvent = {
          id: `edt-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: "changed",
          timestamp: new Date().toISOString(),
          category: newVal,
          previousCategory: category,
          author: author.trim(),
          justificationSummary: justification.trim() || undefined,
          details: `Categoría modificada de ${category} a ${newVal}`,
        };
        setEvents((prev) => [...prev, event]);
        setCategory(newVal);
      }
    }
  };

  const handleWithdraw = () => {
    if (category !== null) {
      const event: EditorialEvent = {
        id: `edt-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: "withdrawn",
        timestamp: new Date().toISOString(),
        category: null,
        previousCategory: category,
        author: author.trim(),
        justificationSummary: justification.trim() || undefined,
        details: `Decisión retirada por el periodista (categoría anterior: ${category})`,
      };
      setEvents((prev) => [...prev, event]);
      setCategory(null);
    }
  };

  const handleExportClaimReview = () => {
    if (!isExportReady || !category) return;
    const claimReview = buildClaimReviewJsonLd(
      {
        author: author.trim(),
        category,
        justification: justification.trim(),
        timestamp: new Date().toISOString(),
      },
      claims,
      { caseUrl },
    );
    downloadClaimReviewJsonLd(caseId, claimReview);
  };

  const handleExportTrace = () => {
    if (!isExportReady) return;
    const traceExport = buildEditorialTraceExport({
      caseId,
      author: author.trim(),
      category,
      justification: justification.trim(),
      events,
    });
    downloadEditorialTrace(caseId, traceExport);
  };

  return (
    <section
      className="editorial-decision-container"
      data-testid="editorial-decision-container"
      aria-labelledby="editorial-decision-heading"
    >
      <div className="decision-header">
        <div className="decision-title-group">
          <h2 id="editorial-decision-heading" className="decision-title">
            Decisión editorial humana
          </h2>
          <span className="decision-badge-human" data-testid="decision-badge-human">
            Control periodístico exclusivo
          </span>
        </div>
        <p className="decision-disclaimer">
          La calificación de la información es responsabilidad exclusiva del equipo
          editorial. Ninguna propuesta sintética ni cálculo de consenso preselecciona o
          completa esta decisión.
        </p>
      </div>

      <form
        className="decision-form"
        data-testid="editorial-decision-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="form-row">
          <div className="form-group author-group">
            <label htmlFor="editorial-author-input" className="form-label">
              Periodista o editor responsable <span className="field-required" aria-hidden="true">*</span>
            </label>
            <input
              id="editorial-author-input"
              data-testid="editorial-author-input"
              type="text"
              className="form-input"
              placeholder="Ej. María González (Equipo de Verificación)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              aria-required="true"
              aria-describedby={!isAuthorValid ? "hint-author" : undefined}
            />
            {!isAuthorValid && (
              <span id="hint-author" className="field-hint" data-testid="hint-author">
                Campo obligatorio para habilitar la exportación.
              </span>
            )}
          </div>

          <div className="form-group category-group">
            <label htmlFor="editorial-category-select" className="form-label">
              Categoría editorial <span className="field-required" aria-hidden="true">*</span>
            </label>
            <div className="category-select-wrapper">
              <select
                id="editorial-category-select"
                data-testid="editorial-category-select"
                className="form-select"
                value={category ?? ""}
                onChange={(e) => handleCategorySelect(e.target.value)}
                aria-required="true"
                aria-describedby={!isCategoryValid ? "hint-category" : undefined}
              >
                <option value="">-- Seleccione una categoría --</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {category !== null && (
                <button
                  type="button"
                  data-testid="btn-withdraw-decision"
                  className="btn-withdraw"
                  onClick={handleWithdraw}
                  aria-label="Retirar selección de categoría"
                  title="Retirar selección de categoría"
                >
                  Retirar
                </button>
              )}
            </div>
            {!isCategoryValid && (
              <span id="hint-category" className="field-hint" data-testid="hint-category">
                Seleccione una de las seis categorías normadas.
              </span>
            )}
          </div>
        </div>

        <div className="form-group justification-group">
          <label htmlFor="editorial-justification-input" className="form-label">
            Fundamentación y justificación editorial{" "}
            <span className="field-required" aria-hidden="true">*</span>
          </label>
          <textarea
            id="editorial-justification-input"
            data-testid="editorial-justification-input"
            className="form-textarea"
            rows={4}
            placeholder="Describa el razonamiento periodístico, el cotejo contra fuentes primarias y el motivo de la categorización asignada..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            aria-required="true"
            aria-describedby={!isJustificationValid ? "hint-justification" : undefined}
          />
          {!isJustificationValid && (
            <span id="hint-justification" className="field-hint" data-testid="hint-justification">
              Ingrese una argumentación fundamentada sin espacios vacíos.
            </span>
          )}
        </div>

        {/* Validation summary banner */}
        {!isExportReady && (
          <div
            className="decision-validation-summary"
            data-testid="editorial-validation-msg"
            role="status"
          >
            <span className="validation-icon" aria-hidden="true">
              ℹ
            </span>
            <span>
              Para habilitar la exportación, complete el periodista responsable, la
              categoría editorial y la justificación fundamentada.
            </span>
          </div>
        )}

        {isExportReady && (
          <div
            className="decision-ready-summary"
            data-testid="editorial-ready-msg"
            role="status"
          >
            <span className="ready-icon" aria-hidden="true">
              ✓
            </span>
            <span>
              Decisión editorial completa y lista para exportar como ClaimReview
              (JSON-LD) y traza de auditoría.
            </span>
          </div>
        )}

        {/* Action and export button bar */}
        <div className="decision-actions-bar">
          <div className="export-buttons-group">
            <button
              type="button"
              data-testid="btn-export-claimreview"
              className="btn-action btn-export-claimreview"
              disabled={!isExportReady}
              aria-disabled={!isExportReady}
              onClick={handleExportClaimReview}
            >
              Exportar ClaimReview (JSON-LD)
            </button>

            <button
              type="button"
              data-testid="btn-export-trace"
              className="btn-action btn-export-trace"
              disabled={!isExportReady}
              aria-disabled={!isExportReady}
              onClick={handleExportTrace}
            >
              Exportar traza editorial (JSON)
            </button>
          </div>

          <div className="trace-status-group">
            <button
              type="button"
              data-testid="btn-toggle-trace-history"
              className="btn-toggle-trace"
              aria-expanded={showTraceHistory}
              aria-controls="editorial-trace-viewer"
              onClick={() => setShowTraceHistory((prev) => !prev)}
            >
              Historial de acciones ({events.length})
            </button>
          </div>
        </div>

        {/* Browser-local audit trace history viewer */}
        {showTraceHistory && (
          <div
            id="editorial-trace-viewer"
            className="editorial-trace-viewer"
            data-testid="editorial-trace-viewer"
            role="region"
            aria-label="Registro local de eventos editoriales"
          >
            <h3 className="trace-viewer-title">
              Registro local de eventos editoriales ({events.length})
            </h3>
            {events.length === 0 ? (
              <p className="trace-empty-text" data-testid="trace-empty-text">
                No se han registrado cambios de categoría en esta sesión.
              </p>
            ) : (
              <ul className="trace-event-list" data-testid="editorial-events-list">
                {events.map((evt) => (
                  <li
                    key={evt.id}
                    className={`trace-event-entry event-type-${evt.type}`}
                    data-testid={`editorial-event-item-${evt.id}`}
                  >
                    <span className="trace-event-badge">{evt.type}</span>
                    <span className="trace-event-time">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="trace-event-details">{evt.details}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </section>
  );
};
