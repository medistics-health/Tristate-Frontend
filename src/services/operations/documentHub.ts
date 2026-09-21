import axios from "axios";
import { apiConnector } from "../apiConnector";
import { documentHubEndpoints, personEndpoints } from "../apis";
import type {
  HubCategory,
  HubDocument,
  HubDocumentRow,
  HubDocumentVersion,
  HubPublicLink,
  HubTag,
} from "../../components/document-hub/types";

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)
      ?.message;
    return apiMessage ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

function fileTypeLabel(mimeType: string) {
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("wordprocessingml") || mimeType.includes("docx")) return "DOCX";
  if (mimeType.includes("spreadsheetml") || mimeType.includes("xlsx")) return "XLSX";
  if (mimeType.includes("presentationml") || mimeType.includes("pptx")) return "PPTX";
  if (mimeType.includes("png")) return "PNG";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "JPG";
  return mimeType.split("/").pop()?.toUpperCase() || "FILE";
}

function documentToRow(document: HubDocument): HubDocumentRow {
  return {
    id: document.id,
    values: {
      title: document.title,
      categories: document.categories.map((item) => item.name).join(", ") || "-",
      tags: document.tags.map((item) => item.name).join(", ") || "-",
      fileType: fileTypeLabel(document.mimeType),
      version: document.version,
      downloads: document.downloadCount,
      uploadedBy: `${document.uploadedBy.firstName} ${document.uploadedBy.lastName}`.trim(),
      createdAt: new Date(document.createdAt).toLocaleString(),
      status: document.status,
      shareable: document.isPublicShareable ? "Yes" : "No",
    },
  };
}

export type DocumentHubQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  tag?: string;
  fileType?: string;
  status?: string;
  sort?: string;
  personId?: string;
  practiceId?: string;
  dealId?: string;
};

export async function getDocumentsView(params?: DocumentHubQueryParams) {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.categoryId) query.set("categoryId", params.categoryId);
    if (params?.tag) query.set("tag", params.tag);
    if (params?.fileType) query.set("fileType", params.fileType);
    if (params?.status) query.set("status", params.status);
    if (params?.sort) query.set("sort", params.sort);
    if (params?.personId) query.set("personId", params.personId);
    if (params?.practiceId) query.set("practiceId", params.practiceId);
    if (params?.dealId) query.set("dealId", params.dealId);

    const url = query.toString()
      ? `${documentHubEndpoints.LIST}?${query.toString()}`
      : documentHubEndpoints.LIST;

    const response = await apiConnector({ method: "GET", url, credentials: true });
    const { documents, pagination } = response.data as {
      documents: HubDocument[];
      pagination: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        limit: number;
      };
    };

    return {
      rows: documents.map(documentToRow),
      documents,
      pagination: {
        page: pagination.currentPage,
        limit: pagination.limit,
        total: pagination.totalRecords,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch documents."));
  }
}

export async function getHubDocument(id: string): Promise<{
  document: HubDocument;
  versionHistory: HubDocumentVersion[];
}> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: documentHubEndpoints.GET(id),
      credentials: true,
    });
    return response.data as {
      document: HubDocument;
      versionHistory: HubDocumentVersion[];
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch document."));
  }
}

export async function uploadHubDocument(formData: FormData): Promise<{
  document: HubDocument;
  duplicateOf?: { id: string; title: string }[];
}> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: documentHubEndpoints.CREATE,
      body: formData,
      credentials: true,
    });
    return response.data as {
      document: HubDocument;
      duplicateOf?: { id: string; title: string }[];
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to upload document."));
  }
}

export async function updateHubDocument(
  id: string,
  body: Record<string, unknown>,
): Promise<HubDocument> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: documentHubEndpoints.UPDATE(id),
      body,
      credentials: true,
    });
    return (response.data as { document: HubDocument }).document;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update document."));
  }
}

export async function uploadHubDocumentVersion(id: string, formData: FormData) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: documentHubEndpoints.VERSIONS(id),
      body: formData,
      credentials: true,
    });
    return response.data as {
      document: HubDocument;
      duplicateOf?: { id: string; title: string }[];
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to upload version."));
  }
}

export async function archiveHubDocument(id: string) {
  try {
    await apiConnector({
      method: "DELETE",
      url: documentHubEndpoints.ARCHIVE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to archive document."));
  }
}

export async function hardDeleteHubDocument(id: string) {
  try {
    await apiConnector({
      method: "DELETE",
      url: documentHubEndpoints.HARD_DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete document."));
  }
}

export async function downloadHubDocument(id: string) {
  try {
    const response = await apiConnector({
      method: "GET",
      url: documentHubEndpoints.DOWNLOAD(id),
      credentials: true,
    });
    return response.data as { sasUrl: string; fileName: string; mimeType: string };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to download document."));
  }
}

export async function listHubCategories(): Promise<HubCategory[]> {
  const response = await apiConnector({
    method: "GET",
    url: documentHubEndpoints.CATEGORIES,
    credentials: true,
  });
  return (response.data as { categories: HubCategory[] }).categories;
}

export async function createHubCategory(name: string, parentCategoryId?: string) {
  const response = await apiConnector({
    method: "POST",
    url: documentHubEndpoints.CATEGORIES,
    body: { name, parentCategoryId: parentCategoryId || null },
    credentials: true,
  });
  return (response.data as { category: HubCategory }).category;
}

export async function updateHubCategory(
  id: string,
  body: { name?: string; parentCategoryId?: string | null },
) {
  const response = await apiConnector({
    method: "PATCH",
    url: documentHubEndpoints.CATEGORY(id),
    body,
    credentials: true,
  });
  return (response.data as { category: HubCategory }).category;
}

export async function deleteHubCategory(id: string) {
  try {
    await apiConnector({
      method: "DELETE",
      url: documentHubEndpoints.CATEGORY(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete category."));
  }
}

export async function mergeHubCategories(id: string, targetCategoryId: string) {
  try {
    await apiConnector({
      method: "POST",
      url: documentHubEndpoints.CATEGORY_MERGE(id),
      body: { targetCategoryId },
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to merge categories."));
  }
}

export async function listHubTags(q?: string): Promise<HubTag[]> {
  const url = q
    ? `${documentHubEndpoints.TAGS}?q=${encodeURIComponent(q)}`
    : documentHubEndpoints.TAGS;
  const response = await apiConnector({ method: "GET", url, credentials: true });
  return (response.data as { tags: HubTag[] }).tags;
}

export async function listPublicLinks(documentId: string): Promise<HubPublicLink[]> {
  const response = await apiConnector({
    method: "GET",
    url: documentHubEndpoints.PUBLIC_LINKS(documentId),
    credentials: true,
  });
  return (response.data as { publicLinks: HubPublicLink[] }).publicLinks;
}

export async function createPublicLinkApi(
  documentId: string,
  body: { expiresAt?: string | null; allowDownload?: boolean },
) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: documentHubEndpoints.PUBLIC_LINKS(documentId),
      body,
      credentials: true,
    });
    return (response.data as { publicLink: HubPublicLink }).publicLink;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create public link."));
  }
}

export async function revokePublicLinkApi(id: string) {
  try {
    await apiConnector({
      method: "DELETE",
      url: documentHubEndpoints.REVOKE_PUBLIC_LINK(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to revoke public link."));
  }
}

export async function getPublicShare(token: string) {
  try {
    const response = await apiConnector({
      method: "GET",
      url: documentHubEndpoints.PUBLIC_SHARE(token),
      credentials: false,
    });
    return response.data as {
      title: string;
      description: string | null;
      mimeType: string;
      originalFilename: string;
      allowDownload: boolean;
      expiresAt: string | null;
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 410) {
      throw new Error("This link is no longer available.");
    }
    throw new Error(getErrorMessage(error, "Unable to load shared document."));
  }
}

export async function downloadPublicShare(token: string) {
  try {
    const response = await apiConnector({
      method: "GET",
      url: documentHubEndpoints.PUBLIC_DOWNLOAD(token),
      credentials: false,
    });
    return response.data as { sasUrl: string; fileName: string; mimeType: string };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 410) {
      throw new Error("This link is no longer available.");
    }
    throw new Error(getErrorMessage(error, "Unable to download shared document."));
  }
}

export async function listPersonOptions() {
  const response = await apiConnector({
    method: "GET",
    url: `${personEndpoints.LIST}?page=1&limit=200`,
    credentials: true,
  });
  const { persons } = response.data as {
    persons: { id: string; firstName: string; lastName: string }[];
  };
  return persons.map((person) => ({
    value: person.id,
    label: `${person.firstName} ${person.lastName}`.trim(),
  }));
}
