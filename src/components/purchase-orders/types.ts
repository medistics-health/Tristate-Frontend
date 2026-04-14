export type PurchaseOrderBody = {
  vendorId: string;
  invoiceId: string;
  totalCost: number;
};

export type PurchaseOrder = {
  id: string;
  vendorId: string;
  invoiceId: string;
  totalCost: string;
  createdAt: string;
  updatedAt: string;
  vendor?: { id: string; name: string };
  invoice?: {
    id: string;
    practiceId?: string;
    totalAmount?: string;
    status?: string;
    practice?: { id: string; name: string };
  };
};

export type PurchaseOrderFieldType = 'text' | 'number';

export type PurchaseOrderField = {
  id: string;
  label: string;
  type: PurchaseOrderFieldType;
  visible: boolean;
};

export type PurchaseOrderCellValue = string | number | null;

export type PurchaseOrderRow = {
  id: string;
  values: Record<string, PurchaseOrderCellValue>;
};

export type PurchaseOrderViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: PurchaseOrderField[];
  rows: PurchaseOrderRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
