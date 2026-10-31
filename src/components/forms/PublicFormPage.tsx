import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiConnector } from "../../services/apiConnector";
import { RespondentForm } from "./RespondentForm";
import { flattenQuestions, type FormQuestion, type FormRecord, type QuestionType } from "./types";

const TYPE_TO_UI: Record<string, QuestionType> = {
  SINGLE_CHOICE: "single_choice",
  MULTIPLE_CHOICE: "multiple_choice",
  DROPDOWN: "dropdown",
  SHORT_TEXT: "short_text",
  LONG_TEXT: "long_text",
  RATING: "rating",
  DATE: "date",
  NUMBER: "number",
  PRICE: "price",
  FEES: "fees",
  YES_NO: "yes_no",
  IMAGE_UPLOAD: "image",
  IMAGE_CHOICE: "image",
  EMAIL: "email",
  PHONE: "phone",
  CONTENT: "content",
};

export default function PublicFormPage() {
  const { token = "" } = useParams();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<{ prompt: string; token: string; answer: string } | null>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);

  useEffect(() => {
    const root = (import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "") + "/api/v1";
    void apiConnector({ method: "GET", url: `${root}/f/${token}` })
      .then((response) => {
        const data = response.data as { form?: Snapshot; requiresCaptcha?: boolean };
        if (data.form) setForm(snapshotToForm(data.form));
        setRequiresCaptcha(Boolean(data.requiresCaptcha));
        if (data.requiresCaptcha) {
          return apiConnector({ method: "GET", url: `${root}/f/${token}/captcha` }).then((captchaResponse) => {
            const issued = captchaResponse.data as { prompt: string; token: string };
            setCaptcha({ ...issued, answer: "" });
          });
        }
        return undefined;
      })
      .catch((error: unknown) => {
        const message = axios.isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)?.message
          : "This link is not valid";
        setNotice(message || "This link is not valid");
      });
  }, [token]);

  if (notice && !form) return <Status title={notice} body="If you think this is a mistake, ask the sender for a new link." />;
  if (!form) return <Status title="Loading" body="Opening the form." />;
  if (notice) return <Status title="Thank you" body={notice} />;

  return (
    <main className="min-h-screen bg-[#f6f4f0] px-4 py-8 font-app-sans">
      <RespondentForm
        form={form}
        footer={
          requiresCaptcha && captcha ? (
            <div>
              <p className="text-[13px] text-slate-600">{captcha.prompt}</p>
              <input
                value={captcha.answer}
                onChange={(event) => setCaptcha({ ...captcha, answer: event.target.value })}
                className="mt-2 h-10 w-full rounded-lg border border-[#e4dfd6] px-3 text-[14px]"
              />
            </div>
          ) : null
        }
        uploadImage={(file) => uploadFormImage(token, file)}
        onSubmit={async (answers) => {
          const root = (import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "") + "/api/v1";
          try {
            const response = await apiConnector({
              method: "POST",
              url: `${root}/f/${token}/submit`,
              body: {
                answers: toApiAnswers(form, answers),
                captchaToken: captcha?.token,
                captchaAnswer: captcha?.answer,
              },
            });
            setNotice((response.data as { message?: string }).message || form.confirmationMessage);
          } catch (error: unknown) {
            const data = axios.isAxiosError(error)
              ? (error.response?.data as { message?: string; errors?: string[] } | undefined)
              : undefined;
            throw new Error(data?.errors?.[0] || data?.message || "This form is no longer accepting responses.");
          }
        }}
      />
    </main>
  );
}

const UI_OPERATOR: Record<string, string> = {
  is_not: "is not",
  is_any_of: "is any of",
  does_not_contain: "does not contain",
  contains_any_of: "contains any of",
  contains_all_of: "contains all of",
  does_not_equal: "does not equal",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  is_on: "is on",
  is_before: "is before",
  is_after: "is after",
  is_between: "is between",
  is_answered: "is answered",
  is_not_answered: "is not answered",
};

type Snapshot = {
  id: string;
  refCode: string;
  title: string;
  description?: string;
  instructions?: string;
  displayMode: FormRecord["displayMode"];
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
  allowSaveResume: boolean;
  confirmationMessage: string;
  redirectUrl?: string | null;
  responseMode: FormRecord["responseMode"];
  allowMultipleResponses: boolean;
  sections: Array<{ id: string; title: string; description?: string }>;
  questions: Array<{
    id: string;
    key: string;
    sectionId: string;
    type: string;
    label: string;
    helpText?: string | null;
    isRequired: boolean;
    config: FormQuestion["config"];
    options: Array<{ id: string; label: string; isOther?: boolean }>;
  }>;
  logic: Array<{
    targetType: "question" | "section";
    targetId: string;
    action: "show" | "hide";
    matchType: "all" | "any";
    conditions: Array<{ sourceQuestionId: string; operator: string; value?: unknown }>;
  }>;
};

function snapshotToForm(snapshot: Snapshot): FormRecord {
  const logicFor = (type: string, id: string) => {
    const rule = snapshot.logic.find((item) => item.targetType === type && item.targetId === id);
    if (!rule) return null;
    return {
      action: rule.action === "hide" ? "HIDE" as const : "SHOW" as const,
      match: rule.matchType === "any" ? "ANY" as const : "ALL" as const,
      conditions: rule.conditions.map((condition, index) => ({
        id: `${id}-${index}`,
        sourceQuestionId: condition.sourceQuestionId,
        operator: UI_OPERATOR[condition.operator] || String(condition.operator).replace(/_/g, " "),
        value: condition.value == null ? "" : String(condition.value),
      })),
    };
  };
  return {
    id: snapshot.id,
    refCode: snapshot.refCode,
    title: snapshot.title,
    description: snapshot.description || "",
    instructions: snapshot.instructions || "",
    status: "PUBLISHED",
    scheduled: false,
    owner: "",
    createdAt: "",
    updatedAt: "",
    version: 1,
    responseMode: snapshot.responseMode,
    recordPracticeWhenAnonymous: false,
    oneResponse: !snapshot.allowMultipleResponses,
    displayMode: snapshot.displayMode,
    showProgress: snapshot.showProgressBar,
    showNumbers: snapshot.showQuestionNumbers,
    allowResume: snapshot.allowSaveResume,
    confirmationMessage: snapshot.confirmationMessage,
    redirectUrl: snapshot.redirectUrl || "",
    closeAt: null,
    sendAt: null,
    timezone: "UTC",
    publicLinkEnabled: false,
    publicToken: "",
    recipients: [],
    responses: [],
    reminder: { enabled: false, firstAfterDays: 3, repeatEveryDays: 3, maxCount: 1, finalBeforeCloseDays: null, subject: "", body: "" },
    email: { subject: "", body: "", senderName: "", replyTo: "" },
    sections: snapshot.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description || "",
      logic: logicFor("section", section.id),
      questions: snapshot.questions.filter((question) => question.sectionId === section.id).map((question) => ({
        id: question.id,
        key: question.key,
        type: TYPE_TO_UI[question.type] || "short_text",
        label: question.label,
        helpText: question.helpText || "",
        required: question.isRequired,
        config: {
          ...(question.config || {}),
          imageMode: question.type === "IMAGE_CHOICE" ? "choice" : question.config?.imageMode,
        },
        options: question.options,
        logic: logicFor("question", question.id),
      })),
    })),
  };
}

function toApiAnswers(form: FormRecord, answers: Record<string, string | string[]>) {
  const payload: Record<string, unknown> = {};
  flattenQuestions(form).forEach(({ question }) => {
    const raw = answers[question.id];
    if (raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0)) return;
    if (question.type === "dropdown" && question.config.multi) {
      const labels = Array.isArray(raw) ? raw : [raw];
      payload[question.id] = { optionIds: labels.map((label) => question.options.find((option) => option.label === label)?.id || label) };
      return;
    }
    if (question.type === "single_choice" || question.type === "dropdown" || (question.type === "image" && question.config.imageMode === "choice")) {
      const label = Array.isArray(raw) ? raw[0] : raw;
      payload[question.id] = question.options.find((option) => option.label === label)?.id || label;
      return;
    }
    if (question.type === "multiple_choice") {
      const labels = Array.isArray(raw) ? raw : [raw];
      payload[question.id] = { optionIds: labels.map((label) => question.options.find((option) => option.label === label)?.id || label) };
      return;
    }
    if (question.type === "yes_no") {
      const value = Array.isArray(raw) ? raw[0] : raw;
      payload[question.id] = value === (question.config.noLabel || "No") ? "no" : "yes";
      return;
    }
    if (question.type === "rating" || question.type === "number" || question.type === "price") {
      payload[question.id] = Number(Array.isArray(raw) ? raw[0] : raw);
      return;
    }
    if (question.type === "fees") {
      const text = Array.isArray(raw) ? raw[0] : raw;
      const [amount, frequency] = text.split("|");
      payload[question.id] = { amount: Number(amount), frequency };
      return;
    }
    if (question.type === "image" && question.config.imageMode !== "choice") {
      const text = Array.isArray(raw) ? raw[0] : String(raw || "");
      if (text.startsWith("{")) {
        try {
          const parsed = JSON.parse(text) as { files?: unknown[] };
          if (Array.isArray(parsed.files)) {
            payload[question.id] = { files: parsed.files };
            return;
          }
        } catch {
          // A plain file name is sent below.
        }
      }
      payload[question.id] = { files: [{ name: text }] };
      return;
    }
    payload[question.id] = raw;
  });
  return payload;
}

async function uploadFormImage(token: string, file: File) {
  const root = (import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "") + "/api/v1";
  const body = new FormData();
  body.append("file", file);
  try {
    const response = await axios.post(`${root}/f/${token}/upload`, body);
    const saved = (response.data as { file?: { url: string; id?: string; contentType?: string; blobName?: string } }).file;
    if (!saved?.url) throw new Error("Unable to upload this image.");
    return saved;
  } catch (error: unknown) {
    const data = axios.isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)
      : undefined;
    throw new Error(data?.message || "Unable to upload this image.");
  }
}

function Status({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4f0] px-4 font-app-sans">
      <div className="max-w-md rounded-3xl border border-[#ece8e1] bg-white px-8 py-12 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a6800]">Tristate</p>
        <h1 className="mt-3 text-[24px] font-semibold text-slate-800">{title}</h1>
        <p className="mt-2 text-[14px] text-slate-500">{body}</p>
      </div>
    </main>
  );
}
