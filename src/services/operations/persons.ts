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
  { id: "influence", label: "Influence", type: "text" as const, visible: true },
  { id: "email", label: "Email", type: "text" as const, visible: true },
  { id: "phone", label: "Phone", type: "text" as const, visible: false },
  { id: "practiceName", label: "Practice", type: "text" as const, visible: true },
  { id: "creationDate", label: "Creation date", type: "text" as const, visible: true },
  { id: "lastUpdate", label: "Last update", type: "text" as const, visible: false },
];

export async function getPersonsView(): Promise<PersonViewData> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LIST,
      credentials: true,
    });
    const { persons } = response.data as { persons: Person[] };
    return {
      viewId: "person-view-001",
      title: "All Persons",
      totalCount: persons.length,
      fields,
      rows: persons.map(personToRow),
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
