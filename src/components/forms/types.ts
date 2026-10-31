export type FormStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "short_text"
  | "long_text"
  | "rating"
  | "date"
  | "number"
  | "price"
  | "fees"
  | "yes_no"
  | "image"
  | "email"
  | "phone"
  | "content";

export type ResponseMode = "IDENTIFIED" | "ANONYMOUS";
export type DisplayMode = "SINGLE_PAGE" | "MULTI_PAGE";
export type RecipientStatus =
  | "PENDING"
  | "NOT_OPENED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BOUNCED"
  | "EXPIRED"
  | "REMOVED";
export type DeliveryStatus = "QUEUED" | "SENT" | "DELIVERED" | "BOUNCED" | "FAILED";
export type RecipientSource = "PRACTICE" | "PERSON" | "PRACTICE_EMAIL" | "NEW_EMAIL";
export type LogicAction = "SHOW" | "HIDE";
export type LogicMatch = "ALL" | "ANY";

export type QuestionOption = {
  id: string;
  label: string;
  isOther?: boolean;
};

export type LogicCondition = {
  id: string;
  sourceQuestionId: string;
  operator: string;
  value: string;
};

export type LogicRule = {
  action: LogicAction;
  match: LogicMatch;
  conditions: LogicCondition[];
};

export type QuestionConfig = {
  placeholder?: string;
  maxLength?: number;
  format?: "none" | "email" | "phone" | "url" | "regex";
  regex?: string;
  minSelections?: number;
  maxSelections?: number;
  randomize?: boolean;
  layout?: "vertical" | "horizontal";
  scale?: number;
  style?: "stars" | "numbers";
  lowLabel?: string;
  highLabel?: string;
  min?: string;
  max?: string;
  decimals?: number;
  unit?: string;
  currency?: string;
  integerOnly?: boolean;
  frequencies?: string[];
  requireFrequency?: boolean;
  yesLabel?: string;
  noLabel?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  imageMode?: "upload" | "choice";
  multi?: boolean;
  contentHtml?: string;
};

export type FormQuestion = {
  id: string;
  key: string;
  type: QuestionType;
  label: string;
  helpText: string;
  required: boolean;
  options: QuestionOption[];
  config: QuestionConfig;
  logic: LogicRule | null;
};

export type FormSection = {
  id: string;
  title: string;
  description: string;
  questions: FormQuestion[];
  logic: LogicRule | null;
};

export type FormRecipient = {
  id: string;
  source: RecipientSource;
  practice: string;
  name: string;
  email: string;
  status: RecipientStatus;
  delivery: DeliveryStatus;
  token: string;
  sentAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
  reminderCount: number;
  lastReminderAt: string | null;
};

export type FormResponse = {
  id: string;
  recipientId: string | null;
  practice: string;
  respondent: string;
  submittedAt: string;
  answers: Record<string, string | string[]>;
};

export type ReminderSettings = {
  enabled: boolean;
  firstAfterDays: number;
  repeatEveryDays: number;
  maxCount: number;
  finalBeforeCloseDays: number | null;
  subject: string;
  body: string;
};

export type EmailTemplate = {
  subject: string;
  body: string;
  senderName: string;
  replyTo: string;
};

export type FormRecord = {
  id: string;
  refCode: string;
  title: string;
  description: string;
  instructions: string;
  status: FormStatus;
  scheduled: boolean;
  owner: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  responseMode: ResponseMode;
  recordPracticeWhenAnonymous: boolean;
  oneResponse: boolean;
  displayMode: DisplayMode;
  showProgress: boolean;
  showNumbers: boolean;
  allowResume: boolean;
  confirmationMessage: string;
  redirectUrl: string;
  closeAt: string | null;
  sendAt: string | null;
  timezone: string;
  publicLinkEnabled: boolean;
  publicToken: string;
  sections: FormSection[];
  recipients: FormRecipient[];
  responses: FormResponse[];
  reminder: ReminderSettings;
  email: EmailTemplate;
  lockVersion?: number;
  detailLoaded?: boolean;
  recipientCount?: number;
  responseCount?: number;
};

export type FormTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  visibility: "PRIVATE" | "SHARED" | "SYSTEM";
  owner: string;
  version: number;
  usageCount: number;
  lastUsedAt: string | null;
  content: Pick<
    FormRecord,
    | "title"
    | "description"
    | "instructions"
    | "confirmationMessage"
    | "responseMode"
    | "oneResponse"
    | "displayMode"
    | "showProgress"
    | "showNumbers"
    | "sections"
    | "reminder"
  >;
};

export type AuditEntry = {
  id: string;
  at: string;
  user: string;
  action: string;
  formId: string;
  formTitle: string;
  summary: string;
};

export type AnswerMap = Record<string, string | string[]>;

export const QUESTION_CATALOG: {
  type: QuestionType;
  label: string;
  group: string;
  must: boolean;
}[] = [
  { type: "single_choice", label: "Single choice", group: "Choice", must: true },
  { type: "multiple_choice", label: "Multiple choice", group: "Choice", must: true },
  { type: "dropdown", label: "Dropdown", group: "Choice", must: true },
  { type: "yes_no", label: "Yes / No", group: "Choice", must: true },
  { type: "short_text", label: "Short text", group: "Text", must: true },
  { type: "long_text", label: "Long text", group: "Text", must: true },
  { type: "email", label: "Email", group: "Text", must: false },
  { type: "phone", label: "Phone", group: "Text", must: false },
  { type: "number", label: "Number", group: "Value", must: true },
  { type: "price", label: "Price", group: "Value", must: true },
  { type: "fees", label: "Fees", group: "Value", must: true },
  { type: "rating", label: "Rating", group: "Value", must: true },
  { type: "date", label: "Date", group: "Value", must: true },
  { type: "image", label: "Image", group: "Media", must: true },
  { type: "content", label: "Content block", group: "Layout", must: false },
];

export const CHOICE_TYPES: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
];

export function isChoiceType(type: QuestionType) {
  return CHOICE_TYPES.includes(type);
}

export function operatorsFor(type: QuestionType, config?: { multi?: boolean }): string[] {
  if (type === "dropdown" && config?.multi) {
    return ["contains", "does not contain", "contains any of", "contains all of"];
  }
  if (type === "single_choice" || type === "dropdown" || type === "yes_no") {
    return ["is", "is not", "is any of"];
  }
  if (type === "multiple_choice") {
    return ["contains", "does not contain", "contains any of", "contains all of"];
  }
  if (type === "short_text" || type === "email" || type === "phone") {
    return ["equals", "does not equal", "contains", "is empty", "is not empty"];
  }
  if (type === "number" || type === "price" || type === "fees" || type === "rating") {
    return ["=", "≠", ">", "≥", "<", "≤", "between"];
  }
  if (type === "date") return ["is on", "is before", "is after", "is between"];
  return ["is answered", "is not answered"];
}

export function questionNeedsValue(operator: string) {
  return !["is empty", "is not empty", "is answered", "is not answered"].includes(operator);
}

export function flattenQuestions(form: Pick<FormRecord, "sections">) {
  return form.sections.flatMap((section) =>
    section.questions.map((question) => ({ section, question })),
  );
}

export function logicSummary(
  rule: LogicRule | null,
  form: Pick<FormRecord, "sections">,
) {
  if (!rule || rule.conditions.length === 0) return "";
  const questions = flattenQuestions(form);
  const parts = rule.conditions.map((condition) => {
    const found = questions.find((item) => item.question.id === condition.sourceQuestionId);
    const label = found ? found.question.label : "a question";
    const value = questionNeedsValue(condition.operator) ? ` ${condition.value}` : "";
    return `${label} ${condition.operator}${value}`;
  });
  const joiner = rule.match === "ALL" ? " and " : " or ";
  const verb = rule.action === "SHOW" ? "Shown if" : "Hidden if";
  return `${verb} ${parts.join(joiner)}`;
}

function answered(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value && String(value).trim());
}

function asText(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function conditionMatches(
  condition: LogicCondition,
  source: FormQuestion | undefined,
  answers: AnswerMap,
) {
  const raw = source ? answers[source.id] : undefined;
  const text = asText(raw).toLowerCase();
  const expected = condition.value.toLowerCase();
  const list = Array.isArray(raw) ? raw.map((item) => item.toLowerCase()) : [text];

  switch (condition.operator) {
    case "is":
    case "equals":
    case "=":
    case "is on":
      return text === expected;
    case "is not":
    case "does not equal":
    case "≠":
      return text !== expected;
    case "contains":
      return text.includes(expected);
    case "does not contain":
      return !text.includes(expected);
    case "is any of":
    case "contains any of":
      return condition.value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .some((item) => list.includes(item) || text === item);
    case "contains all of":
      return condition.value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .every((item) => list.includes(item));
    case "is empty":
    case "is not answered":
      return !answered(raw);
    case "is not empty":
    case "is answered":
      return answered(raw);
    case ">":
    case "≥":
    case "<":
    case "≤":
    case "is before":
    case "is after": {
      const left = Number(text);
      const right = Number(expected);
      if (condition.operator === "is before") return text < expected;
      if (condition.operator === "is after") return text > expected;
      if (Number.isNaN(left) || Number.isNaN(right)) return false;
      if (condition.operator === ">") return left > right;
      if (condition.operator === "≥") return left >= right;
      if (condition.operator === "<") return left < right;
      return left <= right;
    }
    case "between":
    case "is between": {
      const [start, end] = condition.value.split(",").map((item) => item.trim());
      if (source?.type === "date") return text >= start && text <= end;
      const value = Number(text);
      return value >= Number(start) && value <= Number(end);
    }
    default:
      return false;
  }
}

export function rulePasses(
  rule: LogicRule | null,
  form: Pick<FormRecord, "sections">,
  answers: AnswerMap,
) {
  if (!rule || rule.conditions.length === 0) return true;
  const questions = flattenQuestions(form).map((item) => item.question);
  const results = rule.conditions.map((condition) =>
    conditionMatches(
      condition,
      questions.find((question) => question.id === condition.sourceQuestionId),
      answers,
    ),
  );
  return rule.match === "ALL" ? results.every(Boolean) : results.some(Boolean);
}

export function isTargetVisible(
  rule: LogicRule | null,
  form: Pick<FormRecord, "sections">,
  answers: AnswerMap,
) {
  if (!rule || rule.conditions.length === 0) return true;
  const passed = rulePasses(rule, form, answers);
  return rule.action === "SHOW" ? passed : !passed;
}

export function statusLabel(status: FormStatus, scheduled = false) {
  if (status === "PUBLISHED" && scheduled) return "Published (scheduled)";
  if (status === "DRAFT") return "Draft";
  if (status === "PUBLISHED") return "Published";
  if (status === "CLOSED") return "Closed";
  return "Archived";
}

export function recipientStatusLabel(status: RecipientStatus) {
  const labels: Record<RecipientStatus, string> = {
    PENDING: "Pending",
    NOT_OPENED: "Not opened",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    BOUNCED: "Bounced",
    EXPIRED: "Expired",
    REMOVED: "Removed",
  };
  return labels[status];
}
