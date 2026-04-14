import axios from "axios";
import { apiConnector } from "../apiConnector";
import { invoiceEndpoints } from "../apis";

const { LIST, CREATE, GET, UPDATE, DELETE } = invoiceEndpoints;

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
  lineItems?: Array<{ id: string }>;
  purchaseOrders?: Array<{ id: string }>;
  invoiceNumber: string;
};

export type InvoiceRow = {
  id: string;
  values: {
    id: string;
    practiceName: string;
    agreementLabel: string;
    agreementId: string;
    totalAmount: string;
    status: InvoiceStatus;
    dueDate: string;
    creationDate: string;
    lastUpdate: string;
    invoiceNumber: string;
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

  return date.toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

function buildInvoiceLabel(
  invoice: Pick<Invoice, "id" | "practice" | "createdAt">,
) {
  const shortId = invoice.id.slice(0, 8).toUpperCase();
  const practiceName = invoice.practice?.name ?? "Invoice";
  return `${practiceName} • ${shortId}`;
}

function normalizeInvoice(invoice: Omit<Invoice, "invoiceNumber">): Invoice {
  return {
    ...invoice,
    invoiceNumber: buildInvoiceLabel(invoice),
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
      practiceName: invoice.practice?.name || "-",
      agreementLabel,
      agreementId: invoice.agreementId || "",
      totalAmount: formatCurrency(invoice.totalAmount),
      status: invoice.status,
      dueDate: formatDate(invoice.dueDate),
      creationDate: formatDateTime(invoice.createdAt),
      lastUpdate: formatDateTime(invoice.updatedAt),
      invoiceNumber: invoice.invoiceNumber,
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

    const url = queryString.toString()
      ? `${LIST}?${queryString.toString()}`
      : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { invoices, pagination } = response.data as {
      invoices: Omit<Invoice, "invoiceNumber">[];
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
