import { memo, useEffect, useMemo, useRef, useState, startTransition, type ReactNode } from "react";
import {
  flattenQuestions,
  isTargetVisible,
  type AnswerMap,
  type FormQuestion,
  type FormRecord,
} from "./types";

export function visibleQuestions(form: FormRecord, answers: AnswerMap) {
  return form.sections.flatMap((section) => {
    if (!isTargetVisible(section.logic, form, answers)) return [];
    return section.questions
      .filter((question) => isTargetVisible(question.logic, form, answers))
      .map((question) => ({ section, question }));
  });
}

export function validateAnswers(form: FormRecord, answers: AnswerMap) {
  const errors: Record<string, string> = {};
  visibleQuestions(form, answers).forEach(({ question }) => {
    if (question.type === "content") return;
    const value = answers[question.id];
    const text = Array.isArray(value) ? "" : (value || "").trim();
    const list = Array.isArray(value) ? value : [];
    const missing = Array.isArray(value) ? list.length === 0 : !text;
    if (question.required && missing) {
      errors[question.id] = "This question is required.";
      return;
    }
    if (missing) return;
    if (question.type === "email" || question.config.format === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) errors[question.id] = "Enter a valid email address.";
    }
    if (question.type === "phone" || question.config.format === "phone") {
      if (text.replace(/\D/g, "").length < 10) errors[question.id] = "Enter a valid phone number.";
    }
    if (question.config.format === "url" && !/^https?:\/\/.+/i.test(text)) {
      errors[question.id] = "Enter a URL starting with http:// or https://.";
    }
    if ((question.type === "number" || question.type === "price" || question.type === "fees") && text) {
      const amount = Number(text);
      if (Number.isNaN(amount)) errors[question.id] = "Enter a number.";
      if (question.config.min && amount < Number(question.config.min)) {
        errors[question.id] = `Must be at least ${question.config.min}.`;
      }
      if (question.config.max && amount > Number(question.config.max)) {
        errors[question.id] = `Must be at most ${question.config.max}.`;
      }
    }
    if (question.type === "multiple_choice") {
      if (question.config.minSelections && list.length < question.config.minSelections) {
        errors[question.id] = `Select at least ${question.config.minSelections}.`;
      }
      if (question.config.maxSelections && list.length > question.config.maxSelections) {
        errors[question.id] = `Select at most ${question.config.maxSelections}.`;
      }
    }
    if (question.config.maxLength && text.length > question.config.maxLength) {
      errors[question.id] = `Keep this under ${question.config.maxLength} characters.`;
    }
  });
  return errors;
}

function SmoothText({
  value,
  onChange,
  multiline = false,
  className,
  placeholder,
  type = "text",
  min,
  max,
  step,
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className: string;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
  step?: number | string;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  function push(next: string) {
    setDraft(next);
    startTransition(() => onChangeRef.current(next));
  }

  if (multiline) {
    return (
      <textarea
        value={draft}
        placeholder={placeholder}
        className={className}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
        }}
        onChange={(event) => push(event.target.value)}
      />
    );
  }

  return (
    <input
      type={type}
      value={draft}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={className}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
      }}
      onChange={(event) => push(event.target.value)}
    />
  );
}

const QuestionField = memo(function QuestionField({
  form,
  question,
  number,
  value,
  error,
  onChange,
}: {
  form: FormRecord;
  question: FormQuestion;
  number?: number;
  value: string | string[] | undefined;
  error?: string;
  onChange: (value: string | string[]) => void;
}) {
  const text = Array.isArray(value) ? "" : value || "";
  const list = Array.isArray(value) ? value : [];
  const label = (
    <div className="mb-2">
      <p className="text-[15px] font-medium text-slate-800">
        {form.showNumbers && number ? <span className="mr-2 text-slate-400">{number}.</span> : null}
        {question.label || "Untitled question"}
        {question.required && question.type !== "content" ? <span className="ml-1 text-[#b42318]">*</span> : null}
      </p>
      {question.helpText ? <p className="mt-1 text-[13px] text-slate-500">{question.helpText}</p> : null}
    </div>
  );

  if (question.type === "content") {
    return (
      <div className="rounded-xl bg-[#f7f5f1] px-4 py-3 text-[14px] text-slate-600">
        {question.config.contentHtml || question.label}
      </div>
    );
  }

  const control = (() => {
    if (question.type === "short_text" || question.type === "email" || question.type === "phone") {
      return (
        <SmoothText
          value={text}
          placeholder={question.config.placeholder || ""}
          onChange={onChange}
          className="h-11 w-full rounded-xl border border-[#e4dfd6] px-3 text-[15px] outline-none focus:border-[#9cb1f6]"
        />
      );
    }
    if (question.type === "long_text") {
      return (
        <SmoothText
          multiline
          value={text}
          placeholder={question.config.placeholder || ""}
          onChange={onChange}
          className="min-h-28 w-full rounded-xl border border-[#e4dfd6] px-3 py-2 text-[15px] outline-none focus:border-[#9cb1f6]"
        />
      );
    }
    if (question.type === "yes_no") {
      const yes = question.config.yesLabel || "Yes";
      const no = question.config.noLabel || "No";
      return (
        <div className="flex gap-2">
          {[yes, no].map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => onChange(choice)}
              className={`h-11 min-w-24 rounded-xl border px-4 text-[14px] font-medium ${
                text === choice
                  ? "border-[#4f63ea] bg-[#eef2ff] text-[#3144c4]"
                  : "border-[#e4dfd6] bg-white text-slate-700"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      );
    }
    if (question.type === "single_choice" || (question.type === "image" && question.config.imageMode === "choice" && !question.config.multi)) {
      return (
        <div className={question.config.layout === "horizontal" ? "flex flex-wrap gap-2" : "space-y-2"}>
          {question.options.map((option) => (
            <label key={option.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-[#e4dfd6] px-3 text-[14px]">
              <input
                type="radio"
                checked={text === option.label}
                onChange={() => onChange(option.label)}
              />
              {option.label}
            </label>
          ))}
        </div>
      );
    }
    if (question.type === "multiple_choice" || (question.type === "image" && question.config.multi)) {
      return (
        <div className="space-y-2">
          {question.options.map((option) => {
            const checked = list.includes(option.label);
            return (
              <label key={option.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-[#e4dfd6] px-3 text-[14px]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? list.filter((item) => item !== option.label) : [...list, option.label])
                  }
                />
                {option.label}
              </label>
            );
          })}
        </div>
      );
    }
    if (question.type === "dropdown") {
      return (
        <select
          value={text}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-[#e4dfd6] px-3 text-[15px] outline-none focus:border-[#9cb1f6]"
        >
          <option value="">Select an option</option>
          {question.options.map((option) => (
            <option key={option.id} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    if (question.type === "rating") {
      const scale = question.config.scale || 5;
      return (
        <div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: scale }, (_, index) => {
              const score = String(index + 1);
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => onChange(score)}
                  className={`h-11 w-11 rounded-xl border text-[14px] font-semibold ${
                    text === score
                      ? "border-[#4f63ea] bg-[#4f63ea] text-white"
                      : "border-[#e4dfd6] bg-white text-slate-700"
                  }`}
                >
                  {question.config.style === "stars" ? "★" : score}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-slate-400">
            <span>{question.config.lowLabel}</span>
            <span>{question.config.highLabel}</span>
          </div>
        </div>
      );
    }
    if (question.type === "date") {
      return (
        <input
          type="date"
          value={text}
          min={question.config.min}
          max={question.config.max}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 rounded-xl border border-[#e4dfd6] px-3 text-[15px] outline-none focus:border-[#9cb1f6]"
        />
      );
    }
    if (question.type === "number" || question.type === "price" || question.type === "fees") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {question.type !== "number" ? (
            <span className="text-[14px] text-slate-500">{question.config.currency || "USD"}</span>
          ) : null}
          <SmoothText
            type="number"
            value={text}
            min={question.config.min}
            max={question.config.max}
            step={question.config.integerOnly ? 1 : "any"}
            onChange={onChange}
            className="h-11 w-40 rounded-xl border border-[#e4dfd6] px-3 text-[15px] outline-none focus:border-[#9cb1f6]"
          />
          {question.config.unit ? <span className="text-[13px] text-slate-500">{question.config.unit}</span> : null}
          {question.type === "fees" && question.config.requireFrequency ? (
            <select
              value={String(answersFrequency(value))}
              onChange={(event) => onChange(`${text}|${event.target.value}`)}
              className="h-11 rounded-xl border border-[#e4dfd6] px-3 text-[14px]"
            >
              <option value="">Frequency</option>
              {(question.config.frequencies || ["One-time", "Monthly", "Annual"]).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          ) : null}
        </div>
      );
    }
    return (
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#d9d3c8] bg-[#fbfaf8] text-[13px] text-slate-500">
        <span>Upload jpg, png, or webp · max {question.config.maxSizeMb || 5} MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 text-[12px]"
          onChange={(event) => onChange(event.target.files?.[0]?.name || "")}
        />
      </label>
    );
  })();

  return (
    <fieldset>
      {label}
      {control}
      {error ? <p className="mt-2 text-[13px] text-[#b42318]">{error}</p> : null}
    </fieldset>
  );
});

function answersFrequency(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.includes("|")) return "";
  return value.split("|")[1] || "";
}

export function RespondentForm({
  form,
  preview = false,
  onSubmit,
  footer,
}: {
  form: FormRecord;
  preview?: boolean;
  onSubmit?: (answers: AnswerMap) => void;
  footer?: ReactNode;
}) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const answersRef = useRef<AnswerMap>({});
  const [page, setPage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [width, setWidth] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const pages = useMemo(() => {
    const visible = form.sections
      .filter((section) => isTargetVisible(section.logic, form, answers))
      .map((section) => ({
        section,
        questions: section.questions.filter((question) => isTargetVisible(question.logic, form, answers)),
      }))
      .filter((section) => section.questions.length > 0 || section.section.description);
    return form.displayMode === "MULTI_PAGE" ? visible : [ { section: form.sections[0], questions: visible.flatMap((item) => item.questions), grouped: visible } ];
  }, [answers, form]);

  const current = pages[Math.min(page, Math.max(pages.length - 1, 0))];
  const numbers = new Map(flattenQuestions(form).map((item, index) => [item.question.id, index + 1]));

  function setAnswer(id: string, value: string | string[]) {
    answersRef.current = { ...answersRef.current, [id]: value };
    startTransition(() => setAnswers(answersRef.current));
  }

  function submit() {
    const latest = answersRef.current;
    const nextErrors = validateAnswers(form, latest);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (preview) {
      setDone(true);
      return;
    }
    onSubmit?.(latest);
  }

  const frame =
    width === "mobile" ? "max-w-[390px]" : width === "tablet" ? "max-w-[768px]" : "max-w-[840px]";

  if (done) {
    return (
      <div className={`mx-auto ${frame} rounded-3xl border border-[#ece8e1] bg-white px-8 py-16 text-center`}>
        <p className="text-[22px] font-semibold text-slate-800">Thank you</p>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-slate-500">{form.confirmationMessage}</p>
        {preview ? (
          <button type="button" onClick={() => setDone(false)} className="mt-6 text-[13px] font-medium text-[#4f63ea]">
            Back to preview
          </button>
        ) : null}
      </div>
    );
  }

  const grouped = "grouped" in (current || {}) ? (current as { grouped: { section: FormRecord["sections"][number]; questions: FormQuestion[] }[] }).grouped : null;

  return (
    <div>
      {preview ? (
        <div className="mb-4 flex justify-center gap-2">
          {(["desktop", "tablet", "mobile"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setWidth(item)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium capitalize ${
                width === item ? "bg-[#4f63ea] text-white" : "bg-white text-slate-600 border border-[#ece8e1]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <div className={`mx-auto ${frame} overflow-hidden rounded-3xl border border-[#ece8e1] bg-white shadow-sm`}>
        <div className="border-b border-[#f0ece6] bg-[#fbfaf8] px-6 py-6 sm:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a6800]">Tristate</p>
          <h1 className="mt-2 text-[26px] font-semibold text-slate-800">{form.title}</h1>
          {form.description ? <p className="mt-2 text-[14px] text-slate-500">{form.description}</p> : null}
          {form.instructions ? <p className="mt-3 text-[14px] text-slate-600">{form.instructions}</p> : null}
          {form.responseMode === "ANONYMOUS" ? (
            <p className="mt-3 rounded-lg bg-[#fff1bd] px-3 py-2 text-[13px] text-[#8a6800]">
              This response is anonymous. Your name and email are not stored with the answers.
            </p>
          ) : null}
        </div>
        {form.showProgress && form.displayMode === "MULTI_PAGE" ? (
          <div className="h-1.5 bg-[#f3f0ea]">
            <div
              className="h-full bg-[#4f63ea]"
              style={{ width: `${((page + 1) / Math.max(pages.length, 1)) * 100}%` }}
            />
          </div>
        ) : null}
        <div className="space-y-8 px-6 py-7 sm:px-8">
          {grouped
            ? grouped.map((group) => (
                <div key={group.section.id} className="space-y-6">
                  {form.sections.length > 1 ? (
                    <div>
                      <h2 className="text-[16px] font-semibold text-slate-800">{group.section.title}</h2>
                      {group.section.description ? (
                        <p className="text-[13px] text-slate-500">{group.section.description}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {group.questions.map((question) => (
                    <QuestionField
                      key={question.id}
                      form={form}
                      question={question}
                      number={numbers.get(question.id)}
                      value={answers[question.id]}
                      error={errors[question.id]}
                      onChange={(value) => setAnswer(question.id, value)}
                    />
                  ))}
                </div>
              ))
            : current?.questions.map((question) => (
                <QuestionField
                  key={question.id}
                  form={form}
                  question={question}
                  number={numbers.get(question.id)}
                  value={answers[question.id]}
                  error={errors[question.id]}
                  onChange={(value) => setAnswer(question.id, value)}
                />
              ))}
        </div>
        {footer && (form.displayMode !== "MULTI_PAGE" || page >= pages.length - 1) ? (
          <div className="border-t border-[#f0ece6] px-6 py-4 sm:px-8">{footer}</div>
        ) : null}
        <div className="flex items-center justify-between border-t border-[#f0ece6] px-6 py-4 sm:px-8">
          {form.displayMode === "MULTI_PAGE" && page > 0 ? (
            <button type="button" onClick={() => setPage((value) => value - 1)} className="text-[14px] font-medium text-slate-600">
              Back
            </button>
          ) : (
            <span />
          )}
          {form.displayMode === "MULTI_PAGE" && page < pages.length - 1 ? (
            <button
              type="button"
              onClick={() => setPage((value) => value + 1)}
              className="rounded-xl bg-[#4f63ea] px-4 py-2.5 text-[14px] font-medium text-white"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="rounded-xl bg-[#4f63ea] px-4 py-2.5 text-[14px] font-medium text-white"
            >
              {preview ? "Submit preview" : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
