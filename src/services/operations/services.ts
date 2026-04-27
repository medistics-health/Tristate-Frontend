import axios from 'axios';
import { apiConnector } from '../apiConnector';
import { serviceEndpoints } from '../apis';
import type { Service, ServiceBody, ServiceRow, ServiceViewData } from '../../components/services/types';

const { LIST, CREATE, GET, UPDATE, DELETE } = serviceEndpoints;

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

function serviceToRow(service: Service): ServiceRow {
  return {
    id: service.id,
    values: {
      id: service.id,
      name: service.name,
      code: service.code ?? '',
      category: service.category ?? '',
      isActive: service.isActive,
      creationDate: new Date(service.createdAt).toLocaleString(),
      lastUpdate: new Date(service.updatedAt).toLocaleString(),
    },
  };
}

const fields = [
  { id: 'name', label: 'Name', type: 'text' as const, visible: true },
  { id: 'code', label: 'Code', type: 'text' as const, visible: true },
  { id: 'category', label: 'Category', type: 'text' as const, visible: true },
  { id: 'isActive', label: 'Active', type: 'text' as const, visible: true },
  { id: 'creationDate', label: 'Creation Date', type: 'text' as const, visible: true },
  { id: 'lastUpdate', label: 'Last Update', type: 'text' as const, visible: false },
];

export type ServiceQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export async function getServicesView(params?: ServiceQueryParams): Promise<ServiceViewData> {
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
    const { services, pagination } = response.data as {
      services: Service[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
    return {
      viewId: 'service-view-001',
      title: 'All Services',
      totalCount: pagination.total,
      fields,
      rows: services.map(serviceToRow),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch services.'));
  }
}

export async function getAllServices(): Promise<Service[]> {
  try {
    const response = await apiConnector({
      method: 'GET',
      url: LIST,
      credentials: true,
    });
    const { services } = response.data as { services: Service[] };
    return services;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch services.'));
  }
}

export async function getService(id: string): Promise<Service> {
  try {
    const response = await apiConnector({
      method: 'GET',
      url: GET(id),
      credentials: true,
    });
    return (response.data as { service: Service }).service;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch service.'));
  }
}

export async function createServiceApi(data: ServiceBody): Promise<ServiceRow> {
  try {
    const response = await apiConnector({
      method: 'POST',
      url: CREATE,
      body: data,
      credentials: true,
    });
    const service = (response.data as { service: Service }).service;
    return serviceToRow(service);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create service.'));
  }
}

export async function updateServiceApi(id: string, data: Partial<ServiceBody>): Promise<ServiceRow> {
  try {
    const response = await apiConnector({
      method: 'PATCH',
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const service = (response.data as { service: Service }).service;
    return serviceToRow(service);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update service.'));
  }
}

export async function deleteServiceApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: 'DELETE',
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to delete service.'));
  }
}