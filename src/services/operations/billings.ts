import axios from "axios";
import { apiConnector } from "../apiConnector";
import { billingEndpoints } from "../apis";

const {
  READINESS,
  LIST_RUNS,
  CREATE_RUN,
  GET_RUN,
  SAVE_SNAPSHOTS,
  CALCULATE_RUN,
  APPROVE_RUN,
  POST_RUN,
  RECORD_PAYMENT,
} = billingEndpoints;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = (
      error.response?.data as { message?: string } | undefined
    )?.message;
    return apiMessage ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export const billingRunStatusOptions = [
  "PENDING",
  "RUNNING",
  "CALCULATED",
  "REVIEW_REQUIRED",
  "APPROVED",
  "POSTED",
  "FAILED",
  "CLOSED",
] as const;

export type BillingRunStatus = (typeof billingRunStatusOptions)[number];

export type BillingReadinessIssue = {
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
  agreementId?: string;
  agreementVersionId?: string;
  agreementServiceTermId?: string;
};

export type BillingReadinessResponse = {
  practiceId: string;
  periodStart: string;
  periodEnd: string;
  isReady: boolean;
  summary: {
    activeAgreementCount: number;
    currentVersionCount: number | string;
    activeServiceTermCount: number;
    billableServiceTermCount: number;
  };
  issues: BillingReadinessIssue[];
};

export type BillingSnapshotInput = {
  serviceId?: string | null;
  metricKey: string;
  metricValue?: number | string | null;
  metricTextValue?: string | null;
  metricJsonValue?: unknown;
  sourceType?: string | null;
  sourceReference?: string | null;
};

export type BillingRunListItem = {
  id: string;
  practiceId: string;
  paymentMethod: "ACH" | "CREDIT_CARD";
  feeBearer: "CLIENT" | "COMPANY";
  companyFeeAmountOverride?: string | null;
  processingFeeConfig?: Record<string, unknown> | null;
  periodStart: string;
  periodEnd: string;
  status: BillingRunStatus;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
  practice?: { id: string; name: string } | null;
  createdByUser?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    userName?: string | null;
    email?: string | null;
  } | null;
  items?: Array<{
    clientAmount: string;
    vendorAmount?: string | null;
    marginAmount?: string | null;
  }>;
  _count?: {
    inputSnapshots: number;
    items: number;
  };
  agreementIds?: string[];
};

export type BillingRunItem = {
  id: string;
  serviceId: string;
  vendorId?: string | null;
  agreementServiceTermId?: string | null;
  clientAmount: string;
  vendorAmount?: string | null;
  marginAmount?: string | null;
  currency?: string | null;
  exceptionFlags?: string[];
  service?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
  agreementServiceTerm?: {
    id: string;
    effectiveDate?: string | null;
    endDate?: string | null;
    agreement?: {
      id: string;
      effectiveDate?: string | null;
      renewalDate?: string | null;
      terminationDate?: string | null;
    } | null;
    agreementVersion?: {
      id: string;
      versionNumber?: number | null;
      effectiveDate?: string | null;
      endDate?: string | null;
    } | null;
  } | null;
  formulaSnapshot?: Record<string, unknown> | null;
  components?: Array<{
    id: string;
    componentType: string;
    description?: string | null;
    quantity?: string | null;
    rate?: string | null;
    amount: string;
  }>;
  invoiceLineItems?: Array<{
    id: string;
    invoice: {
      id: string;
      invoiceNumber?: string | null;
      totalAmount: string;
      status: string;
    } | null;
  }>;
};

export type BillingRunDetail = BillingRunListItem & {
  inputSnapshots?: Array<{
    id: string;
    serviceId?: string | null;
    metricKey: string;
    metricValue?: string | null;
    metricTextValue?: string | null;
    sourceType?: string | null;
    sourceReference?: string | null;
    service?: { id: string; name: string } | null;
  }>;
  items?: BillingRunItem[];
  vendorPayables?: Array<{
    id: string;
    payableNumber?: string | null;
    totalAmount: string;
    status: string;
    vendor?: { id: string; name: string } | null;
  }>;
};

export type CreateBillingRunBody = {
  practiceId: string;
  periodStart: string;
  periodEnd: string;
  notes?: string | null;
  autoCalculate?: boolean;
  snapshots?: BillingSnapshotInput[];
  agreementIds?: string[];
  selectedCredentialingRequestIds?: string[];
  credentialingChargeAmountOverride?: number | string | null;
  credentialingChargeAmounts?: any
};

export type UpsertBillingSnapshotsBody = {
  replaceExisting?: boolean;
  snapshots: BillingSnapshotInput[];
};

export type RecordPaymentBody = {
  practiceId: string;
  amount: number | string;
  currency?: string | null;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  externalReference?: string | null;
  allocations?: Array<{
    invoiceId: string;
    allocatedAmount: number | string;
  }>;
};

export type BillingRunRow = {
  id: string;
  values: {
    practiceName: string;
    createdBy: string;
    status: BillingRunStatus;
    period: string;
    snapshotCount: number;
    itemCount: number;
    approvedAt: string;
    createdAt: string;
    netServices: number;
    grossInvoiceTotal: number;
    processingFee: number;
    companyAbsorbed: number;
    paymentMethod: string;
    vendorPayable: number;
    totalMargin: number;
  };
};

export type BillingRunsViewData = {
  rows: BillingRunRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getBillingRunProcessingSummary(run: {
  paymentMethod: "ACH" | "CREDIT_CARD";
  processingFeeConfig?: Record<string, unknown> | null;
  items?: Array<{
    clientAmount: string;
    vendorAmount?: string | null;
    marginAmount?: string | null;
  }>;
}) {
  const settings = {
    creditCard: {
      COMPANY: {
        ratePercent: Number(
          (run.processingFeeConfig as any)?.creditCard?.COMPANY?.ratePercent ?? 1.4,
        ),
        fixedFee: Number(
          (run.processingFeeConfig as any)?.creditCard?.COMPANY?.fixedFee ?? 0.3,
        ),
      },
      CLIENT: {
        ratePercent: Number(
          (run.processingFeeConfig as any)?.creditCard?.CLIENT?.ratePercent ?? 1.5,
        ),
        fixedFee: Number(
          (run.processingFeeConfig as any)?.creditCard?.CLIENT?.fixedFee ?? 0,
        ),
      },
    },
    ach: {
      COMPANY: {
        ratePercent: Number(
          (run.processingFeeConfig as any)?.ach?.COMPANY?.ratePercent ?? 0.8,
        ),
        capAmount: Number(
          (run.processingFeeConfig as any)?.ach?.COMPANY?.capAmount ?? 5,
        ),
      },
      CLIENT: {
        ratePercent: Number(
          (run.processingFeeConfig as any)?.ach?.CLIENT?.ratePercent ?? 0,
        ),
        capAmount: Number(
          (run.processingFeeConfig as any)?.ach?.CLIENT?.capAmount ?? 0,
        ),
      },
    },
  };

  let netServices = 0;
  let vendorPayable = 0;
  let totalMargin = 0;
  if (run.items) {
    for (const item of run.items) {
      netServices += Number(item.clientAmount || 0);
      vendorPayable += Number(item.vendorAmount || 0);
      totalMargin += Number(item.marginAmount || 0);
    }
  }

  const baseAmount = roundMoney(netServices);
  let processingFee = 0;
  let companyAbsorbed = 0;
  if (run.paymentMethod === "CREDIT_CARD") {
    processingFee = roundMoney(
      baseAmount * (settings.creditCard.CLIENT.ratePercent / 100) +
        settings.creditCard.CLIENT.fixedFee,
    );
    companyAbsorbed = roundMoney(
      baseAmount * (settings.creditCard.COMPANY.ratePercent / 100) +
        settings.creditCard.COMPANY.fixedFee,
    );
  } else {
    processingFee = roundMoney(
      Math.min(
        roundMoney(baseAmount * (settings.ach.CLIENT.ratePercent / 100)),
        Math.max(0, settings.ach.CLIENT.capAmount),
      ),
    );
    companyAbsorbed = roundMoney(
      Math.min(
        roundMoney(baseAmount * (settings.ach.COMPANY.ratePercent / 100)),
        Math.max(0, settings.ach.COMPANY.capAmount),
      ),
    );
  }

  return {
    netServices: baseAmount,
    processingFee,
    companyAbsorbed,
    grossInvoiceTotal: roundMoney(baseAmount + processingFee),
    vendorPayable: roundMoney(vendorPayable),
    totalMargin: roundMoney(totalMargin),
    paymentMethod: run.paymentMethod === "CREDIT_CARD" ? "Credit Card" : "ACH",
  };
}

function toBillingRunRow(run: BillingRunListItem): BillingRunRow {
  const summary = getBillingRunProcessingSummary(run);
  const createdByName = run.createdByUser
    ? [run.createdByUser.firstName, run.createdByUser.lastName].filter(Boolean).join(" ").trim() ||
      run.createdByUser.userName ||
      run.createdByUser.email ||
      "-"
    : "-";

  return {
    id: run.id,
    values: {
      practiceName: run.practice?.name || "-",
      createdBy: createdByName,
      status: run.status,
      period: `${formatDate(run.periodStart)} - ${formatDate(run.periodEnd)}`,
      snapshotCount: run._count?.inputSnapshots || 0,
      itemCount: run._count?.items || 0,
      approvedAt: formatDate(run.approvedAt, true),
      createdAt: formatDate(run.createdAt, true),
      netServices: summary.netServices,
      grossInvoiceTotal: summary.grossInvoiceTotal,
      processingFee: summary.processingFee,
      companyAbsorbed: summary.companyAbsorbed,
      paymentMethod: summary.paymentMethod,
      vendorPayable: summary.vendorPayable,
      totalMargin: summary.totalMargin,
    },
  };
}

export async function getBillingRunsView(params?: {
  page?: number;
  limit?: number;
  practiceId?: string;
  status?: string;
  paymentMethod?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<BillingRunsViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.status) queryString.set("status", params.status);
    if (params?.paymentMethod) queryString.set("paymentMethod", params.paymentMethod);
    if (params?.search) queryString.set("search", params.search);
    if (params?.dateFrom) queryString.set("dateFrom", params.dateFrom);
    if (params?.dateTo) queryString.set("dateTo", params.dateTo);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString()
      ? `${LIST_RUNS}?${queryString.toString()}`
      : LIST_RUNS;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });

    const { runs, pagination } = response.data as {
      runs: BillingRunListItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };

    return {
      rows: runs.map(toBillingRunRow),
      pagination,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch billing runs."));
  }
}

export async function getBillingReadiness(params: {
  practiceId: string;
  periodStart: string;
  periodEnd: string;
  agreementIds?: string[];
}): Promise<BillingReadinessResponse> {
  try {
    const queryString = new URLSearchParams();
    queryString.set("periodStart", params.periodStart);
    queryString.set("periodEnd", params.periodEnd);
    if (params.agreementIds && params.agreementIds.length > 0) {
      queryString.set("agreementIds", params.agreementIds.join(","));
    }

    const response = await apiConnector({
      method: "GET",
      url: `${READINESS(params.practiceId)}?${queryString.toString()}`,
      credentials: true,
    });

    return (response.data as { readiness: BillingReadinessResponse }).readiness;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch billing readiness."),
    );
  }
}

export async function getBillingRun(id: string): Promise<BillingRunDetail> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET_RUN(id),
      credentials: true,
    });
    return (response.data as { billingRun: BillingRunDetail }).billingRun;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch billing run."));
  }
}

export async function createBillingRunApi(
  data: CreateBillingRunBody,
): Promise<BillingRunDetail> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE_RUN,
      body: data,
      credentials: true,
    });
    return (response.data as { billingRun: BillingRunDetail }).billingRun;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create billing run."));
  }
}

export async function saveBillingSnapshotsApi(
  id: string,
  data: UpsertBillingSnapshotsBody,
) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: SAVE_SNAPSHOTS(id),
      body: data,
      credentials: true,
    });
    return response.data as { runId: string; snapshotCount: number };
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to save billing run snapshots."),
    );
  }
}

export async function calculateBillingRunApi(id: string): Promise<BillingRunDetail> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CALCULATE_RUN(id),
      credentials: true,
    });
    return (response.data as { billingRun: BillingRunDetail }).billingRun;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to calculate billing run."));
  }
}

export async function approveBillingRunApi(id: string): Promise<BillingRunDetail> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: APPROVE_RUN(id),
      credentials: true,
    });
    return (response.data as { billingRun: BillingRunDetail }).billingRun;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to approve billing run."));
  }
}

export async function postBillingRunApi(id: string) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: POST_RUN(id),
      credentials: true,
    });
    return response.data as {
      billingRun: BillingRunDetail;
      invoices: Array<{ id: string; invoiceNumber?: string | null }>;
      vendorPayables: Array<{ id: string; payableNumber?: string | null }>;
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to post billing run."));
  }
}

export async function recordPaymentApi(data: RecordPaymentBody) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: RECORD_PAYMENT,
      body: data,
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to record payment."));
  }
}

export async function deleteBillingRunApi(id: string) {
  try {
    const response = await apiConnector({
      method: "DELETE",
      url: `${LIST_RUNS}/${id}`,
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete billing run."));
  }
}
