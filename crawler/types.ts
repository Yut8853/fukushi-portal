export const crawlStatuses = [
  "pending", "running", "completed", "partial", "failed", "retry_waiting",
  "review_required", "skipped", "blocked_by_robots",
] as const;
export type CrawlStatus = (typeof crawlStatuses)[number];

export type CrawlJob = {
  municipalityId: string;
  municipalityCode: string;
  municipalityName: string;
  prefectureCode: string;
  officialUrl: string;
  status: CrawlStatus;
  startedAt: string;
  completedAt: string;
  attemptCount: number;
  lastError: string;
  pagesVisited: number;
  documentsParsed: number;
  candidatesFound: number;
  nextRetryAt: string;
};

export type CrawlCandidate = {
  id: string;
  municipalityId: string;
  categoryId: string;
  title: string;
  plainTitle: string;
  department: string;
  description: string;
  targetPeople: string;
  supportType: string;
  amountDescription: string;
  repaymentRequired: boolean | null;
  applicationDeadline: string;
  requiredDocuments: string;
  documentsOptionalNote: string;
  applicationFlow: string;
  address: string;
  phone: string;
  phoneOriginal: string;
  fax: string;
  email: string;
  contactFormUrl: string;
  openingHours: string;
  openingHoursOriginal: string;
  closedDays: string;
  reservationRequired: boolean | null;
  availableMethods: string;
  accessibility: string;
  languages: string;
  officialUrl: string;
  sourceUrl: string;
  sourceType: "html" | "pdf" | "excel" | "csv";
  sourcePublishedAt: string;
  extractedAt: string;
  originalText: string;
  extractionMethod: "static_html" | "pdf_text" | "structured_document";
  confidence: number;
  status: "review_required" | "verified" | "rejected" | "on_hold";
  warnings: string[];
};

export type CrawlResult = {
  schemaVersion: 1;
  municipalityId: string;
  municipalityCode: string;
  municipalityName: string;
  officialUrl: string;
  job: CrawlJob;
  candidates: CrawlCandidate[];
};
