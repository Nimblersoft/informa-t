import { type Category, CATEGORIES, isCategory } from "./contracts";

export type EditorialEventType = "selected" | "changed" | "withdrawn";

export interface EditorialEvent {
  id: string;
  type: EditorialEventType;
  timestamp: string;
  category: Category | null;
  previousCategory: Category | null;
  author: string;
  justificationSummary?: string;
  details: string;
}

export interface HumanEditorialDecision {
  author: string;
  category: Category;
  justification: string;
  timestamp: string;
}

export interface ClaimItem {
  id?: string;
  title: string;
  quote: string;
  speaker: string;
  timestamp?: string;
  sourceType?: string;
}

export interface SchemaOrgClaim {
  "@type": "Claim";
  name: string;
  text: string;
  author: {
    "@type": "Person";
    name: string;
  };
  datePublished?: string;
  appearance?: string;
}

export interface SchemaOrgRating {
  "@type": "Rating";
  ratingValue: number;
  bestRating: number;
  worstRating: number;
  alternateName: Category;
}

export interface SchemaOrgClaimReview {
  "@context": "https://schema.org";
  "@type": "ClaimReview";
  datePublished: string;
  url?: string;
  author: {
    "@type": "Person";
    name: string;
  };
  claimReviewed: string;
  reviewRating: SchemaOrgRating;
  reviewBody: string;
  itemReviewed?: SchemaOrgClaim;
  hasPart?: SchemaOrgClaim[];
}

export interface EditorialTraceExport {
  exportType: "informa-t.editorial-trace";
  schemaVersion: "1.0.0";
  caseId: string;
  exportTimestamp: string;
  currentDecision: {
    author: string;
    category: Category | null;
    justification: string;
    isExportReady: boolean;
  };
  events: EditorialEvent[];
}

export function getCategoryNumericRating(category: Category): number {
  switch (category) {
    case "Cierto":
      return 5;
    case "Impreciso":
      return 3;
    case "Engañoso":
      return 2;
    case "Falso":
      return 1;
    case "Sátira":
      return 3;
    case "Inverificable":
      return 0;
  }
}

export interface BuildClaimReviewOptions {
  caseUrl?: string;
  claimSummary?: string;
}

/**
 * Builds valid Schema.org ClaimReview JSON-LD metadata.
 * Only accepts human-provided editorial decision fields and claim items.
 * Strictly ignores and refuses automated proposals or consensus data.
 */
export function buildClaimReviewJsonLd(
  decision: {
    author: string;
    category: Category;
    justification: string;
    timestamp?: string;
  },
  claims: ClaimItem | ClaimItem[],
  options?: BuildClaimReviewOptions,
): SchemaOrgClaimReview {
  if (
    !decision.author ||
    typeof decision.author !== "string" ||
    decision.author.trim().length === 0
  ) {
    throw new Error("Editorial decision author is required and cannot be empty.");
  }
  if (!isCategory(decision.category)) {
    throw new Error(
      `Invalid category: "${String(decision.category)}". Permitted categories: ${CATEGORIES.join(", ")}.`,
    );
  }
  if (
    !decision.justification ||
    typeof decision.justification !== "string" ||
    decision.justification.trim().length === 0
  ) {
    throw new Error("Editorial decision justification is required and cannot be empty.");
  }

  const claimList = Array.isArray(claims) ? claims : [claims];
  if (claimList.length === 0) {
    throw new Error("At least one claim must be provided for ClaimReview.");
  }

  const schemaClaims: SchemaOrgClaim[] = claimList.map((claim) => {
    if (!claim.title || !claim.quote || !claim.speaker) {
      throw new Error("Claim must include title, quote, and speaker.");
    }
    const res: SchemaOrgClaim = {
      "@type": "Claim",
      name: claim.title.trim(),
      text: claim.quote.trim(),
      author: {
        "@type": "Person",
        name: claim.speaker.trim(),
      },
    };
    if (claim.timestamp) {
      res.datePublished = claim.timestamp;
    }
    if (claim.sourceType) {
      res.appearance = claim.sourceType;
    }
    return res;
  });

  const ratingValue = getCategoryNumericRating(decision.category);
  const rating: SchemaOrgRating = {
    "@type": "Rating",
    ratingValue,
    bestRating: 5,
    worstRating: 1,
    alternateName: decision.category,
  };

  const defaultSummary =
    claimList.length === 1
      ? claimList[0].title
      : `Revisión editorial de ${claimList.length} afirmaciones`;

  const claimReview: SchemaOrgClaimReview = {
    "@context": "https://schema.org",
    "@type": "ClaimReview",
    datePublished: decision.timestamp || new Date().toISOString(),
    author: {
      "@type": "Person",
      name: decision.author.trim(),
    },
    claimReviewed: options?.claimSummary?.trim() || defaultSummary,
    reviewRating: rating,
    reviewBody: decision.justification.trim(),
  };

  if (options?.caseUrl) {
    claimReview.url = options.caseUrl;
  }

  if (claimList.length === 1) {
    claimReview.itemReviewed = schemaClaims[0];
  } else {
    claimReview.hasPart = schemaClaims;
  }

  return claimReview;
}

/**
 * Builds an auditable browser-local editorial trace export document.
 */
export function buildEditorialTraceExport(params: {
  caseId: string;
  author: string;
  category: Category | null;
  justification: string;
  events: EditorialEvent[];
  exportTimestamp?: string;
}): EditorialTraceExport {
  return {
    exportType: "informa-t.editorial-trace",
    schemaVersion: "1.0.0",
    caseId: params.caseId,
    exportTimestamp: params.exportTimestamp || new Date().toISOString(),
    currentDecision: {
      author: params.author.trim(),
      category: params.category,
      justification: params.justification.trim(),
      isExportReady: Boolean(
        params.author.trim().length > 0 &&
          params.category !== null &&
          isCategory(params.category) &&
          params.justification.trim().length > 0,
      ),
    },
    events: [...params.events],
  };
}
