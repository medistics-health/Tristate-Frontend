export type ServiceBody = {
  name: string;
  code?: string | null;
  category?: string | null;
  isActive?: boolean;
  clientRate?: number;
  vendorRate?: number;
  margin?: number;
};

export type Service = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  isActive: boolean;
  clientRate: string | null;
  vendorRate: string | null;
  margin: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceFieldType = 'text' | 'number';

export type ServiceField = {
  id: string;
  label: string;
  type: ServiceFieldType;
  visible: boolean;
};

export type ServiceCellValue = string | number | null;

export type ServiceRow = {
  id: string;
  values: Record<string, ServiceCellValue>;
};

export type ServiceViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: ServiceField[];
  rows: ServiceRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};