import axios from "axios";
import { apiConnector } from "../apiConnector";
import { vendorEndpoints } from "../apis";
import type { Vendor, VendorBody, VendorRow, VendorViewData } from "../../components/vendors/types";

const { LIST, CREATE, GET, UPDATE, DELETE } = vendorEndpoints;

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

function vendorToRow(vendor: Vendor): VendorRow {
  return {
    id: vendor.id,
    values: {
      id: vendor.id,
      name: vendor.name,
      type: vendor.type,
      renewalDate: vendor.renewalDate ?? "",
      quickbooksVendorId: vendor.quickbooksVendorId ?? "",
      remitEmail: vendor.remitEmail ?? "",
      paymentTerms: vendor.paymentTerms ?? "",
      creationDate: new Date(vendor.createdAt).toLocaleString(),
      lastUpdate: new Date(vendor.updatedAt).toLocaleString(),
    },
  };
}

const fields = [
  { id: 'name', label: 'Name', type: 'text' as const, visible: true },
  { id: 'type', label: 'Type', type: 'text' as const, visible: true },
  { id: 'renewalDate', label: 'Renewal Date', type: 'text' as const, visible: true },
  { id: 'quickbooksVendorId', label: 'QuickBooks ID', type: 'text' as const, visible: true },
  { id: 'remitEmail', label: 'Remit Email', type: 'text' as const, visible: true },
  { id: 'paymentTerms', label: 'Payment Terms', type: 'text' as const, visible: true },
  { id: 'creationDate', label: 'Creation Date', type: 'text' as const, visible: true },
  { id: 'lastUpdate', label: 'Last Update', type: 'text' as const, visible: false },
];

export type VendorQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export async function getVendorsView(params?: VendorQueryParams): Promise<VendorViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set('page', String(params.page));
    if (params?.limit) queryString.set('limit', String(params.limit));
    if (params?.search) queryString.set('search', params.search);
    if (params?.sortBy) queryString.set('sortBy', params.sortBy);
    if (params?.sortOrder) queryString.set('sortOrder', params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString.toString()}` : LIST;

    const response = await apiConnector({
      method: 'GET',
      url,
      credentials: true,
    });
    const { vendors, pagination } = response.data as {
      vendors: Vendor[];
      pagination: { totalRecords: number; totalPages: number; currentPage: number; limit: number };
    };
    return {
      viewId: 'vendor-view-001',
      title: 'All Vendors',
      totalCount: pagination.totalRecords,
      fields,
      rows: vendors.map(vendorToRow),
      pagination: {
        page: pagination.currentPage,
        limit: pagination.limit,
        total: pagination.totalRecords,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch vendors.'));
  }
}

export async function getAllVendorsApi(): Promise<Vendor[]> {
  try {
    const response = await apiConnector({
      method: 'GET',
      url: LIST,
      credentials: true,
    });
    const { vendors } = response.data as { vendors: Vendor[] };
    return vendors;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch vendors.'));
  }
}

export async function getVendor(id: string): Promise<Vendor> {
  try {
    const response = await apiConnector({
      method: 'GET',
      url: GET(id),
      credentials: true,
    });
    return (response.data as { vendor: Vendor }).vendor;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch vendor.'));
  }
}

export async function createVendorApi(data: VendorBody): Promise<VendorRow> {
  try {
    const response = await apiConnector({
      method: 'POST',
      url: CREATE,
      body: data,
      credentials: true,
    });
    const vendor = (response.data as { vendor: Vendor }).vendor;
    return vendorToRow(vendor);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create vendor.'));
  }
}

export async function updateVendorApi(id: string, data: Partial<VendorBody>): Promise<VendorRow> {
  try {
    const response = await apiConnector({
      method: 'PATCH',
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const vendor = (response.data as { vendor: Vendor }).vendor;
    return vendorToRow(vendor);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update vendor.'));
  }
}

export async function deleteVendorApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: 'DELETE',
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to delete vendor.'));
  }
}