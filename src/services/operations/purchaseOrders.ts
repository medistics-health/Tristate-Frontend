import axios from 'axios';
import { apiConnector } from '../apiConnector';
import { purchaseOrderEndpoints } from '../apis';
import type { PurchaseOrder, PurchaseOrderBody, PurchaseOrderRow, PurchaseOrderViewData } from '../../components/purchase-orders/types';

const { LIST, CREATE, GET, UPDATE, DELETE } = purchaseOrderEndpoints;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
    return apiMessage ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

function getPurchaseOrderInvoiceLabel(po: PurchaseOrder) {
  const practiceName = po.invoice?.practice?.name || 'Invoice';
  const shortId = po.invoiceId.slice(0, 8).toUpperCase();
  return `${practiceName} - ${shortId}`;
}

function purchaseOrderToRow(po: PurchaseOrder): PurchaseOrderRow {
  return {
    id: po.id,
    values: {
      id: po.id,
      vendorName: po.vendor?.name || '',
      vendorId: po.vendorId,
      invoiceId: getPurchaseOrderInvoiceLabel(po),
      totalCost: po.totalCost,
      creationDate: new Date(po.createdAt).toLocaleString(),
      lastUpdate: new Date(po.updatedAt).toLocaleString(),
    },
  };
}

const fields = [
  { id: 'vendorName', label: 'Vendor', type: 'text' as const, visible: true },
  { id: 'invoiceId', label: 'Invoice ID', type: 'text' as const, visible: true },
  { id: 'totalCost', label: 'Total Cost', type: 'number' as const, visible: true },
  { id: 'creationDate', label: 'Created', type: 'text' as const, visible: true },
  { id: 'lastUpdate', label: 'Last Update', type: 'text' as const, visible: false },
];

export type PurchaseOrderQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  invoiceId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export async function getPurchaseOrdersView(params?: PurchaseOrderQueryParams): Promise<PurchaseOrderViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set('page', String(params.page));
    if (params?.limit) queryString.set('limit', String(params.limit));
    if (params?.search) queryString.set('search', params.search);
    if (params?.invoiceId) queryString.set('invoiceId', params.invoiceId);
    if (params?.sortBy) queryString.set('sortBy', params.sortBy);
    if (params?.sortOrder) queryString.set('sortOrder', params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString.toString()}` : LIST;

    const response = await apiConnector({
      method: 'GET',
      url,
      credentials: true,
    });
    const { purchaseOrders, pagination } = response.data as {
      purchaseOrders: PurchaseOrder[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
    return {
      viewId: 'purchase-order-view-001',
      title: 'All Purchase Orders',
      totalCount: pagination.total,
      fields,
      rows: purchaseOrders.map(purchaseOrderToRow),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch purchase orders.'));
  }
}

export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const response = await apiConnector({
      method: 'GET',
      url: LIST,
      credentials: true,
    });
    const { purchaseOrders } = response.data as { purchaseOrders: PurchaseOrder[] };
    return purchaseOrders;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch purchase orders.'));
  }
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  try {
    const response = await apiConnector({
      method: 'GET',
      url: GET(id),
      credentials: true,
    });
    return (response.data as { purchaseOrder: PurchaseOrder }).purchaseOrder;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch purchase order.'));
  }
}

export async function createPurchaseOrderApi(data: PurchaseOrderBody): Promise<PurchaseOrderRow> {
  try {
    const response = await apiConnector({
      method: 'POST',
      url: CREATE,
      body: data,
      credentials: true,
    });
    const purchaseOrder = (response.data as { purchaseOrder: PurchaseOrder }).purchaseOrder;
    return purchaseOrderToRow(purchaseOrder);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create purchase order.'));
  }
}

export async function updatePurchaseOrderApi(id: string, data: Partial<PurchaseOrderBody>): Promise<PurchaseOrderRow> {
  try {
    const response = await apiConnector({
      method: 'PATCH',
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const purchaseOrder = (response.data as { purchaseOrder: PurchaseOrder }).purchaseOrder;
    return purchaseOrderToRow(purchaseOrder);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update purchase order.'));
  }
}

export async function deletePurchaseOrderApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: 'DELETE',
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to delete purchase order.'));
  }
}
