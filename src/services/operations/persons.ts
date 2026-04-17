import axios from "axios";
import { apiConnector } from "../apiConnector";
import { personEndpoints } from "../apis";
import type { Person, PersonBody, PersonRow, PersonViewData } from "../../components/contact/types";

const { LIST, CREATE, GET, UPDATE, DELETE } = personEndpoints;

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

function personToRow(person: Person): PersonRow {
  return {
    id: person.id,
    values: {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      fullName: `${person.firstName} ${person.lastName}`,
      role: person.role,
      designation: person.designation || "",
      influence: person.influence,
      email: person.email || "",
      phone: person.phone || "",
      practiceId: person.practiceId || "",
      practiceName: person.practice?.name || "",
      creationDate: new Date(person.createdAt).toLocaleString(),
      lastUpdate: new Date(person.updatedAt).toLocaleString(),
    },
  };
}

const fields = [
  { id: "fullName", label: "Name", type: "text" as const, visible: true },
  { id: "role", label: "Role", type: "text" as const, visible: true },
  { id: "designation", label: "Designation", type: "text" as const, visible: true },
  { id: "influence", label: "Influence", type: "text" as const, visible: true },
  { id: "email", label: "Email", type: "text" as const, visible: true },
  { id: "phone", label: "Phone", type: "text" as const, visible: false },
  { id: "practiceName", label: "Practice", type: "text" as const, visible: true },
  { id: "creationDate", label: "Creation date", type: "text" as const, visible: true },
  { id: "lastUpdate", label: "Last update", type: "text" as const, visible: false },
];

export type PersonQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  influence?: string;
  practiceId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function getPersonsView(params?: PersonQueryParams): Promise<PersonViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.role) queryString.set("role", params.role);
    if (params?.influence) queryString.set("influence", params.influence);
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString.toString()}` : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { persons, pagination } = response.data as {
      persons: Person[];
      pagination: { totalRecords: number; totalPages: number; currentPage: number; limit: number };
    };
    return {
      viewId: "person-view-001",
      title: "All Persons",
      totalCount: pagination.totalRecords,
      fields,
      rows: persons.map(personToRow),
      pagination: {
        page: pagination.currentPage,
        limit: pagination.limit,
        total: pagination.totalRecords,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch persons."));
  }
}

export async function getPerson(id: string): Promise<Person> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { person: Person }).person;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch person."));
  }
}

export async function createPersonApi(data: PersonBody): Promise<PersonRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const person = (response.data as { person: Person }).person;
    return personToRow(person);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create person."));
  }
}

export async function updatePersonApi(id: string, data: Partial<PersonBody>): Promise<PersonRow> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const person = (response.data as { person: Person }).person;
    return personToRow(person);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update person."));
  }
}

export async function deletePersonApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete person."));
  }
}
