export type VendorType = "VENDOR" | "VENDOR_PLATFORM";

export type VendorBody = {
  name: string;
  type: VendorType;
  renewalDate?: string | null;
  quickbooksVendorId?: string | null;
  remitEmail?: string | null;
  paymentTerms?: string | null;
};

export type Vendor = {
  id: string;
  name: string;
  type: VendorType;
  renewalDate: string | null;
  quickbooksVendorId: string | null;
  remitEmail: string | null;
  paymentTerms: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorFieldType = "text" | "number";

export type VendorField = {
  id: string;
  label: string;
  type: VendorFieldType;
  visible: boolean;
};

export type VendorCellValue = string | number | null;

export type VendorRow = {
  id: string;
  values: Record<string, VendorCellValue>;
};

export type VendorViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: VendorField[];
  rows: VendorRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};