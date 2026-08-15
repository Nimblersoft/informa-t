import type { SchemaOrgClaimReview, EditorialTraceExport } from "../shared/claim-review";

/**
 * Initiates a safe client-side browser file download from memory.
 */
export function downloadFile(
  filename: string,
  content: string,
  mimeType: string = "application/json;charset=utf-8",
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a ClaimReview JSON-LD document.
 */
export function downloadClaimReviewJsonLd(
  caseId: string,
  claimReview: SchemaOrgClaimReview,
): void {
  const cleanId = caseId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const filename = `claimreview-${cleanId || "case"}.json`;
  const content = JSON.stringify(claimReview, null, 2);
  downloadFile(filename, content, "application/ld+json;charset=utf-8");
}

/**
 * Downloads an auditable browser-local editorial trace log.
 */
export function downloadEditorialTrace(
  caseId: string,
  traceExport: EditorialTraceExport,
): void {
  const cleanId = caseId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const filename = `traza-editorial-${cleanId || "case"}.json`;
  const content = JSON.stringify(traceExport, null, 2);
  downloadFile(filename, content, "application/json;charset=utf-8");
}
