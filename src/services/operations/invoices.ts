import axios from "axios";
import { apiConnector } from "../apiConnector";
import { invoiceEndpoints } from "../apis";
import { formatUsDate, formatUsDateTime } from "../../utils/csvExport";

const { LIST, CREATE, GET, UPDATE, DELETE } = invoiceEndpoints;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;

    // Prefer the detailed 'error' field if it exists (usually contains specific validation reasons)
    if (data?.error && typeof data.error === "string") {
      return data.error;
    }

    return data?.message ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export const invoiceStatusOptions = [
  "DRAFT",
  "SENT",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export type InvoiceStatus = (typeof invoiceStatusOptions)[number];

export type InvoiceBody = {
  practiceId: string;
  agreementId?: string | null;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate?: string;
};

export type Invoice = {
  id: string;
  practiceId: string;
  agreementId?: string | null;
  totalAmount: string;
  subtotalAmount?: string | null;
  status: InvoiceStatus;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
  agreement?: {
    id: string;
    type?: string;
    status?: string;
    practiceId?: string;
    practice?: { id: string; name: string };
  } | null;
  lineItems?: Array<{
    id: string;
    description?: string | null;
    quantity?: number | string | null;
    unitPrice?: string | null;
    totalPrice?: string | null;
    externalUnitPrice?: string | null;
    externalTotalPrice?: string | null;
    companyFeeDeductionAmount?: string | null;
    service?: {
      id: string;
      name?: string | null;
      code?: string | null;
    } | null;
    billingRunItem?: {
      vendorAmount?: string | null;
      marginAmount?: string | null;
    } | null;
  }>;
  purchaseOrders?: Array<{ id: string }>;
  invoiceNumber: string;
  paymentMethod?: string | null;
  processingFeeAmount?: string | null;
  companyFeeAmount?: string | null;
  stripeInvoiceId?: string | null;
  stripeHostedInvoiceUrl?: string | null;
  stripeInvoicePdfUrl?: string | null;
  invoicePdfBlobUrl?: string | null;
  receiptPdfBlobUrl?: string | null;
  quickbooksInvoiceId?: string | null;
  paymentAllocations?: Array<{
    id: string;
    allocatedAmount: number | string;
    payment: {
      id: string;
      status: string;
      quickbooksPaymentId?: string | null;
    };
  }>;
};

export type InvoiceRow = {
  id: string;
  values: {
    id: string;
    practiceId: string;
    practiceName: string;
    agreementLabel: string;
    agreementId: string;
    netServices: string;
    grossInvoiceTotal: string;
    processingFee: string;
    companyAbsorbed: string;
    paymentMethod: string;
    netAmount: string;
    status: InvoiceStatus;
    dueDate: string;
    creationDate: string;
    lastUpdate: string;
    invoiceNumber: string;
    quickbooksInvoiceId?: string | null;
    quickbooksPaymentId?: string | null;
  };
};

export type InvoiceViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  rows: InvoiceRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type InvoiceQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  practiceId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
};

function formatCurrency(amount: string | number) {
  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(amount);

  if (Number.isNaN(numericAmount)) {
    return String(amount);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return formatUsDateTime(date);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return formatUsDate(date);
}

function buildInvoiceLabel(
  invoice: Pick<Invoice, "id" | "practice" | "createdAt">,
) {
  const shortId = invoice.id.slice(0, 8).toUpperCase();
  const practiceName = invoice.practice?.name ?? "Invoice";
  return `${practiceName} • ${shortId}`;
}

function normalizeInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    invoiceNumber: invoice.invoiceNumber || buildInvoiceLabel(invoice),
  };
}

function invoiceToRow(invoice: Invoice): InvoiceRow {
  const agreementLabel = invoice.agreement
    ? `${invoice.agreement.type ?? "Agreement"} • ${invoice.agreement.id.slice(0, 8).toUpperCase()}`
    : "-";

  return {
    id: invoice.id,
    values: {
      id: invoice.id,
      practiceId: invoice.practiceId,
      practiceName: invoice.practice?.name || "-",
      agreementLabel,
      agreementId: invoice.agreementId || "",
      netServices: formatCurrency(invoice.subtotalAmount || 0),
      grossInvoiceTotal: formatCurrency(invoice.totalAmount),
      processingFee: formatCurrency(invoice.processingFeeAmount || 0),
      companyAbsorbed: formatCurrency(invoice.companyFeeAmount || 0),
      paymentMethod:
        invoice.paymentMethod === "CREDIT_CARD"
          ? "Credit Card"
          : invoice.paymentMethod === "ACH"
            ? "ACH"
            : "-",
      netAmount: formatCurrency(
        (Number(invoice.totalAmount) || 0) -
          (Number(invoice.processingFeeAmount) || 0) -
          (Number(invoice.companyFeeAmount) || 0),
      ),
      status: invoice.status,
      dueDate: formatDate(invoice.dueDate),
      creationDate: formatDateTime(invoice.createdAt),
      lastUpdate: formatDateTime(invoice.updatedAt),
      invoiceNumber: invoice.invoiceNumber,
      quickbooksInvoiceId: invoice.quickbooksInvoiceId,
      quickbooksPaymentId:
        invoice.paymentAllocations?.[0]?.payment?.quickbooksPaymentId || null,
    },
  };
}

export async function getInvoicesView(
  params?: InvoiceQueryParams,
): Promise<InvoiceViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.status) queryString.set("status", params.status);
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.paymentMethod) queryString.set("paymentMethod", params.paymentMethod);
    if (params?.dateFrom) queryString.set("dateFrom", params.dateFrom);
    if (params?.dateTo) queryString.set("dateTo", params.dateTo);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString()
      ? `${LIST}?${queryString.toString()}`
      : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { invoices, pagination } = response.data as {
      invoices: Invoice[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };

    const normalizedInvoices = invoices.map(normalizeInvoice);

    return {
      viewId: "invoice-view-001",
      title: "All Invoices",
      totalCount: pagination.total,
      rows: normalizedInvoices.map(invoiceToRow),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch invoices."));
  }
}

export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: `${LIST}?page=1&limit=100`,
      credentials: true,
    });
    const { invoices } = response.data as {
      invoices: Omit<Invoice, "invoiceNumber">[];
    };

    return invoices.map(normalizeInvoice);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch invoices."));
  }
}

export async function getInvoice(id: string): Promise<Invoice> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return normalizeInvoice(
      (response.data as { invoice: Omit<Invoice, "invoiceNumber"> }).invoice,
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch invoice."));
  }
}

export async function createInvoiceApi(data: InvoiceBody): Promise<InvoiceRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const invoice = normalizeInvoice(
      (response.data as { invoice: Omit<Invoice, "invoiceNumber"> }).invoice,
    );
    return invoiceToRow(invoice);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create invoice."));
  }
}

export async function updateInvoiceApi(
  id: string,
  data: Partial<InvoiceBody>,
): Promise<Invoice> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    return normalizeInvoice(
      (response.data as { invoice: Omit<Invoice, "invoiceNumber"> }).invoice,
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update invoice."));
  }
}

export async function deleteInvoiceApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete invoice."));
  }
}

export type StripeEventLog = {
  id: string;
  invoiceId: string | null;
  eventType: string;
  stripeEventId: string;
  payload: any;
  createdAt: string;
};

export async function getInvoiceStripeEvents(
  id: string,
): Promise<StripeEventLog[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: `${GET(id)}/stripe-events`,
      credentials: true,
    });
    return (response.data as { events: StripeEventLog[] }).events;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch stripe events."));
  }
}

export async function resendStripeInvoice(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "POST",
      url: `${GET(id)}/resend`,
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to resend invoice."));
  }
}

export async function syncInvoiceToQuickBooks(id: string): Promise<any> {
  try {
    const { quickbooksEndpoints } = await import("../apis");
    const response = await apiConnector({
      method: "POST",
      url: quickbooksEndpoints.GET_LOGS.replace(
        "/sync-logs",
        `/invoices/${id}/sync`,
      ),
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to sync to QuickBooks."));
  }
}

export async function syncPaymentToQuickBooks(paymentId: string): Promise<any> {
  try {
    const { quickbooksEndpoints } = await import("../apis");
    const response = await apiConnector({
      method: "POST",
      url: quickbooksEndpoints.GET_LOGS.replace(
        "/sync-logs",
        `/payments/${paymentId}/sync`,
      ),
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to sync payment to QuickBooks."),
    );
  }
}

export async function quickSyncInvoicePayment(invoiceId: string): Promise<any> {
  try {
    const { quickbooksEndpoints } = await import("../apis");
    const response = await apiConnector({
      method: "POST",
      url: quickbooksEndpoints.GET_LOGS.replace(
        "/sync-logs",
        `/invoices/${invoiceId}/quick-sync-payment`,
      ),
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to quick-sync payment to QuickBooks."),
    );
  }
}
