import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { BufferedInput, BufferedTextArea, FieldLabel, GhostButton, Panel, PrimaryButton, StatusPill, TextArea, TextInput, formatWhen } from "./chrome";
import Select from "../shared/Select";
import { RespondentForm } from "./RespondentForm";
import {
  addQuestion,
  addSection,
  deleteQuestion,
  deleteSection,
  duplicateQuestion,
  beginNewForm,
  discardLocalForm,
  flushSave,
  isUnsavedForm,
  getForm,
  loadFormDocument,
  nameTakenMessage,
  persistLocalForm,
  saveLocalAsTemplateOnly,
  moveQuestion,
  publishValidation,
  saveAsTemplate,
  updateForm,
  updateQuestion,
  updateSection,
  useFormStore,
} from "./store";
import {
  QUESTION_CATALOG,
  flattenQuestions,
  isChoiceType,
  logicSummary,
  operatorsFor,
  questionNeedsValue,
  type FormQuestion,
  type LogicRule,
} from "./types";

export default function FormBuilderPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === "new";
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { forms } = useFormStore();
  const formId = isNew ? draftId || "" : id;
  const form = forms.find((item) => item.id === formId);
  useEffect(() => {
    if (isNew) {
      const asTemplate = (location.state as { intent?: string } | null)?.intent === "template";
      const draft = beginNewForm(asTemplate ? "Untitled template" : "Untitled form", asTemplate);
      setDraftId(draft.id);
      return () => discardLocalForm(draft.id);
    }
    if (id) void loadFormDocument(id);
  }, [id, isNew]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"question" | "settings" | "logic">("question");
  const [errors, setErrors] = useState<{ message: string; target: string }[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [preview, setPreview] = useState(location.pathname.endsWith("/preview"));

  const selected = form ? flattenQuestions(form).find((item) => item.question.id === selectedId)?.question ?? null : null;

  if (!form || !form.detailLoaded) {
    return <div className="p-8 text-sm text-slate-500">Loading form…</div>;
  }

  const current = form;
  const locked = current.responses.length > 0;
  const questions = flattenQuestions(current);
  const unsaved = isUnsavedForm(current.id);
  const fromTemplates = (location.state as { from?: string } | null)?.from === "templates";
  const creatingTemplate = (location.state as { intent?: string } | null)?.intent === "template" && unsaved;
  const missingQuestions = flattenQuestions(current).length === 0;
  const saveError = saveAttempted && missingQuestions
    ? creatingTemplate
      ? "Add at least one question before saving this template."
      : "Add at least one question before saving this form."
    : "";

  function requestSave(next: () => void) {
    setSaveAttempted(true);
    if (missingQuestions) return;
    next();
  }

  function leave() {
    if (unsaved) discardLocalForm(current.id);
    navigate(fromTemplates ? "/forms/templates" : "/forms");
  }

  async function save(name: string) {
    if (flattenQuestions(current).length === 0) {
      return creatingTemplate
        ? "Add at least one question before saving this template."
        : "Add at least one question before saving this form.";
    }
    const conflict = nameTakenMessage(current.id, name);
    if (conflict) return conflict;
    if (updateForm(current.id, { title: name.slice(0, 200) }) === false) {
      return nameTakenMessage(current.id, name) || "A form with this name already exists.";
    }
    setSaving(true);
    try {
      if (creatingTemplate) {
        const saved = await saveLocalAsTemplateOnly(current.id);
        if (!saved) return "Unable to save this template.";
        toast.success("Template saved");
        setNameOpen(false);
        navigate("/forms/templates");
        return "";
      }
      if (unsaved) {
        const saved = await persistLocalForm(current.id);
        if (!saved) return "Unable to save this form.";
        toast.success("Form saved");
        setNameOpen(false);
        navigate(`/forms/${saved.id}`, { replace: true, state: location.state });
        return "";
      }
      await flushSave(current.id);
      toast.success("Form saved");
      setNameOpen(false);
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : creatingTemplate ? "Unable to save this template." : "Unable to save this form.";
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#f7f5f1] font-app-sans text-slate-700">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#ece8e1] bg-white px-4 py-3">
        <button type="button" onClick={leave} className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-[13px] text-slate-500 transition-colors duration-150 hover:bg-[#f7f5f1] hover:text-slate-800">
          {fromTemplates ? "Templates" : "Forms"}
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[16px] font-semibold text-slate-800">
          {unsaved ? (creatingTemplate ? "New template" : "New form") : form.title}
        </h1>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
        {creatingTemplate ? (
          <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[12px] font-medium text-[#3144c4]">Template</span>
        ) : (
          <StatusPill status={form.status} scheduled={form.scheduled} />
        )}
        <span className="text-[12px] text-slate-400">
          {creatingTemplate ? "Unsaved template" : unsaved ? "Unsaved draft" : `Last saved ${formatWhen(form.updatedAt)}`}
        </span>
        <GhostButton onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> Preview</GhostButton>
        {creatingTemplate ? null : (
          <GhostButton onClick={() => requestSave(() => setTemplateOpen(true))} disabled={saving}>Save as template</GhostButton>
        )}
        {unsaved ? (
          <GhostButton onClick={leave} disabled={saving}>Cancel</GhostButton>
        ) : null}
        {unsaved ? (
          <PrimaryButton onClick={() => requestSave(() => setNameOpen(true))} disabled={saving}>
            {creatingTemplate ? "Save template" : "Save"}
          </PrimaryButton>
        ) : null}
        {!unsaved && (form.status === "DRAFT" || form.status === "PUBLISHED") ? (
          <PrimaryButton
            onClick={() => {
              void flushSave(form.id).then(() => navigate(`/forms/${form.id}/send`));
            }}
          >
            Send
          </PrimaryButton>
        ) : null}
        </div>
      </header>
      {saveError ? (
        <div className="bg-[#fde8e8] px-4 py-2 text-[13px] text-[#b42318]">{saveError}</div>
      ) : null}
      {locked ? (
        <div className="bg-[#fff1bd] px-4 py-2 text-[13px] text-[#8a6800]">
          Responses exist, so question types, deletions, response mode, and the one-response setting are locked. You can still fix wording and add an optional question at the end.
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="overflow-y-auto border-r border-[#ece8e1] bg-white p-3">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Questions</p>
          {["Choice", "Text", "Value", "Media", "Layout"].map((group) => (
            <div key={group} className="mb-3">
              <p className="px-2 py-1 text-[12px] text-slate-400">{group}</p>
              {QUESTION_CATALOG.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    const sectionId = form.sections[form.sections.length - 1]?.id;
                    if (!sectionId) return;
                    const created = addQuestion(form.id, sectionId, item.type);
                    if (created) setSelectedId(created.id);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-[#f4f2fe] active:bg-[#eef0fc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {item.label}
                  {!item.must ? <span className="text-[10px] text-slate-400">Should</span> : null}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <main className="overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <Panel className="p-4">
              <FieldLabel>Description</FieldLabel>
              <BufferedTextArea
                value={form.description}
                maxLength={2000}
                onCommit={(description) => updateForm(form.id, { description })}
                placeholder="Optional description shown to respondents"
              />
              <FieldLabel>Instructions</FieldLabel>
              <BufferedTextArea
                value={form.instructions}
                onCommit={(instructions) => updateForm(form.id, { instructions })}
                placeholder="Shown above the first question"
              />
            </Panel>
            {form.sections.map((section, sectionIndex) => (
              <Panel key={section.id} className="p-4">
                <div className="mb-3 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <BufferedInput
                      value={section.title}
                      onCommit={(title) => updateSection(form.id, section.id, { title })}
                      className="border-transparent bg-transparent px-0 text-[15px] font-semibold"
                    />
                    <BufferedInput
                      value={section.description}
                      onCommit={(description) => updateSection(form.id, section.id, { description })}
                      placeholder="Section description"
                      className="mt-1 border-transparent bg-transparent px-0 text-[13px] text-slate-500"
                    />
                  </div>
                  {form.sections.length > 1 ? (
                    <GhostButton
                      onClick={() => {
                        const moveTo = form.sections.find((item) => item.id !== section.id)?.id;
                        if (section.questions.length && moveTo && window.confirm("Move questions to the next section? Cancel deletes them with the section.")) {
                          deleteSection(form.id, section.id, moveTo);
                        } else deleteSection(form.id, section.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </GhostButton>
                  ) : null}
                  <span className="text-[12px] text-slate-400">{sectionIndex + 1}</span>
                </div>
                {section.logic ? (
                  <p className="mb-3 text-[12px] text-[#3d4db5]">{logicSummary(section.logic, form)}</p>
                ) : null}
                <div className="space-y-2">
                  {section.questions.map((question) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(question.id);
                        setTab("question");
                      }}
                      className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left transition-[background-color,border-color,box-shadow] duration-150 ${
                        selectedId === question.id ? "border-[#9cb1f6] bg-[#f7f8ff] shadow-sm" : "border-[#f0ece6] bg-[#fbfaf8] hover:border-[#e4dfd6] hover:bg-white"
                      }`}
                    >
                      <GripVertical className="mt-0.5 h-4 w-4 text-slate-300" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-slate-800">
                          {question.label || "Untitled question"}
                          {question.required ? <span className="text-[#b42318]"> *</span> : null}
                        </span>
                        <span className="text-[12px] text-slate-400">
                          {QUESTION_CATALOG.find((item) => item.type === question.type)?.label}
                          {question.logic ? ` · ${logicSummary(question.logic, form)}` : ""}
                        </span>
                        {isChoiceType(question.type) && question.options.length ? (
                          <span className="mt-2 flex flex-col gap-1">
                            {question.options.map((option) => (
                              <span key={option.id} className="truncate rounded-md border border-[#efeae3] bg-white px-2 py-1 text-[12px] text-slate-600">
                                {option.label || "Untitled option"}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    const created = addQuestion(form.id, section.id, "short_text");
                    if (created) setSelectedId(created.id);
                  }}
                  className="mt-3 inline-flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 text-[13px] font-medium text-[#4f63ea] transition-colors duration-150 hover:bg-[#f4f2fe] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add question
                </button>
              </Panel>
            ))}
            <GhostButton onClick={() => addSection(form.id)} disabled={locked}>
              <Plus className="h-4 w-4" /> Add section
            </GhostButton>
            <LogicSummary formId={form.id} />
          </div>
        </main>
        <aside className="overflow-y-auto border-l border-[#ece8e1] bg-white p-4">
          <div className="mb-4 flex gap-1 rounded-xl bg-[#f7f5f1] p-1 text-[13px]">
            {(["question", "logic", "settings"] as const).map((item) => {
              const active = (selected ? tab : "settings") === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 capitalize transition-colors duration-150 ${active ? "bg-white font-medium text-[#3144c4] shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          {tab === "settings" || !selected ? (
            <FormSettings formId={form.id} />
          ) : tab === "logic" ? (
            <LogicEditor formId={form.id} question={selected} locked={locked} />
          ) : (
            <QuestionInspector formId={form.id} question={selected} locked={locked} questionsBefore={questions} />
          )}
        </aside>
      </div>
      {errors.length ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <Panel className="w-full max-w-lg p-5">
            <h2 className="text-[16px] font-semibold">Publishing is blocked</h2>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-600">
              {errors.map((error) => (
                <li key={error.message}>• {error.message}</li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <PrimaryButton onClick={() => setErrors([])}>Review form</PrimaryButton>
            </div>
          </Panel>
        </div>
      ) : null}
      {nameOpen ? (
        <NameModal
          title={creatingTemplate ? "Save template" : "Save form"}
          label={creatingTemplate ? "Template name" : "Form name"}
          saving={saving}
          onClose={() => { if (!saving) setNameOpen(false); }}
          onSave={save}
        />
      ) : null}
      {templateOpen ? <TemplateDialog formId={form.id} onClose={() => setTemplateOpen(false)} /> : null}
      {preview ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f5f1] p-4">
          <div className="mb-3 flex justify-end">
            <GhostButton onClick={() => setPreview(false)}>Close preview</GhostButton>
          </div>
          <RespondentForm form={form} preview />
        </div>
      ) : null}
    </div>
  );
}

function FormSettings({ formId }: { formId: string }) {
  const form = useFormStore().forms.find((item) => item.id === formId);
  if (!form) return null;
  const locked = form.responses.length > 0;
  const checks = publishValidation(form).filter((item) => item.target !== "distribution");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[14px] font-semibold text-slate-800">Form settings</h2>
        <p className="mt-0.5 text-[12px] text-slate-400">{form.refCode} · Version {form.version}</p>
      </div>

      <section className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">After submit</p>
        <FieldLabel>Confirmation message</FieldLabel>
        <BufferedTextArea value={form.confirmationMessage} onCommit={(confirmationMessage) => updateForm(form.id, { confirmationMessage })} />
        <p className="text-[12px] text-slate-400">People see this after they send their answers.</p>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Layout</p>
        <FieldLabel>Display</FieldLabel>
        <Select
          value={form.displayMode}
          onChange={(displayMode) => updateForm(form.id, { displayMode: displayMode as typeof form.displayMode })}
          options={[
            { label: "All sections on one page", value: "SINGLE_PAGE" },
            { label: "One section per page", value: "MULTI_PAGE" },
          ]}
        />
        <div className="divide-y divide-[#f3f0ea] rounded-xl border border-[#f0ece6] px-3">
          <Toggle label="Show progress bar" checked={form.showProgress} onChange={(showProgress) => updateForm(form.id, { showProgress })} />
          <Toggle label="Show question numbers" checked={form.showNumbers} onChange={(showNumbers) => updateForm(form.id, { showNumbers })} />
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Responses</p>
        <div className="rounded-xl border border-[#f0ece6] px-3">
          <Toggle label="One response per person" checked={form.oneResponse} disabled={locked} onChange={(oneResponse) => updateForm(form.id, { oneResponse })} />
        </div>
        <FieldLabel>Response mode</FieldLabel>
        <Select
          disabled={locked || form.status !== "DRAFT"}
          value={form.responseMode}
          onChange={(responseMode) => updateForm(form.id, { responseMode: responseMode as typeof form.responseMode })}
          options={[
            { label: "Identified", value: "IDENTIFIED" },
            { label: "Anonymous", value: "ANONYMOUS" },
          ]}
        />
        <p className="text-[12px] text-slate-400">
          {form.responseMode === "ANONYMOUS" ? "Names stay hidden on the responses page." : "Responses include the person's name."}
        </p>
        {form.responseMode === "ANONYMOUS" ? (
          <div className="rounded-xl bg-[#fff8e8] px-3 py-2 text-[12px] text-[#8a6800]">
            A practice name can still identify someone when that practice has very few replies. Groups under 3 stay combined.
            <Toggle
              label="Record practice with response"
              checked={form.recordPracticeWhenAnonymous}
              onChange={(recordPracticeWhenAnonymous) => updateForm(form.id, { recordPracticeWhenAnonymous })}
            />
          </div>
        ) : null}
      </section>

      {checks.length ? (
        <div className="rounded-xl bg-[#fff8e8] px-3 py-2.5">
          <p className="text-[12px] font-medium text-[#8a6800]">Still needed</p>
          <ul className="mt-1 space-y-1 text-[12px] text-[#8a6800]">
            {checks.map((item) => (
              <li key={item.message}>{item.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function QuestionInspector({
  formId,
  question,
  locked,
  questionsBefore,
}: {
  formId: string;
  question: FormQuestion;
  locked: boolean;
  questionsBefore: { question: FormQuestion }[];
}) {
  const index = questionsBefore.findIndex((item) => item.question.id === question.id);
  const [rangeError, setRangeError] = useState("");
  const bounded = question.type === "number" || question.type === "price" || question.type === "fees";

  function rangeIsInvalid(min: string, max: string) {
    if (!min.trim() || !max.trim()) return false;
    const low = Number(min);
    const high = Number(max);
    return Number.isFinite(low) && Number.isFinite(high) && high < low;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <GhostButton onClick={() => moveQuestion(formId, question.id, "up")}><ArrowUp className="h-3.5 w-3.5" /></GhostButton>
        <GhostButton onClick={() => moveQuestion(formId, question.id, "down")}><ArrowDown className="h-3.5 w-3.5" /></GhostButton>
        <GhostButton onClick={() => duplicateQuestion(formId, question.id)} disabled={locked}><Copy className="h-3.5 w-3.5" /></GhostButton>
        <GhostButton
          disabled={locked}
          onClick={() => {
            if (question.logic || questionsBefore.some((item) => item.question.logic?.conditions.some((condition) => condition.sourceQuestionId === question.id))) {
              if (!window.confirm("This question is used by logic. Dependent rules will be removed.")) return;
            }
            deleteQuestion(formId, question.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </GhostButton>
      </div>
      <p className="text-[12px] text-slate-400">Question {index + 1}</p>
      <FieldLabel>Label</FieldLabel>
      <BufferedTextArea value={question.label} maxLength={500} onCommit={(label) => updateQuestion(formId, question.id, { label })} />
      <FieldLabel>Help text</FieldLabel>
      <BufferedInput value={question.helpText} onCommit={(helpText) => updateQuestion(formId, question.id, { helpText })} />
      {question.type !== "content" ? (
        <Toggle label="Required" checked={question.required} onChange={(required) => updateQuestion(formId, question.id, { required })} />
      ) : null}
      {question.type === "dropdown" ? (
        <Toggle
          label="Allow multiple selection"
          checked={Boolean(question.config.multi)}
          onChange={(multi) => updateQuestion(formId, question.id, { config: { ...question.config, multi } })}
        />
      ) : null}
      {isChoiceType(question.type) ? (
        <OptionsEditor formId={formId} question={question} locked={locked} />
      ) : null}
      {question.type === "rating" ? (
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput type="number" value={String(question.config.scale || 5)} onCommit={(scale) => updateQuestion(formId, question.id, { config: { ...question.config, scale: Number(scale) } })} />
          <Select
            value={question.config.style || "stars"}
            onChange={(style) => updateQuestion(formId, question.id, { config: { ...question.config, style: style as "stars" | "numbers" } })}
            options={[
              { label: "Stars", value: "stars" },
              { label: "Numbers", value: "numbers" },
            ]}
          />
          <BufferedInput value={question.config.lowLabel || ""} placeholder="Low label" onCommit={(lowLabel) => updateQuestion(formId, question.id, { config: { ...question.config, lowLabel } })} />
          <BufferedInput value={question.config.highLabel || ""} placeholder="High label" onCommit={(highLabel) => updateQuestion(formId, question.id, { config: { ...question.config, highLabel } })} />
        </div>
      ) : null}
      {question.type === "yes_no" ? (
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput value={question.config.yesLabel || "Yes"} onCommit={(yesLabel) => updateQuestion(formId, question.id, { config: { ...question.config, yesLabel } })} />
          <BufferedInput value={question.config.noLabel || "No"} onCommit={(noLabel) => updateQuestion(formId, question.id, { config: { ...question.config, noLabel } })} />
        </div>
      ) : null}
      {(question.type === "short_text" || question.type === "long_text") ? (
        <>
          <BufferedInput placeholder="Placeholder" value={question.config.placeholder || ""} onCommit={(placeholder) => updateQuestion(formId, question.id, { config: { ...question.config, placeholder } })} />
          <BufferedInput type="number" placeholder="Max length" value={String(question.config.maxLength || "")} onCommit={(maxLength) => updateQuestion(formId, question.id, { config: { ...question.config, maxLength: Number(maxLength) } })} />
        </>
      ) : null}
      {question.type === "content" ? (
        <BufferedTextArea
          value={question.config.contentHtml || ""}
          onCommit={(contentHtml) => updateQuestion(formId, question.id, { config: { ...question.config, contentHtml } })}
          placeholder="Heading, note, or divider text"
        />
      ) : null}
      {question.type === "date" ? (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Min</FieldLabel>
              <TextInput
                type="date"
                value={question.config.min || ""}
                max={question.config.max || undefined}
                onChange={(event) => {
                  const min = event.target.value;
                  if (min && question.config.max && min > question.config.max) {
                    setRangeError("Minimum cannot be later than maximum.");
                    return;
                  }
                  setRangeError("");
                  updateQuestion(formId, question.id, { config: { ...question.config, min } });
                }}
              />
            </div>
            <div>
              <FieldLabel>Max</FieldLabel>
              <TextInput
                type="date"
                min={question.config.min || undefined}
                value={question.config.max || ""}
                onChange={(event) => {
                  const max = event.target.value;
                  if (max && question.config.min && question.config.min > max) {
                    setRangeError("Minimum cannot be later than maximum.");
                    return;
                  }
                  setRangeError("");
                  updateQuestion(formId, question.id, { config: { ...question.config, max } });
                }}
              />
            </div>
          </div>
          {rangeError ? <p className="mt-1 text-[12px] text-[#b42318]">{rangeError}</p> : null}
        </div>
      ) : null}
      {(question.type === "number" || question.type === "price" || question.type === "fees") ? (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <BufferedInput
              placeholder="Min"
              commitOnBlur
              value={question.config.min || ""}
              onChange={() => setRangeError("")}
              onCommit={(min) => {
                if (bounded && rangeIsInvalid(min, question.config.max || "")) {
                  setRangeError("Maximum cannot be less than minimum.");
                  return false;
                }
                setRangeError("");
                updateQuestion(formId, question.id, { config: { ...question.config, min } });
              }}
            />
            <BufferedInput
              placeholder="Max"
              commitOnBlur
              value={question.config.max || ""}
              onChange={() => setRangeError("")}
              onCommit={(max) => {
                if (bounded && rangeIsInvalid(question.config.min || "", max)) {
                  setRangeError("Maximum cannot be less than minimum.");
                  return false;
                }
                setRangeError("");
                updateQuestion(formId, question.id, { config: { ...question.config, max } });
              }}
            />
          </div>
          {rangeError ? <p className="mt-1 text-[12px] text-[#b42318]">{rangeError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function currentOptions(formId: string, questionId: string) {
  const form = getForm(formId);
  return form ? flattenQuestions(form).find((item) => item.question.id === questionId)?.question.options : null;
}

function OptionsEditor({ formId, question, locked }: { formId: string; question: FormQuestion; locked: boolean }) {
  return (
    <div>
      <FieldLabel>Options</FieldLabel>
      <div className="space-y-2">
        {question.options.map((option) => (
          <div key={option.id} className="flex gap-2">
            <BufferedInput
              value={option.label}
              disabled={locked && !option.isOther}
              onCommit={(label) => {
                const options = currentOptions(formId, question.id);
                if (!options?.some((item) => item.id === option.id)) return;
                updateQuestion(formId, question.id, {
                  options: options.map((item) => item.id === option.id ? { ...item, label } : item),
                });
              }}
            />
            <button
              type="button"
              disabled={locked}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const options = currentOptions(formId, question.id);
                if (!options) return;
                updateQuestion(formId, question.id, { options: options.filter((item) => item.id !== option.id) });
              }}
              className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-[#fde8e8] hover:text-[#b42318] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[12px]">
        <button
          type="button"
          disabled={locked}
          className="cursor-pointer rounded-md px-1.5 py-0.5 font-medium text-[#4f63ea] transition-colors duration-150 hover:bg-[#f4f2fe] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            const options = currentOptions(formId, question.id) ?? question.options;
            updateQuestion(formId, question.id, {
              options: [...options, { id: crypto.randomUUID(), label: `Option ${options.length + 1}` }],
            });
          }}
        >
          Add option
        </button>
      </div>
    </div>
  );
}

function LogicEditor({ formId, question, locked }: { formId: string; question: FormQuestion; locked: boolean }) {
  const form = useFormStore().forms.find((item) => item.id === formId);
  if (!form) return null;
  const earlier = flattenQuestions(form);
  const index = earlier.findIndex((item) => item.question.id === question.id);
  const sources = earlier.slice(0, index).map((item) => item.question).filter((item) => item.type !== "content");
  const rule: LogicRule = question.logic || { action: "SHOW", match: "ALL", conditions: [] };

  function write(next: LogicRule | null) {
    updateQuestion(formId, question.id, { logic: next });
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-slate-500">Show or hide this question from earlier answers. One rule, up to 10 conditions.</p>
      <Select
        value={rule.action}
        onChange={(action) => write({ ...rule, action: action as LogicRule["action"] })}
        options={[
          { label: "Show if", value: "SHOW" },
          { label: "Hide if", value: "HIDE" },
        ]}
      />
      <Select
        value={rule.match}
        onChange={(match) => write({ ...rule, match: match as LogicRule["match"] })}
        options={[
          { label: "All conditions (AND)", value: "ALL" },
          { label: "Any condition (OR)", value: "ANY" },
        ]}
      />
      {rule.conditions.map((condition) => {
        const source = sources.find((item) => item.id === condition.sourceQuestionId) || sources[0];
        const operators = operatorsFor(source?.type || "short_text", source?.config);
        return (
          <div key={condition.id} className="space-y-2 rounded-xl border border-[#f0ece6] p-2">
            <Select
              value={condition.sourceQuestionId}
              onChange={(sourceQuestionId) => {
                const nextSource = sources.find((item) => item.id === sourceQuestionId);
                write({
                  ...rule,
                  conditions: rule.conditions.map((item) => item.id === condition.id ? { ...item, sourceQuestionId, operator: operatorsFor(nextSource?.type || "short_text", nextSource?.config)[0] } : item),
                });
              }}
              options={sources.map((item) => ({ label: item.label || "Untitled", value: item.id }))}
            />
            <Select
              value={condition.operator}
              onChange={(operator) => write({ ...rule, conditions: rule.conditions.map((item) => item.id === condition.id ? { ...item, operator } : item) })}
              options={operators.map((operator) => ({ label: operator, value: operator }))}
            />
            {questionNeedsValue(condition.operator) ? (
              <BufferedInput value={condition.value} onCommit={(next) => write({ ...rule, conditions: rule.conditions.map((item) => item.id === condition.id ? { ...item, value: next } : item) })} placeholder="Value" />
            ) : null}
            <button type="button" className="cursor-pointer rounded-md px-1.5 py-0.5 text-[12px] text-[#b42318] transition-colors duration-150 hover:bg-[#fde8e8]" onClick={() => write({ ...rule, conditions: rule.conditions.filter((item) => item.id !== condition.id) })}>Remove</button>
          </div>
        );
      })}
      <GhostButton
        disabled={locked || !sources.length || rule.conditions.length >= 10}
        onClick={() => {
          const source = sources[0];
          write({
            ...rule,
            conditions: [...rule.conditions, { id: `cnd-${Date.now()}`, sourceQuestionId: source.id, operator: operatorsFor(source.type, source.config)[0], value: "" }],
          });
        }}
      >
        Add condition
      </GhostButton>
      {rule.conditions.length ? (
        <button type="button" className="block cursor-pointer rounded-md px-1.5 py-0.5 text-[12px] text-slate-500 transition-colors duration-150 hover:bg-[#f7f5f1] hover:text-slate-700" onClick={() => write(null)}>Clear rule</button>
      ) : null}
      {!sources.length ? <p className="text-[12px] text-slate-400">Add an earlier question before creating logic.</p> : null}
    </div>
  );
}

function LogicSummary({ formId }: { formId: string }) {
  const form = useFormStore().forms.find((item) => item.id === formId);
  if (!form) return null;
  const rules = flattenQuestions(form).filter((item) => item.question.logic?.conditions.length);
  if (!rules.length) return null;
  return (
    <Panel className="p-4">
      <h3 className="text-[14px] font-semibold">Logic summary</h3>
      <ul className="mt-2 space-y-1 text-[13px] text-slate-600">
        {rules.map((item) => (
          <li key={item.question.id}>{item.question.label}: {logicSummary(item.question.logic, form)}</li>
        ))}
      </ul>
    </Panel>
  );
}

function NameModal({
  title,
  label,
  saving,
  onClose,
  onSave,
}: {
  title: string;
  label: string;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<string>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <Panel className="w-full max-w-md space-y-3 p-5">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <div>
          <FieldLabel>{label}</FieldLabel>
          <TextInput
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder={label}
          />
          {error ? <p className="mt-1 text-[12px] text-[#b42318]">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2">
          <GhostButton onClick={onClose} disabled={saving}>Cancel</GhostButton>
          <PrimaryButton
            disabled={!name.trim() || saving}
            onClick={() => {
              void onSave(name.trim()).then((message) => {
                if (message) setError(message);
              });
            }}
          >
            {saving ? "Saving…" : "Save"}
          </PrimaryButton>
        </div>
      </Panel>
    </div>
  );
}

function TemplateDialog({ formId, onClose }: { formId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [visibility, setVisibility] = useState<"PRIVATE" | "SHARED">("PRIVATE");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <Panel className="w-full max-w-md space-y-3 p-5">
        <h2 className="text-[16px] font-semibold">Save as template</h2>
        <TextInput
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder="Template name"
        />
        {error ? <p className="text-[12px] text-[#b42318]">{error}</p> : null}
        <TextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
        <TextInput value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" />
        <Select
          value={visibility}
          onChange={(next) => setVisibility(next as "PRIVATE" | "SHARED")}
          options={[
            { label: "Private", value: "PRIVATE" },
            { label: "Shared with all creators", value: "SHARED" },
          ]}
        />
        <div className="flex justify-end gap-2">
          <GhostButton onClick={onClose} disabled={savingTemplate}>Cancel</GhostButton>
          <PrimaryButton
            disabled={!name.trim() || savingTemplate}
            onClick={() => {
              setSavingTemplate(true);
              void (async () => {
                const current = getForm(formId);
                if (!current || flattenQuestions(current).length === 0) {
                  setError("Add at least one question before saving this template.");
                  return;
                }
                let id = formId;
                const wasNew = isUnsavedForm(formId);
                if (wasNew) {
                  const saved = await persistLocalForm(formId);
                  if (!saved) return;
                  id = saved.id;
                }
                await saveAsTemplate(id, { name, description, category, visibility });
                toast.success("Template saved");
                onClose();
                if (wasNew) navigate(`/forms/${id}`, { replace: true, state: location.state });
              })().catch((error: Error) => {
                setError(error.message || "Unable to save this template.");
              }).finally(() => setSavingTemplate(false));
            }}
          >
            {savingTemplate ? "Saving…" : "Save template"}
          </PrimaryButton>
        </div>
      </Panel>
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-[#fbfaf8] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-[#4f63ea]" : "bg-[#e4dfd6]"}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </span>
    </button>
  );
}
