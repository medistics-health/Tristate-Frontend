import axios from "axios";
import { apiConnector } from "../apiConnector";
import { practiceEndpoints } from "../apis";
import type { Practice, PracticeBody, PracticeRow, PracticeViewData } from "../../components/practices/types";

const { LIST, CREATE, GET, UPDATE, DELETE } = practiceEndpoints;

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

function practiceToRow(practice: Practice): PracticeRow {
  return {
    id: practice.id,
    values: {
      id: practice.id,
      name: practice.name,
      status: practice.status,
      region: practice.region,
      source: practice.source,
      bucket: practice.bucket.join(", "),
      companyId: practice.companyId || "",
      companyName: practice.company?.name || "",
      personsCount: practice._count?.persons || 0,
      dealsCount: practice._count?.deals || 0,
      creationDate: new Date(practice.createdAt).toLocaleString(),
      lastUpdate: new Date(practice.updatedAt).toLocaleString(),
      createdBy: { name: "User", initials: "U" },
      updatedBy: { name: "User", initials: "U" },
    },
  };
}

const fields = [
  { id: "name", label: "Name", type: "text" as const, visible: true },
  { id: "status", label: "Status", type: "text" as const, visible: true },
  { id: "region", label: "Region", type: "text" as const, visible: true },
  { id: "source", label: "Source", type: "text" as const, visible: true },
  { id: "bucket", label: "Bucket", type: "text" as const, visible: false },
  { id: "companyName", label: "Company", type: "text" as const, visible: true },
  { id: "personsCount", label: "Persons", type: "text" as const, visible: false },
  { id: "dealsCount", label: "Deals", type: "text" as const, visible: false },
  { id: "creationDate", label: "Creation date", type: "text" as const, visible: true },
  { id: "lastUpdate", label: "Last update", type: "text" as const, visible: true },
  { id: "createdBy", label: "Created by", type: "text" as const, visible: false },
  { id: "updatedBy", label: "Updated by", type: "text" as const, visible: false },
];

export async function getPracticesView(): Promise<PracticeViewData> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LIST,
      credentials: true,
    });
    const { practices } = response.data as { practices: Practice[] };
    return {
      viewId: "practice-view-001",
      title: "All Practices",
      totalCount: practices.length,
      fields,
      rows: practices.map(practiceToRow),
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch practices."));
  }
}

export async function getAllPractices(): Promise<Practice[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LIST,
      credentials: true,
    });
    const { practices } = response.data as { practices: Practice[] };
    return practices;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch practices."));
  }
}

export async function getPractice(id: string): Promise<Practice> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { practice: Practice }).practice;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch practice."));
  }
}

export async function createPracticeApi(data: PracticeBody): Promise<PracticeRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const practice = (response.data as { practice: Practice }).practice;
    return practiceToRow(practice);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create practice."));
  }
}

export async function updatePracticeApi(id: string, data: Partial<PracticeBody>): Promise<PracticeRow> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const practice = (response.data as { practice: Practice }).practice;
    return practiceToRow(practice);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update practice."));
  }
}

export async function deletePracticeApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete practice."));
  }
}
