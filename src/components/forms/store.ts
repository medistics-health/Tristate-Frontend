import { useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { readStoredUser } from "../../utils/auth";
import * as formApi from "./api";
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

type StoreState = {
  forms: FormRecord[];
  templates: FormTemplate[];
  audit: AuditEntry[];
  seq: number;
};

let state: StoreState = { forms: [], templates: [], audit: [], seq: 1 };
const listeners = new Set<() => void>();

function uid(_prefix: string) {
  state.seq += 1;
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function currentUserName() {
  const user = readStoredUser();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || "Alex Morgan";
}

const saveTimers = new Map<string, number>();
const localDraftIds = new Set<string>();
const templateDraftIds = new Set<string>();
const savedTitles = new Map<string, string>();
const formRevision = new Map<string, number>();
const saveChain = new Map<string, Promise<unknown>>();

export function isUnsavedForm(id: string) {
  return localDraftIds.has(id);
}

function replaceForm(form: FormRecord) {
  const index = state.forms.findIndex((item) => item.id === form.id);
  if (index >= 0) state.forms[index] = form;
  else state.forms.unshift(form);
  if (!localDraftIds.has(form.id)) savedTitles.set(form.id, form.title);
  emit();
}

function scheduleSave(id: string) {
  if (localDraftIds.has(id)) return;
  window.clearTimeout(saveTimers.get(id));
  saveTimers.set(
    id,
    window.setTimeout(() => {
      void flushSave(id).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to save this form.");
      });
    }, 600),
  );
}

function withoutEmptySections(form: FormRecord) {
  const copy = structuredClone(form);
  copy.sections = copy.sections.filter((item) => item.questions.length > 0);
  return copy;
}

async function saveLatest(id: string) {
  const form = getForm(id);
  if (!form?.detailLoaded || localDraftIds.has(id)) return form ?? null;
  if (flattenQuestions(form).length === 0) {
    throw new Error("Add at least one question before saving this form.");
  }
  const revision = formRevision.get(id) || 0;
  const emptyIds = new Set(form.sections.filter((item) => item.questions.length === 0).map((item) => item.id));
  let saved;
  try {
    saved = await formApi.saveDocument(withoutEmptySections(form));
  } catch (error) {
    const current = getForm(id);
    const previous = savedTitles.get(id);
    if (current && previous && error instanceof Error && /already exists/i.test(error.message)) {
      current.title = previous;
      emit();
    }
    throw error;
  }
  const current = getForm(id);
  if (!current) return saved;
  if ((formRevision.get(id) || 0) !== revision) {
    current.lockVersion = saved.lockVersion;
    current.version = saved.version;
    current.sections = current.sections.filter((item) => item.questions.length > 0 || !emptyIds.has(item.id));
    emit();
    return current;
  }
  replaceForm(saved);
  return saved;
}

export function flushSave(id: string) {
  window.clearTimeout(saveTimers.get(id));
  const previous = saveChain.get(id) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(() => saveLatest(id));
  saveChain.set(id, run);
  return run;
}

export async function loadFormDocument(id: string) {
  const form = await formApi.getDocument(id);
  replaceForm(form);
  return form;
}

let loading: Promise<void> | null = null;

export function loadForms() {
  if (loading) return loading;
  loading = (async () => {
    const [listed, templates] = await Promise.all([
      formApi.listForms({ page: 1, pageSize: 100 }),
      formApi.listTemplates(),
    ]);
    const forms = listed.forms;
    const locals = state.forms.filter((form) => localDraftIds.has(form.id));
    const detailed = new Map(
      state.forms.filter((form) => form.detailLoaded && !localDraftIds.has(form.id)).map((form) => [form.id, form]),
    );
    state.forms = [...locals, ...forms.map((form) => detailed.get(form.id) || form)];
    state.templates = templates;
    state.audit = [];
    emit();
  })().finally(() => {
    loading = null;
  });
  return loading;
}

function emit() {
  state = { ...state, forms: [...state.forms], templates: [...state.templates], audit: [...state.audit] };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useFormStore() {
  void loadForms();
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
    type === "dropdown";
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
    displayTitle: "",
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
  formRevision.set(form.id, (formRevision.get(form.id) || 0) + 1);
  if (form.detailLoaded) scheduleSave(form.id);
}

export function getForm(id: string) {
  return state.forms.find((form) => form.id === id) ?? null;
}

export function beginNewForm(title = "Untitled form", asTemplate = false) {
  for (const id of [...localDraftIds]) discardLocalForm(id);
  const form = blankForm(title);
  if (asTemplate) templateDraftIds.add(form.id);
  form.detailLoaded = true;
  localDraftIds.add(form.id);
  replaceForm(form);
  return form;
}

export function discardLocalForm(id: string) {
  if (!localDraftIds.has(id)) return;
  localDraftIds.delete(id);
  templateDraftIds.delete(id);
  window.clearTimeout(saveTimers.get(id));
  saveTimers.delete(id);
  state.forms = state.forms.filter((form) => form.id !== id);
  emit();
}

export async function persistLocalForm(id: string) {
  const form = getForm(id);
  if (!form || !localDraftIds.has(id)) return form;
  if (flattenQuestions(form).length === 0) {
    throw new Error("Add at least one question before saving this form.");
  }
  const created = await formApi.createForm(form.title.trim() || "Untitled form");
  if (!localDraftIds.has(id)) {
    await formApi.deleteDraft(created.id).catch(() => undefined);
    return null;
  }
  try {
    const saved = await formApi.saveDocument(withoutEmptySections({
      ...form,
      id: created.id,
      refCode: created.refCode,
      lockVersion: created.lockVersion,
      version: created.version,
      publicToken: created.publicToken,
      owner: created.owner,
      createdAt: created.createdAt,
      status: created.status,
    }));
    if (!localDraftIds.has(id)) {
      await formApi.deleteDraft(created.id).catch(() => undefined);
      return null;
    }
    localDraftIds.delete(id);
    window.clearTimeout(saveTimers.get(id));
    saveTimers.delete(id);
    state.forms = state.forms.filter((item) => item.id !== id);
    replaceForm(saved);
    return saved;
  } catch (error) {
    await formApi.deleteDraft(created.id).catch(() => undefined);
    throw error;
  }
}

export async function createForm(title = "Untitled form") {
  const form = await formApi.createForm(title.trim() || "Untitled form");
  replaceForm(form);
  return form;
}

export async function createFromTemplate(templateId: string) {
  const template = state.templates.find((item) => item.id === templateId);
  const form = await formApi.createFromTemplate(templateId, template?.name);
  replaceForm(form);
  await loadForms();
  return form;
}

export function nameTakenMessage(id: string, title: string) {
  const name = title.trim().toLowerCase();
  if (!name) return "Name is required.";
  const asTemplate = templateDraftIds.has(id);
  const taken = asTemplate
    ? state.templates.some((item) => item.name.trim().toLowerCase() === name)
    : state.forms.some((item) => item.id !== id && item.title.trim().toLowerCase() === name);
  if (!taken) return "";
  return asTemplate ? "A template with this name already exists." : "A form with this name already exists.";
}

export function updateForm(id: string, patch: Partial<FormRecord>) {
  if (patch.publicToken) {
    if (localDraftIds.has(id)) {
      const draft = getForm(id);
      if (!draft) return;
      draft.publicToken = uid("pub");
      draft.publicLinkEnabled = true;
      emit();
      return;
    }
    void formApi.regenerateLink(id).then(replaceForm);
    return;
  }
  const form = getForm(id);
  if (!form) return;
  if (typeof patch.title === "string" && nameTakenMessage(id, patch.title)) return false;
  Object.assign(form, patch, { updatedAt: nowIso() });
  emit();
  if (form.detailLoaded) scheduleSave(id);
}

export async function duplicateForm(id: string) {
  const copy = await formApi.duplicateForm(id);
  replaceForm(copy);
  return copy;
}

export async function deleteDraft(id: string) {
  const form = getForm(id);
  if (!form || form.status !== "DRAFT") return false;
  await formApi.deleteDraft(id);
  state.forms = state.forms.filter((item) => item.id !== id);
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
        message: `"${item.label || "Untitled"}" needs at least two options.`,
        target: item.id,
      });
    }
    item.logic?.conditions.forEach((condition) => {
      const sourceIndex = questions.findIndex(
        (entry) => entry.question.id === condition.sourceQuestionId,
      );
      if (sourceIndex === -1 || sourceIndex >= index) {
        errors.push({
          message: `Logic on "${item.label}" references a missing or later question.`,
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

export async function publishForm(id: string, _scheduled: boolean) {
  const form = getForm(id);
  if (!form) return [];
  await flushSave(id);
  const latest = getForm(id);
  if (!latest) return [];
  const errors = publishValidation(latest);
  if (errors.length) return errors;
  try {
    await formApi.publishForm(id);
    replaceForm(await formApi.getDocument(id));
    return [];
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : "Unable to publish.", target: "builder" }];
  }
}

export async function closeForm(id: string) {
  replaceForm(await formApi.closeForm(id));
}

export async function reopenForm(id: string, closeAt: string) {
  replaceForm(await formApi.reopenForm(id, closeAt));
}

export async function archiveForm(id: string) {
  const form = getForm(id);
  if (!form || form.status !== "CLOSED") return false;
  replaceForm(await formApi.archiveForm(id));
  return true;
}

export async function restoreForm(id: string) {
  replaceForm(await formApi.restoreForm(id));
}

const defaultSectionTitle = /^Section \d+$/;

function renumberSections(form: FormRecord) {
  form.sections.forEach((item, index) => {
    if (defaultSectionTitle.test(item.title.trim())) item.title = `Section ${index + 1}`;
  });
}

export function addSection(formId: string) {
  const form = getForm(formId);
  if (!form) return;
  form.sections.push(section("Section 1", []));
  renumberSections(form);
  emit();
}

export function updateSection(formId: string, sectionId: string, patch: Partial<FormSection>) {
  const form = getForm(formId);
  const target = form?.sections.find((item) => item.id === sectionId);
  if (!form || !target) return;
  Object.assign(target, patch);
  if (target.questions.length > 0) touch(form);
  else emit();
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
  renumberSections(form);
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

const defaultOptionLabel = /^Option \d+$/;

function renumberOptions(options: FormQuestion["options"]) {
  options.forEach((option, index) => {
    if (!option.isOther && defaultOptionLabel.test(option.label.trim())) option.label = `Option ${index + 1}`;
  });
}

export function updateQuestion(
  formId: string,
  questionId: string,
  patch: Partial<FormQuestion>,
) {
  const form = getForm(formId);
  const found = form ? flattenQuestions(form).find((item) => item.question.id === questionId) : null;
  if (!form || !found) return;
  if (patch.options) renumberOptions(patch.options);
  Object.assign(found.question, patch);
  const index = found.section.questions.findIndex((item) => item.id === questionId);
  if (index >= 0) found.section.questions[index] = { ...found.section.questions[index] };
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

export async function setRecipients(
  formId: string,
  recipients: FormRecipient[],
  extra: { practiceIds?: string[]; personIds?: string[]; includePracticePersons?: boolean } = {},
) {
  const form = getForm(formId);
  if (!form) return 0;
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
  const previous = new Set(form.recipients.map((recipient) => recipient.email.toLowerCase()));
  const emails = merged.filter((recipient) => !previous.has(recipient.email.toLowerCase()) && !extra.practiceIds?.length && !extra.personIds?.length).map((recipient) => recipient.email);
  await formApi.addRecipientEmails(
    formId,
    extra.practiceIds?.length || extra.personIds?.length ? merged.filter((recipient) => recipient.source === "NEW_EMAIL").map((recipient) => recipient.email) : emails,
    extra.practiceIds || [],
    extra.personIds || [],
    Boolean(extra.includePracticePersons),
  );
  replaceForm(await formApi.getDocument(formId));
  return duplicates;
}

export async function sendTestEmail(formId: string) {
  await formApi.sendTestEmail(formId);
}

export async function sendReminder(formId: string) {
  await formApi.sendReminder(formId);
  await loadFormDocument(formId);
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
  if (patch.status === "REMOVED") {
    void formApi.removeRecipient(formId, recipientId).then(replaceForm);
    return;
  }
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

export async function saveAsTemplate(
  formId: string,
  meta: { name: string; description: string; category: string; visibility: "PRIVATE" | "SHARED" },
) {
  const form = getForm(formId);
  if (!form || flattenQuestions(form).length === 0) {
    throw new Error("Add at least one question before saving this template.");
  }
  await flushSave(formId);
  await formApi.saveTemplate(formId, meta);
  await loadForms();
}

export async function saveLocalAsTemplateOnly(localId: string) {
  const local = getForm(localId);
  if (!local) return false;
  if (flattenQuestions(local).length === 0) {
    throw new Error("Add at least one question before saving this template.");
  }
  const name = local.title.trim() || "Untitled template";
  if (state.templates.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())) {
    throw new Error("A template with this name already exists.");
  }
  const snapshot = JSON.parse(JSON.stringify(local)) as FormRecord;
  local.title = `Draft ${crypto.randomUUID()}`;
  const saved = await persistLocalForm(localId);
  if (!saved) return false;
  try {
    await formApi.saveTemplate(saved.id, {
      name,
      description: local.description || snapshot.description,
      category: "General",
      visibility: "PRIVATE",
    });
    await formApi.deleteDraft(saved.id);
  } catch (error) {
    await formApi.deleteDraft(saved.id).catch(() => undefined);
    state.forms = state.forms.filter((item) => item.id !== saved.id);
    localDraftIds.add(localId);
    replaceForm(snapshot);
    throw error;
  }
  state.forms = state.forms.filter((item) => item.id !== saved.id);
  emit();
  await loadForms();
  return true;
}

export async function deleteTemplate(id: string) {
  await formApi.deleteTemplate(id);
  state.templates = state.templates.filter((item) => item.id !== id);
  emit();
}

