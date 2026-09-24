export type HubDocumentStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type HubLinkedDocument = {
  id: string;
  title: string;
  description: string | null;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  version: number;
  status: HubDocumentStatus;
  createdAt: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
};

export type HubDocumentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
};

export type HubCategory = {
  id: string;
  name: string;
  parentCategoryId?: string | null;
  parentCategory?: { id: string; name: string } | null;
  createdAt?: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: { documentLinks: number; childCategories: number };
};

export function hubCategoryParentId(category: HubCategory): string | null {
  return category.parentCategoryId || category.parentCategory?.id || null;
}

export function hubCategoryPathLabel(category: HubCategory, all: HubCategory[]): string {
  const parentId = hubCategoryParentId(category);
  const parentName =
    category.parentCategory?.name || all.find((item) => item.id === parentId)?.name;
  return parentName ? `${parentName} / ${category.name}` : category.name;
}

export type HubTag = {
  id: string;
  name: string;
  _count?: { documentLinks: number };
};

export type HubDocument = {
  id: string;
  title: string;
  description: string | null;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  version: number;
  rootDocumentId: string;
  parentDocumentId: string | null;
  status: HubDocumentStatus;
  isPublicShareable: boolean;
  uploadedBy: HubDocumentUser;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  isLatest?: boolean;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  practices: { id: string; name: string }[];
  deals: { id: string; stage?: string; practiceId?: string }[];
  persons: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    role?: string;
  }[];
};

export type HubDocumentVersion = {
  id: string;
  version: number;
  title: string;
  originalFilename: string;
  status: HubDocumentStatus;
  uploadedBy: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
  fileSizeBytes: number;
};

export type HubPublicLinkUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type HubPublicLink = {
  id: string;
  documentId: string;
  createdAt: string;
  createdBy?: HubPublicLinkUser | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy?: HubPublicLinkUser | null;
  viewCount: number;
  lastAccessedAt: string | null;
  allowDownload: boolean;
  path: string;
  url: string;
};

export type HubDocumentRow = {
  id: string;
  values: {
    title: string;
    categories: string;
    tags: string;
    fileType: string;
    version: number;
    downloads: number;
    uploadedBy: string;
    createdAt: string;
    status: string;
    shareable: string;
  };
};
