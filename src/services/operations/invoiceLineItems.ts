import axios from "axios";
import { apiConnector } from "../apiConnector";
import { invoiceEndpoints } from "../apis";
import type { Invoice } from "./invoices";
import type { Service } from "../../components/services/types";

const LINE_ITEMS_LIST = `${invoiceEndpoints.LIST}/line-items`;
const LINE_ITEMS_CREATE = `${invoiceEndpoints.CREATE}/line-items`;
const LINE_ITEMS_GET = (id: string) =>
  `${invoiceEndpoints.GET("line-items")}/${id}`;
const LINE_ITEMS_UPDATE = (id: string) =>
  `${invoiceEndpoints.UPDATE("line-items")}/${id}`;
const LINE_ITEMS_DELETE = (id: string) =>
  `${invoiceEndpoints.DELETE("line-items")}/${id}`;

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

export type InvoiceLineItemBody = {
  invoiceId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type InvoiceLineItem = {
  id: string;
  invoiceId: string;
  serviceId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  externalUnitPrice?: string | null;
  externalTotalPrice?: string | null;
  companyFeeDeductionAmount?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  invoice?: Invoice;
  service?: Service;
};

export type InvoiceLineItemRow = {
  id: string;
  values: {
    id: string;
    invoiceLabel: string;
    description: string;
    serviceName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    externalUnitPrice: string;
    externalTotalPrice: string;
    companyFeeDeductionAmount: string;
    creationDate: string;
    lastUpdate: string;
  };
};

export type InvoiceLineItemViewData = {
  rows: InvoiceLineItemRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type InvoiceLineItemQueryParams = {
  page?: number;
  limit?: number;
  invoiceId?: string;
  invoiceNumber?: string;
  type?: "client" | "tristate";
  search?: string;
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

function getInvoiceLabel(
  invoice?: InvoiceLineItem["invoice"],
  invoiceId?: string,
) {
  if (invoice?.invoiceNumber) {
    return invoice.invoiceNumber;
  }

  const shortId = (invoice?.id || invoiceId || "").slice(0, 8).toUpperCase();
  const practiceName = invoice?.practice?.name || "Invoice";
  return shortId ? `${practiceName} - ${shortId}` : practiceName;
}

function lineItemToRow(lineItem: InvoiceLineItem): InvoiceLineItemRow {
  return {
    id: lineItem.id,
    values: {
      id: lineItem.id,
      invoiceLabel: getInvoiceLabel(lineItem.invoice, lineItem.invoiceId),
      description: lineItem.description || lineItem.service?.name || "-",
      serviceName: lineItem.service?.name || "-",
      quantity: lineItem.quantity,
      unitPrice: formatCurrency(lineItem.unitPrice),
      totalPrice: formatCurrency(lineItem.totalPrice),
      externalUnitPrice: formatCurrency(
        lineItem.externalUnitPrice ?? lineItem.unitPrice,
      ),
      externalTotalPrice: formatCurrency(
        lineItem.externalTotalPrice ?? lineItem.totalPrice,
      ),
      companyFeeDeductionAmount: formatCurrency(
        lineItem.companyFeeDeductionAmount ?? 0,
      ),
      creationDate: new Date(lineItem.createdAt).toLocaleString(),
      lastUpdate: new Date(lineItem.updatedAt).toLocaleString(),
    },
  };
}

export async function getInvoiceLineItemsView(
  params?: InvoiceLineItemQueryParams,
): Promise<InvoiceLineItemViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.invoiceId) queryString.set("invoiceId", params.invoiceId);
    if (params?.invoiceNumber)
      queryString.set("invoiceNumber", params.invoiceNumber);
    if (params?.search) queryString.set("search", params.search);
    if (params?.dateFrom) queryString.set("dateFrom", params.dateFrom);
    if (params?.dateTo) queryString.set("dateTo", params.dateTo);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString()
      ? `${LINE_ITEMS_LIST}?${queryString.toString()}`
      : LINE_ITEMS_LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { lineItems, pagination } = response.data as {
      lineItems: InvoiceLineItem[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };

    return {
      rows: lineItems.map(lineItemToRow),
      pagination,
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch invoice line items."),
    );
  }
}

export async function getInvoiceLineItem(id: string): Promise<InvoiceLineItem> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LINE_ITEMS_GET(id),
      credentials: true,
    });
    return (response.data as { invoiceLineItem: InvoiceLineItem })
      .invoiceLineItem;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch invoice line item."),
    );
  }
}

export async function createInvoiceLineItemApi(
  data: InvoiceLineItemBody,
): Promise<InvoiceLineItem> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: LINE_ITEMS_CREATE,
      body: data,
      credentials: true,
    });
    return (response.data as { invoiceLineItem: InvoiceLineItem })
      .invoiceLineItem;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to create invoice line item."),
    );
  }
}

export async function updateInvoiceLineItemApi(
  id: string,
  data: Partial<InvoiceLineItemBody>,
): Promise<InvoiceLineItem> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: LINE_ITEMS_UPDATE(id),
      body: data,
      credentials: true,
    });
    return (response.data as { invoiceLineItem: InvoiceLineItem })
      .invoiceLineItem;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to update invoice line item."),
    );
  }
}

export async function deleteInvoiceLineItemApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: LINE_ITEMS_DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to delete invoice line item."),
    );
  }
}
