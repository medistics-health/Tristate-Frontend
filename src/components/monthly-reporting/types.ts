export type ReportStatus = "Submitted" | "Pending";

export interface MonthlyReport {
  id: string;
  practiceName: string;
  practiceId: string;
  serviceName: string;
  serviceId: string;
  status: ReportStatus;
  submittedBy: string | null;
  dueDate: string | null;
  month: string;
  year: number;
  metrics: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyReportRow {
  id: string;
  values: {
    practiceName: string;
    serviceName: string;
    status: ReportStatus;
    submittedBy: string;
    month: string;
    year: number;
    dueDate?: string;
  };
}

export interface MonthlyReportViewData {
  viewId: string;
  title: string;
  totalCount: number;
  fields: { id: string; label: string; type: "text"; visible: boolean }[];
  rows: MonthlyReportRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MarketingMetrics {
  websiteVisits: number;
  leadsGenerated: number;
  reviewsGenerated: number;
  socialPostsPublished: number;
  seoKeywordImprovements: number;
}

export interface SubmitReportPayload {
  practiceId: string;
  practiceName: string;
  serviceName: string;
  serviceId: string;
  month: string;
  year: number;
  dueDate: string;
  metrics: MarketingMetrics;
}

export type MonthlyReportQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: ReportStatus;
  practiceName?: string;
  serviceName?: string;
};
