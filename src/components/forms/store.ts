import { useSyncExternalStore } from "react";
import { readStoredUser } from "../../utils/auth";
import {
  flattenQuestions,
  type AuditEntry,
  type FormQuestion,
  type FormRecord,
  type FormRecipient,
  type FormSection,
  type FormTemplate,
  type QuestionType,
} from "./types";

const STORAGE_KEY = "tristate.form-builder.v1";

type StoreState = {
  forms: FormRecord[];
  templates: FormTemplate[];
  audit: AuditEntry[];
  seq: number;
};

let state: StoreState = { forms: [], templates: [], audit: [], seq: 1 };
const listeners = new Set<() => void>();

function uid(prefix: string) {
  state.seq += 1;
  return `${prefix}-${state.seq.toString(36)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function currentUserName() {
  const user = readStoredUser();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || "Alex Morgan";
}

let persistTimer = 0;

function persistNow() {
  window.clearTimeout(persistTimer);
  persistTimer = 0;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* The draft still lives in memory if storage is full. */
  }
}

function emit() {
  state = { ...state };
  listeners.forEach((listener) => listener());
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(persistNow, 400);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useFormStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function option(label: string, isOther = false) {
  return { id: uid("opt"), label, isOther };
}

function question(
  type: QuestionType,
  label: string,
  extra: Partial<FormQuestion> = {},
): FormQuestion {
  const choice =
    type === "single_choice" ||
    type === "multiple_choice" ||
    type === "dropdown" ||
    type === "image";
  return {
    id: uid("q"),
    key: uid("key"),
    type,
    label,
    helpText: "",
    required: type !== "content",
    options: choice ? [option("Option 1"), option("Option 2")] : [],
    config:
      type === "rating"
        ? { scale: 5, style: "stars", lowLabel: "Poor", highLabel: "Excellent" }
        : type === "yes_no"
          ? { yesLabel: "Yes", noLabel: "No" }
          : type === "price" || type === "fees"
            ? { currency: "USD", decimals: 2 }
            : type === "short_text"
              ? { maxLength: 255, format: "none" }
              : type === "long_text"
                ? { maxLength: 5000 }
                : type === "image"
                  ? { imageMode: "upload", maxFiles: 1, maxSizeMb: 5 }
                  : {},
    logic: null,
    ...extra,
  };
}

function section(title: string, questions: FormQuestion[], description = ""): FormSection {
  return { id: uid("sec"), title, description, questions, logic: null };
}

function defaultEmail(title = "{{form_title}}"): EmailTemplateSeed {
  return {
    subject: `Please complete ${title}`,
    body: "Hello {{recipient_name}},\n\n{{sender_name}} invited you to complete {{form_title}} for {{practice_name}}.\n\nOpen your form: {{form_link}}\n\nPlease submit before {{closing_date}}.",
    senderName: "Tristate",
    replyTo: "forms@tristate.example",
  };
}

type EmailTemplateSeed = FormRecord["email"];

function defaultReminder(): FormRecord["reminder"] {
  return {
    enabled: true,
    firstAfterDays: 3,
    repeatEveryDays: 4,
    maxCount: 3,
    finalBeforeCloseDays: 1,
    subject: "Reminder: {{form_title}} is waiting",
    body: "Hello {{recipient_name}}, this is a reminder to complete {{form_title}}. {{form_link}}",
  };
}

function blankForm(title: string): FormRecord {
  const created = nowIso();
  return {
    id: uid("frm"),
    refCode: nextRef(),
    title,
    description: "",
    instructions: "",
    status: "DRAFT",
    scheduled: false,
    owner: currentUserName(),
    createdAt: created,
    updatedAt: created,
    version: 1,
    responseMode: "IDENTIFIED",
    recordPracticeWhenAnonymous: true,
    oneResponse: true,
    displayMode: "SINGLE_PAGE",
    showProgress: true,
    showNumbers: true,
    allowResume: true,
    confirmationMessage: "Thank you. Your response has been recorded.",
    redirectUrl: "",
    closeAt: null,
    sendAt: null,
    timezone: "America/New_York",
    publicLinkEnabled: false,
    publicToken: uid("pub"),
    sections: [section("Section 1", [])],
    recipients: [],
    responses: [],
    reminder: defaultReminder(),
    email: defaultEmail(title),
  };
}

function nextRef() {
  const year = new Date().getFullYear();
  const count = state.forms.length + 1;
  return `FRM-${year}-${String(count).padStart(4, "0")}`;
}

function audit(action: string, form: Pick<FormRecord, "id" | "title">, summary: string) {
  state.audit.unshift({
    id: uid("aud"),
    at: nowIso(),
    user: currentUserName(),
    action,
    formId: form.id,
    formTitle: form.title,
    summary,
  });
}

function touch(form: FormRecord) {
  form.updatedAt = nowIso();
}

export function getForm(id: string) {
  return state.forms.find((form) => form.id === id) ?? null;
}

export function createForm(title = "Untitled form") {
  const form = blankForm(title.trim() || "Untitled form");
  state.forms.unshift(form);
  audit("Create", form, "Created a draft form.");
  emit();
  return form;
}

export function createFromTemplate(templateId: string) {
  const template = state.templates.find((item) => item.id === templateId);
  if (!template) return null;
  const form = blankForm(template.content.title || template.name);
  form.description = template.content.description;
  form.instructions = template.content.instructions;
  form.confirmationMessage = template.content.confirmationMessage;
  form.responseMode = template.content.responseMode;
  form.oneResponse = template.content.oneResponse;
  form.displayMode = template.content.displayMode;
  form.showProgress = template.content.showProgress;
  form.showNumbers = template.content.showNumbers;
  form.sections = structuredClone(template.content.sections);
  form.reminder = structuredClone(template.content.reminder);
  template.usageCount += 1;
  template.lastUsedAt = nowIso();
  state.forms.unshift(form);
  audit("Create from template", form, `Created from “${template.name}”.`);
  emit();
  return form;
}

export function updateForm(id: string, patch: Partial<FormRecord>) {
  const form = getForm(id);
  if (!form) return;
  Object.assign(form, patch, { updatedAt: nowIso() });
  emit();
}

export function duplicateForm(id: string) {
  const source = getForm(id);
  if (!source) return null;
  const copy = structuredClone(source);
  copy.id = uid("frm");
  copy.refCode = nextRef();
  copy.title = `Copy of ${source.title}`;
  copy.status = "DRAFT";
  copy.scheduled = false;
  copy.owner = currentUserName();
  copy.createdAt = nowIso();
  copy.updatedAt = copy.createdAt;
  copy.recipients = [];
  copy.responses = [];
  copy.sendAt = null;
  copy.closeAt = null;
  copy.publicToken = uid("pub");
  state.forms.unshift(copy);
  audit("Duplicate", copy, `Duplicated from ${source.refCode}.`);
  emit();
  return copy;
}

export function deleteDraft(id: string) {
  const form = getForm(id);
  if (!form || form.status !== "DRAFT") return false;
  state.forms = state.forms.filter((item) => item.id !== id);
  audit("Delete", form, "Soft-deleted a draft form.");
  emit();
  return true;
}

export function publishValidation(form: FormRecord) {
  const errors: { message: string; target: string }[] = [];
  if (!form.title.trim()) errors.push({ message: "Title is required.", target: "settings" });
  const questions = flattenQuestions(form);
  if (questions.length === 0) {
    errors.push({ message: "Add at least one question.", target: "builder" });
  }
  questions.forEach(({ question: item }, index) => {
    if (item.type !== "content" && !item.label.trim()) {
      errors.push({ message: `Question ${index + 1} needs a label.`, target: item.id });
    }
    const choice =
      item.type === "single_choice" ||
      item.type === "multiple_choice" ||
      item.type === "dropdown" ||
      (item.type === "image" && item.config.imageMode === "choice");
    if (choice && item.options.filter((optionItem) => optionItem.label.trim()).length < 2) {
      errors.push({
        message: `“${item.label || "Untitled"}” needs at least two options.`,
        target: item.id,
      });
    }
    item.logic?.conditions.forEach((condition) => {
      const sourceIndex = questions.findIndex(
        (entry) => entry.question.id === condition.sourceQuestionId,
      );
      if (sourceIndex === -1 || sourceIndex >= index) {
        errors.push({
          message: `Logic on “${item.label}” references a missing or later question.`,
          target: item.id,
        });
      }
    });
  });
  const activeRecipients = form.recipients.filter((item) => item.status !== "REMOVED");
  if (!form.publicLinkEnabled && activeRecipients.length === 0) {
    errors.push({
      message: "Add recipients or enable the public link before publishing.",
      target: "distribution",
    });
  }
  if (form.closeAt && new Date(form.closeAt).getTime() <= Date.now()) {
    errors.push({ message: "Closing date must be in the future.", target: "distribution" });
  }
  if (!form.email.body.includes("{{form_link}}")) {
    errors.push({
      message: "Invitation email must include {{form_link}}.",
      target: "distribution",
    });
  }
  return errors;
}

export function publishForm(id: string, scheduled: boolean) {
  const form = getForm(id);
  if (!form) return [];
  const errors = publishValidation(form);
  if (errors.length) return errors;
  form.status = "PUBLISHED";
  form.scheduled = scheduled;
  if (!scheduled) {
    form.sendAt = nowIso();
    form.recipients.forEach((recipient) => {
      if (recipient.status === "PENDING") {
        recipient.status = recipient.email.includes("bounce") ? "BOUNCED" : "NOT_OPENED";
        recipient.delivery = recipient.status === "BOUNCED" ? "BOUNCED" : "DELIVERED";
        recipient.sentAt = nowIso();
      }
    });
  }
  touch(form);
  audit("Publish", form, scheduled ? "Scheduled the invitation." : "Published and queued invitations.");
  emit();
  return [];
}

export function closeForm(id: string) {
  const form = getForm(id);
  if (!form || form.status !== "PUBLISHED") return;
  form.status = "CLOSED";
  form.scheduled = false;
  form.recipients.forEach((recipient) => {
    if (recipient.status === "NOT_OPENED" || recipient.status === "IN_PROGRESS") {
      recipient.status = "EXPIRED";
    }
  });
  touch(form);
  audit("Close", form, "Closed the form. Pending recipients expired.");
  emit();
}

export function reopenForm(id: string, closeAt: string) {
  const form = getForm(id);
  if (!form || form.status !== "CLOSED") return;
  form.status = "PUBLISHED";
  form.closeAt = closeAt;
  form.recipients.forEach((recipient) => {
    if (recipient.status === "EXPIRED") recipient.status = "NOT_OPENED";
  });
  touch(form);
  audit("Re-open", form, `Re-opened until ${closeAt}.`);
  emit();
}

export function archiveForm(id: string) {
  const form = getForm(id);
  if (!form || form.status !== "CLOSED") return false;
  form.status = "ARCHIVED";
  touch(form);
  audit("Archive", form, "Archived the form.");
  emit();
  return true;
}

export function restoreForm(id: string) {
  const form = getForm(id);
  if (!form || form.status !== "ARCHIVED") return;
  form.status = "CLOSED";
  touch(form);
  audit("Restore", form, "Restored the form to Closed.");
  emit();
}

export function addSection(formId: string) {
  const form = getForm(formId);
  if (!form) return;
  form.sections.push(section(`Section ${form.sections.length + 1}`, []));
  touch(form);
  emit();
}

export function updateSection(formId: string, sectionId: string, patch: Partial<FormSection>) {
  const form = getForm(formId);
  const target = form?.sections.find((item) => item.id === sectionId);
  if (!form || !target) return;
  Object.assign(target, patch);
  touch(form);
  emit();
}

export function deleteSection(formId: string, sectionId: string, moveToId?: string) {
  const form = getForm(formId);
  if (!form || form.sections.length < 2) return;
  const index = form.sections.findIndex((item) => item.id === sectionId);
  if (index < 0) return;
  const [removed] = form.sections.splice(index, 1);
  if (moveToId) {
    const target = form.sections.find((item) => item.id === moveToId);
    target?.questions.push(...removed.questions);
  }
  touch(form);
  emit();
}

export function addQuestion(formId: string, sectionId: string, type: QuestionType, index?: number) {
  const form = getForm(formId);
  const target = form?.sections.find((item) => item.id === sectionId);
  if (!form || !target) return null;
  const created = question(type, type === "content" ? "Information" : "");
  if (typeof index === "number") target.questions.splice(index, 0, created);
  else target.questions.push(created);
  touch(form);
  emit();
  return created;
}

export function updateQuestion(
  formId: string,
  questionId: string,
  patch: Partial<FormQuestion>,
) {
  const form = getForm(formId);
  const found = form ? flattenQuestions(form).find((item) => item.question.id === questionId) : null;
  if (!form || !found) return;
  Object.assign(found.question, patch);
  touch(form);
  emit();
}

export function deleteQuestion(formId: string, questionId: string) {
  const form = getForm(formId);
  if (!form) return;
  form.sections.forEach((item) => {
    item.questions = item.questions.filter((questionItem) => questionItem.id !== questionId);
    if (item.logic) {
      item.logic.conditions = item.logic.conditions.filter(
        (condition) => condition.sourceQuestionId !== questionId,
      );
    }
    item.questions.forEach((questionItem) => {
      if (!questionItem.logic) return;
      questionItem.logic.conditions = questionItem.logic.conditions.filter(
        (condition) => condition.sourceQuestionId !== questionId,
      );
    });
  });
  touch(form);
  emit();
}

export function duplicateQuestion(formId: string, questionId: string) {
  const form = getForm(formId);
  if (!form) return;
  for (const item of form.sections) {
    const index = item.questions.findIndex((questionItem) => questionItem.id === questionId);
    if (index < 0) continue;
    const copy = structuredClone(item.questions[index]);
    copy.id = uid("q");
    copy.key = uid("key");
    copy.label = `${copy.label || "Question"} (copy)`;
    item.questions.splice(index + 1, 0, copy);
    break;
  }
  touch(form);
  emit();
}

export function moveQuestion(
  formId: string,
  questionId: string,
  direction: "up" | "down",
) {
  const form = getForm(formId);
  if (!form) return { ok: false, message: "" };
  const flat = flattenQuestions(form);
  const index = flat.findIndex((item) => item.question.id === questionId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= flat.length) {
    return { ok: false, message: "" };
  }
  const current = flat[index];
  const neighbor = flat[swapIndex];
  const currentList = current.section.questions;
  const from = currentList.findIndex((item) => item.id === questionId);
  const [moved] = currentList.splice(from, 1);
  if (current.section.id === neighbor.section.id) {
    const to = currentList.findIndex((item) => item.id === neighbor.question.id);
    currentList.splice(direction === "up" ? to : to + 1, 0, moved);
  } else {
    const targetList = neighbor.section.questions;
    const to = targetList.findIndex((item) => item.id === neighbor.question.id);
    targetList.splice(direction === "up" ? to : to + 1, 0, moved);
  }
  touch(form);
  emit();
  return { ok: true, message: "" };
}

export function setRecipients(formId: string, recipients: FormRecipient[]) {
  const form = getForm(formId);
  if (!form) return;
  const seen = new Set<string>();
  const merged: FormRecipient[] = [];
  let duplicates = 0;
  recipients.forEach((recipient) => {
    const key = recipient.email.trim().toLowerCase();
    if (!key || seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);
    merged.push({ ...recipient, email: recipient.email.trim() });
  });
  form.recipients = merged;
  touch(form);
  audit("Recipients", form, `Updated recipient list (${merged.length}).`);
  emit();
  return duplicates;
}

export function makeRecipient(partial: Omit<FormRecipient, "id" | "token" | "reminderCount" | "lastReminderAt"> & Partial<FormRecipient>): FormRecipient {
  return {
    reminderCount: 0,
    lastReminderAt: null,
    ...partial,
    id: partial.id || uid("rcp"),
    token: partial.token || uid("tok"),
  };
}

export function updateRecipient(formId: string, recipientId: string, patch: Partial<FormRecipient>) {
  const form = getForm(formId);
  const recipient = form?.recipients.find((item) => item.id === recipientId);
  if (!form || !recipient) return;
  Object.assign(recipient, patch);
  touch(form);
  emit();
}

export function submitResponse(
  formId: string,
  recipientId: string | null,
  answers: FormRecord["responses"][number]["answers"],
  practice = "",
  respondent = "Anonymous",
) {
  const form = getForm(formId);
  if (!form || form.status !== "PUBLISHED") return { ok: false, reason: "closed" as const };
  if (form.closeAt && new Date(form.closeAt).getTime() < Date.now()) {
    return { ok: false, reason: "closed" as const };
  }
  const recipient = recipientId
    ? form.recipients.find((item) => item.id === recipientId)
    : null;
  if (recipient && (recipient.status === "REMOVED" || recipient.status === "EXPIRED")) {
    return { ok: false, reason: "invalid" as const };
  }
  if (form.oneResponse && recipient?.status === "COMPLETED") {
    return { ok: false, reason: "already" as const };
  }
  form.responses.push({
    id: uid("rsp"),
    recipientId: form.responseMode === "ANONYMOUS" ? null : recipientId,
    practice: form.responseMode === "ANONYMOUS" && !form.recordPracticeWhenAnonymous ? "" : practice || recipient?.practice || "",
    respondent: form.responseMode === "ANONYMOUS" ? "Anonymous" : respondent || recipient?.name || "Respondent",
    submittedAt: nowIso(),
    answers,
  });
  if (recipient) {
    recipient.status = "COMPLETED";
    recipient.completedAt = nowIso();
  }
  touch(form);
  audit("Response", form, "A response was submitted.");
  emit();
  return { ok: true as const };
}

export function markOpened(formId: string, recipientId: string) {
  const form = getForm(formId);
  const recipient = form?.recipients.find((item) => item.id === recipientId);
  if (!form || !recipient || recipient.status !== "NOT_OPENED") return;
  recipient.status = "IN_PROGRESS";
  recipient.openedAt = nowIso();
  emit();
}

export function saveAsTemplate(
  formId: string,
  meta: { name: string; description: string; category: string; visibility: "PRIVATE" | "SHARED" },
) {
  const form = getForm(formId);
  if (!form) return;
  state.templates.unshift({
    id: uid("tpl"),
    name: meta.name,
    description: meta.description,
    category: meta.category,
    visibility: meta.visibility,
    owner: currentUserName(),
    version: 1,
    usageCount: 0,
    lastUsedAt: null,
    content: {
      title: form.title,
      description: form.description,
      instructions: form.instructions,
      confirmationMessage: form.confirmationMessage,
      responseMode: form.responseMode,
      oneResponse: form.oneResponse,
      displayMode: form.displayMode,
      showProgress: form.showProgress,
      showNumbers: form.showNumbers,
      sections: structuredClone(form.sections),
      reminder: structuredClone(form.reminder),
    },
  });
  audit("Save template", form, `Saved template “${meta.name}”.`);
  emit();
}

export function deleteTemplate(id: string) {
  const template = state.templates.find((item) => item.id === id);
  if (!template || template.visibility === "SYSTEM") return;
  state.templates = state.templates.filter((item) => item.id !== id);
  emit();
}

function seed(): StoreState {
  state = { forms: [], templates: [], audit: [], seq: 100 };
  const q1 = question("rating", "How satisfied are you with onboarding support?", {
    required: true,
    config: { scale: 5, style: "numbers", lowLabel: "Not satisfied", highLabel: "Very satisfied" },
  });
  const q2 = question("multiple_choice", "Which services are active for your practice?", {
    options: [
      option("Credentialing"),
      option("Revenue cycle"),
      option("Benefits"),
      option("IT support"),
    ],
  });
  const q3 = question("yes_no", "Would you recommend Tristate to another practice?");
  const q4 = question("long_text", "What should we improve?", {
    required: false,
    logic: {
      action: "SHOW",
      match: "ALL",
      conditions: [
        { id: uid("cnd"), sourceQuestionId: q3.id, operator: "is", value: "No" },
      ],
    },
  });
  const q5 = question("date", "Preferred date for a follow-up call", { required: false });

  const practices = [
    "Riverside Family Medicine",
    "Oak Street Pediatrics",
    "Harbor Dental Group",
    "Northwind Cardiology",
  ];
  const people = [
    ["Ava Chen", "ava.chen@riverside.example"],
    ["Noah Patel", "noah.patel@oakstreet.example"],
    ["Mia Alvarez", "mia.alvarez@harbor.example"],
    ["Liam Brooks", "liam.brooks@northwind.example"],
    ["Sofia Nguyen", "sofia.nguyen@riverside.example"],
    ["Ethan Cole", "ethan.cole@oakstreet.example"],
    ["bounce.test", "front-desk@invalid-bounce.example"],
    ["Priya Shah", "priya.shah@harbor.example"],
  ];
  const statuses: FormRecipient["status"][] = [
    "COMPLETED",
    "COMPLETED",
    "IN_PROGRESS",
    "NOT_OPENED",
    "COMPLETED",
    "COMPLETED",
    "BOUNCED",
    "COMPLETED",
  ];

  const survey = blankForm("Practice satisfaction survey");
  survey.description = "Quarterly check-in with active practices.";
  survey.instructions = "This takes about three minutes. Required questions are marked.";
  survey.status = "PUBLISHED";
  survey.closeAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString();
  survey.sections = [section("Experience", [q1, q2, q3, q4], "Tell us how the last quarter felt."), section("Follow-up", [q5])];
  survey.recipients = people.map((person, index) =>
    makeRecipient({
      source: index % 2 === 0 ? "PERSON" : "PRACTICE",
      practice: practices[index % practices.length],
      name: person[0] === "bounce.test" ? "Front desk" : person[0],
      email: person[1],
      status: statuses[index],
      delivery: statuses[index] === "BOUNCED" ? "BOUNCED" : "DELIVERED",
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      openedAt: statuses[index] === "NOT_OPENED" || statuses[index] === "BOUNCED" ? null : new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      completedAt: statuses[index] === "COMPLETED" ? new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 1)).toISOString() : null,
      reminderCount: statuses[index] === "NOT_OPENED" ? 1 : 0,
      lastReminderAt: statuses[index] === "NOT_OPENED" ? new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() : null,
    }),
  );
  const completed = survey.recipients.filter((item) => item.status === "COMPLETED");
  const ratings = ["5", "4", "5", "3", "4"];
  const services = [
    ["Credentialing", "Revenue cycle"],
    ["Credentialing"],
    ["Benefits", "IT support"],
    ["Revenue cycle", "Benefits"],
    ["Credentialing", "IT support"],
  ];
  const yesNo = ["Yes", "Yes", "No", "Yes", "Yes"];
  survey.responses = completed.map((recipient, index) => ({
    id: uid("rsp"),
    recipientId: recipient.id,
    practice: recipient.practice,
    respondent: recipient.name,
    submittedAt: recipient.completedAt || nowIso(),
    answers: {
      [q1.id]: ratings[index] || "4",
      [q2.id]: services[index] || ["Credentialing"],
      [q3.id]: yesNo[index] || "Yes",
      [q4.id]: yesNo[index] === "No" ? "Faster credentialing status updates." : "",
      [q5.id]: "2026-11-04",
    },
  }));

  const intake = blankForm("Provider credentialing intake");
  intake.description = "Collect provider details before a credentialing file is opened.";
  intake.sections = [
    section("Provider", [
      question("short_text", "Provider full name"),
      question("email", "Work email"),
      question("phone", "Mobile phone"),
      question("dropdown", "Primary specialty", {
        options: [option("Family medicine"), option("Pediatrics"), option("Cardiology"), option("Dental")],
      }),
    ]),
    section("Documents", [
      question("image", "Upload a copy of the state license", {
        config: { imageMode: "upload", maxFiles: 1, maxSizeMb: 5 },
        options: [],
      }),
      question("date", "License expiration date"),
    ]),
  ];

  const compliance = blankForm("Q3 compliance attestation");
  compliance.status = "CLOSED";
  compliance.closeAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString();
  compliance.sections = [
    section("Attestation", [
      question("yes_no", "Policies were reviewed this quarter"),
      question("single_choice", "Overall risk level", {
        options: [option("Low"), option("Medium"), option("High")],
      }),
    ]),
  ];

  const satisfaction = blankForm("Customer satisfaction");
  satisfaction.sections = [
    section("Feedback", [
      question("rating", "Overall satisfaction"),
      question("long_text", "Comments", { required: false }),
    ]),
  ];

  state.forms = [];
  [survey, intake, compliance].forEach((form) => {
    form.refCode = nextRef();
    state.forms.push(form);
  });
  state.templates = [
    {
      id: uid("tpl"),
      name: "Customer satisfaction",
      description: "Short score plus an open comment.",
      category: "Feedback",
      visibility: "SYSTEM",
      owner: "System",
      version: 1,
      usageCount: 12,
      lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
      content: {
        title: satisfaction.title,
        description: "Tell us how we did.",
        instructions: satisfaction.instructions,
        confirmationMessage: satisfaction.confirmationMessage,
        responseMode: "ANONYMOUS",
        oneResponse: true,
        displayMode: "SINGLE_PAGE",
        showProgress: true,
        showNumbers: true,
        sections: structuredClone(satisfaction.sections),
        reminder: structuredClone(satisfaction.reminder),
      },
    },
    {
      id: uid("tpl"),
      name: "Practice feedback",
      description: "Service mix, recommendation, and a follow-up date.",
      category: "Practices",
      visibility: "SYSTEM",
      owner: "System",
      version: 1,
      usageCount: 4,
      lastUsedAt: null,
      content: {
        title: survey.title,
        description: survey.description,
        instructions: survey.instructions,
        confirmationMessage: survey.confirmationMessage,
        responseMode: "IDENTIFIED",
        oneResponse: true,
        displayMode: "MULTI_PAGE",
        showProgress: true,
        showNumbers: true,
        sections: structuredClone(survey.sections),
        reminder: structuredClone(survey.reminder),
      },
    },
    {
      id: uid("tpl"),
      name: "Event registration",
      description: "Name, email, and session choice.",
      category: "Events",
      visibility: "SYSTEM",
      owner: "System",
      version: 1,
      usageCount: 7,
      lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      content: {
        title: "Event registration",
        description: "Register a practice contact for an upcoming session.",
        instructions: "",
        confirmationMessage: "You are registered. A confirmation will follow.",
        responseMode: "IDENTIFIED",
        oneResponse: true,
        displayMode: "SINGLE_PAGE",
        showProgress: false,
        showNumbers: false,
        sections: [
          section("Registration", [
            question("short_text", "Attendee name"),
            question("email", "Email"),
            question("single_choice", "Session", {
              options: [option("Morning workshop"), option("Afternoon clinic")],
            }),
          ]),
        ],
        reminder: defaultReminder(),
      },
    },
  ];
  state.audit = [
    {
      id: uid("aud"),
      at: survey.updatedAt,
      user: "Alex Morgan",
      action: "Publish",
      formId: survey.id,
      formTitle: survey.title,
      summary: "Published and queued invitations.",
    },
  ];
  return state;
}

function load(): StoreState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (parsed?.forms && parsed.templates) return parsed;
    }
  } catch {
    /* seed below */
  }
  const seeded = seed();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

state = load();

window.addEventListener("pagehide", persistNow);
