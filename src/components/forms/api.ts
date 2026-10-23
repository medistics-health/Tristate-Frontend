import axios from "axios";
import { apiConnector } from "../../services/apiConnector";
import type { FormRecord, FormTemplate, AuditEntry, QuestionType } from "./types";

const base = (import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "") + "/api/v1";

async function request<T>(method: string, url: string, body?: unknown) {
  try {
    const response = await apiConnector({
      method,
      url: `${base}${url}`,
      body,
      credentials: true,
    });
    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { message?: string; errors?: { message: string }[] } | undefined;
      const message = data?.errors?.[0]?.message || data?.message || "Request failed.";
      throw new Error(message);
    }
    throw error;
  }
}

type ListForm = {
  id: string;
  refCode: string;
  title: string;
  status: FormRecord["status"];
  scheduled?: boolean;
  owner: { firstName?: string; lastName?: string } | string;
  createdAt: string;
  updatedAt: string;
  recipients: number;
  responses: number;
  closeAt: string | null;
  sendAt?: string | null;
};

function ownerName(owner: ListForm["owner"]) {
  if (typeof owner === "string") return owner;
  return [owner?.firstName, owner?.lastName].filter(Boolean).join(" ");
}

export function stubFromList(form: ListForm): FormRecord {
  return {
    id: form.id,
    refCode: form.refCode,
    title: form.title,
    description: "",
    instructions: "",
    status: form.status,
    scheduled: Boolean(form.scheduled),
    owner: ownerName(form.owner),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    version: 1,
    lockVersion: 1,
    responseMode: "IDENTIFIED",
    recordPracticeWhenAnonymous: true,
    oneResponse: true,
    displayMode: "SINGLE_PAGE",
    showProgress: true,
    showNumbers: true,
    allowResume: true,
    confirmationMessage: "Thank you. Your response has been recorded.",
    redirectUrl: "",
    closeAt: form.closeAt,
    sendAt: form.sendAt || null,
    timezone: "UTC",
    publicLinkEnabled: false,
    publicToken: "",
    sections: [],
    recipients: [],
    responses: [],
    recipientCount: form.recipients,
    responseCount: form.responses,
    reminder: {
      enabled: false,
      firstAfterDays: 3,
      repeatEveryDays: 3,
      maxCount: 2,
      finalBeforeCloseDays: null,
      subject: "Reminder: {{form_title}}",
      body: "",
    },
    email: { subject: "", body: "", senderName: "", replyTo: "" },
    detailLoaded: false,
  };
}

export async function listForms() {
  const forms: FormRecord[] = [];
  let page = 1;
  let total = 0;
  do {
    const data = await request<{ forms: ListForm[]; total: number }>("GET", `/forms?page=${page}&pageSize=100`);
    total = data.total;
    forms.push(...data.forms.map(stubFromList));
    page += 1;
  } while (forms.length < total && page < 20);
  return forms;
}

export async function listTemplates() {
  const data = await request<{ templates: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    visibility: string;
    isSystem: boolean;
    ownerId: string | null;
    versionNo: number;
    usageCount: number;
    lastUsedAt: string | null;
  }> }>("GET", "/forms/templates");
  return data.templates.map((template): FormTemplate => ({
    id: template.id,
    name: template.name,
    description: template.description || "",
    category: template.category,
    visibility: template.isSystem ? "SYSTEM" : template.visibility === "SHARED" ? "SHARED" : "PRIVATE",
    owner: template.isSystem ? "System" : "You",
    version: template.versionNo,
    usageCount: template.usageCount,
    lastUsedAt: template.lastUsedAt,
    content: {
      title: template.name,
      description: template.description || "",
      instructions: "",
      confirmationMessage: "",
      responseMode: "IDENTIFIED",
      oneResponse: true,
      displayMode: "SINGLE_PAGE",
      showProgress: true,
      showNumbers: true,
      sections: [],
      reminder: {
        enabled: false,
        firstAfterDays: 3,
        repeatEveryDays: 3,
        maxCount: 2,
        finalBeforeCloseDays: null,
        subject: "",
        body: "",
      },
    },
  }));
}

export async function listAudit() {
  const data = await request<{ audit: AuditEntry[] }>("GET", "/forms/activity");
  return data.audit;
}

export async function getDocument(id: string) {
  const data = await request<{ form: FormRecord }>("GET", `/forms/${id}/document`);
  return { ...data.form, detailLoaded: true };
}

export async function saveDocument(form: FormRecord) {
  const data = await request<{ form: FormRecord }>("PUT", `/forms/${form.id}/document`, form);
  return { ...data.form, detailLoaded: true };
}

export async function createForm(title: string) {
  const data = await request<{ form: { id: string } }>("POST", "/forms", { title });
  return getDocument(data.form.id);
}

export async function createFromTemplate(templateId: string, title?: string) {
  const data = await request<{ form: { id: string } }>("POST", `/forms/templates/${templateId}/use`, { title });
  return getDocument(data.form.id);
}

export async function duplicateForm(id: string) {
  const data = await request<{ form: { id: string } }>("POST", `/forms/${id}/duplicate`, {});
  return getDocument(data.form.id);
}

export async function deleteDraft(id: string) {
  await request("DELETE", `/forms/${id}`, {});
}

export async function publishForm(id: string) {
  await request("POST", `/forms/${id}/publish`, {});
  return getDocument(id);
}

export async function closeForm(id: string) {
  await request("POST", `/forms/${id}/close`, {});
  return getDocument(id);
}

export async function reopenForm(id: string, closeAt: string) {
  await request("POST", `/forms/${id}/reopen`, { closeAt });
  return getDocument(id);
}

export async function archiveForm(id: string) {
  await request("POST", `/forms/${id}/archive`, {});
  return getDocument(id);
}

export async function restoreForm(id: string) {
  await request("POST", `/forms/${id}/restore`, {});
  return getDocument(id);
}

export async function regenerateLink(id: string) {
  await request("PUT", `/forms/${id}/distribution`, { regeneratePublicLink: true, publicLinkEnabled: true });
  return getDocument(id);
}

export async function addRecipientEmails(id: string, emails: string[], practiceIds: string[] = [], personIds: string[] = [], includePracticePersons = false) {
  await request("POST", `/forms/${id}/recipients`, { emails, practiceIds, personIds, includePracticePersons });
  return getDocument(id);
}

export async function removeRecipient(formId: string, recipientId: string) {
  await request("DELETE", `/forms/${formId}/recipients/${recipientId}`, {});
  return getDocument(formId);
}

export async function sendTestEmail(id: string) {
  await request("POST", `/forms/${id}/test-email`, {});
}

export async function sendReminder(id: string) {
  await request("POST", `/forms/${id}/remind`, {});
}

export async function saveFormContent(id: string, body: Record<string, unknown>) {
  const data = await request<{ form: FormRecord }>("PUT", `/forms/${id}/document`, body);
  return { ...data.form, detailLoaded: true };
}

export type ResponseRow = {
  id: string;
  submittedAt: string | null;
  status: string;
  respondent: string | null;
  email: string | null;
  practice: string | null;
};

export async function listResponses(formId: string) {
  const data = await request<{ total: number; responses: ResponseRow[] }>("GET", `/forms/${formId}/responses`);
  return data;
}

export async function getResponse(formId: string, responseId: string) {
  const data = await request<{
    response: {
      id: string;
      submittedAt: string | null;
      respondent: string | null;
      practice: string | null;
      answers: Array<{
        questionId: string;
        label: string;
        type: string;
        value: {
          valueText?: string | null;
          valueNumber?: number | string | null;
          valueDate?: string | null;
          valueJson?: unknown;
        } | null;
      }>;
    };
  }>("GET", `/forms/${formId}/responses/${responseId}`);
  return data.response;
}

export async function saveTemplate(formId: string, meta: { name: string; description: string; category: string; visibility: "PRIVATE" | "SHARED" }) {
  await request("POST", `/forms/${formId}/save-as-template`, meta);
}

export async function deleteTemplate(id: string) {
  await request("DELETE", `/forms/templates/${id}`, {});
}

export async function requestExport(id: string, format: "csv" | "xlsx" | "pdf") {
  const data = await request<{ export: { id: string; status: string } }>("POST", `/forms/${id}/export`, { format });
  if (data.export.status === "READY") {
    const response = await apiConnector({
      method: "GET",
      url: `${base}/forms/exports/${data.export.id}`,
      credentials: true,
      responseType: "blob",
    });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `form-export.${format === "xlsx" ? "xlsx" : format}`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export async function getPublicForm(token: string) {
  const response = await apiConnector({
    method: "GET",
    url: `${base}/f/${token}`,
    credentials: false,
  });
  return response.data as {
    state: string;
    message: string;
    anonymous?: boolean;
    requiresCaptcha?: boolean;
    form?: FormRecord;
  };
}

export async function getCaptcha(token: string) {
  const response = await apiConnector({
    method: "GET",
    url: `${base}/f/${token}/captcha`,
  });
  return response.data as { prompt: string; token: string };
}

export async function submitPublic(token: string, answers: Record<string, unknown>, captcha?: { token: string; answer: string }) {
  const response = await apiConnector({
    method: "POST",
    url: `${base}/f/${token}/submit`,
    body: {
      answers,
      captchaToken: captcha?.token,
      captchaAnswer: captcha?.answer,
    },
  });
  return response.data as { message: string };
}

export async function myForms() {
  const data = await request<{ forms: Array<{ formId: string; title: string; status: string; practice: string; token: string }> }>("GET", "/forms/my-forms");
  return data.forms;
}

export type { QuestionType };
