import { useEffect, useMemo, useState } from "react";
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
import { RespondentForm } from "./RespondentForm";
import {
  addQuestion,
  addSection,
  deleteQuestion,
  deleteSection,
  duplicateQuestion,
  loadFormDocument,
  moveQuestion,
  publishForm,
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
  const { forms } = useFormStore();
  const form = forms.find((item) => item.id === id);
  useEffect(() => {
    if (id) void loadFormDocument(id);
  }, [id]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"question" | "settings" | "logic">("question");
  const [errors, setErrors] = useState<{ message: string; target: string }[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [preview, setPreview] = useState(location.pathname.endsWith("/preview"));

  const selected = useMemo(() => {
    if (!form) return null;
    return flattenQuestions(form).find((item) => item.question.id === selectedId)?.question ?? null;
  }, [form, selectedId]);

  if (!form?.detailLoaded) {
    return <div className="p-8 text-sm text-slate-500">Loading form…</div>;
  }

  const locked = form.responses.length > 0;
  const questions = flattenQuestions(form);

  function publish(scheduled: boolean) {
    void publishForm(form.id, scheduled).then((result) => {
      if (result.length) {
        setErrors(result);
        toast.error(result[0]?.message || "Fix the listed issues before publishing.");
        return;
      }
      toast.success(scheduled ? "Form scheduled" : "Form published");
    });
  }

  return (
    <div className="flex h-screen flex-col bg-[#f7f5f1] font-app-sans text-slate-700">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#ece8e1] bg-white px-4 py-3">
        <button type="button" onClick={() => navigate("/forms")} className="text-[13px] text-slate-500 hover:text-slate-800">
          Forms
        </button>
        <BufferedInput
          value={form.title}
          onCommit={(title) => updateForm(form.id, { title: title.slice(0, 200) })}
          className="min-w-0 flex-1 border-transparent bg-transparent px-0 text-[16px] font-semibold text-slate-800 shadow-none"
        />
        <StatusPill status={form.status} scheduled={form.scheduled} />
        <span className="text-[12px] text-slate-400">Last saved {formatWhen(form.updatedAt)}</span>
        <GhostButton onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> Preview</GhostButton>
        <GhostButton onClick={() => navigate(`/forms/${form.id}/distribute`)}>Distribute</GhostButton>
        <GhostButton onClick={() => setTemplateOpen(true)}>Save as template</GhostButton>
        {form.status === "DRAFT" || form.status === "PUBLISHED" ? (
          <PrimaryButton onClick={() => publish(false)}>Publish</PrimaryButton>
        ) : null}
      </header>
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
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-[#f7f5f1] disabled:opacity-40"
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
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left ${
                        selectedId === question.id ? "border-[#9cb1f6] bg-[#f7f8ff]" : "border-[#f0ece6] bg-[#fbfaf8]"
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
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#4f63ea] disabled:opacity-40"
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
          <div className="mb-4 flex gap-2 text-[13px]">
            {(["question", "logic", "settings"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-full px-3 py-1 capitalize ${tab === item ? "bg-[#eef2ff] text-[#3144c4]" : "text-slate-500"}`}
              >
                {item}
              </button>
            ))}
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
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-slate-400">{form.refCode} · v{form.version}</p>
      <FieldLabel>Confirmation message</FieldLabel>
      <BufferedTextArea value={form.confirmationMessage} onCommit={(confirmationMessage) => updateForm(form.id, { confirmationMessage })} />
      <FieldLabel>Redirect URL after submit</FieldLabel>
      <BufferedInput value={form.redirectUrl} onCommit={(redirectUrl) => updateForm(form.id, { redirectUrl })} placeholder="https://" />
      <FieldLabel>Display</FieldLabel>
      <select
        value={form.displayMode}
        onChange={(event) => updateForm(form.id, { displayMode: event.target.value as typeof form.displayMode })}
        className="h-10 w-full rounded-lg border border-[#e4dfd6] px-3 text-[13px]"
      >
        <option value="SINGLE_PAGE">All sections on one page</option>
        <option value="MULTI_PAGE">One section per page</option>
      </select>
      <Toggle label="Show progress bar" checked={form.showProgress} onChange={(showProgress) => updateForm(form.id, { showProgress })} />
      <Toggle label="Show question numbers" checked={form.showNumbers} onChange={(showNumbers) => updateForm(form.id, { showNumbers })} />
      <Toggle label="Allow save and resume" checked={form.allowResume} onChange={(allowResume) => updateForm(form.id, { allowResume })} />
      <Toggle label="One response per person" checked={form.oneResponse} disabled={locked} onChange={(oneResponse) => updateForm(form.id, { oneResponse })} />
      <FieldLabel>Response mode</FieldLabel>
      <select
        disabled={locked || form.status !== "DRAFT"}
        value={form.responseMode}
        onChange={(event) => updateForm(form.id, { responseMode: event.target.value as typeof form.responseMode })}
        className="h-10 w-full rounded-lg border border-[#e4dfd6] px-3 text-[13px] disabled:bg-[#f7f5f1]"
      >
        <option value="IDENTIFIED">Identified</option>
        <option value="ANONYMOUS">Anonymous</option>
      </select>
      {form.responseMode === "ANONYMOUS" ? (
        <div className="rounded-lg bg-[#fff1bd] p-2 text-[12px] text-[#8a6800]">
          Recording the practice can reveal who answered when a practice has very few recipients. Groups under 3 responses stay aggregated.
          <Toggle
            label="Record practice with response"
            checked={form.recordPracticeWhenAnonymous}
            onChange={(recordPracticeWhenAnonymous) => updateForm(form.id, { recordPracticeWhenAnonymous })}
          />
        </div>
      ) : null}
      <p className="text-[12px] text-slate-400">
        {publishValidation(form).length} publish checks currently failing.
      </p>
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
      <p className="text-[12px] text-slate-400">Key {question.key} · Q{index + 1}</p>
      <FieldLabel>Label</FieldLabel>
      <BufferedTextArea value={question.label} maxLength={500} onCommit={(label) => updateQuestion(formId, question.id, { label })} />
      <FieldLabel>Help text</FieldLabel>
      <BufferedInput value={question.helpText} onCommit={(helpText) => updateQuestion(formId, question.id, { helpText })} />
      {question.type !== "content" ? (
        <Toggle label="Required" checked={question.required} onChange={(required) => updateQuestion(formId, question.id, { required })} />
      ) : null}
      {isChoiceType(question.type) ? (
        <OptionsEditor formId={formId} question={question} locked={locked} />
      ) : null}
      {question.type === "rating" ? (
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput type="number" value={String(question.config.scale || 5)} onCommit={(scale) => updateQuestion(formId, question.id, { config: { ...question.config, scale: Number(scale) } })} />
          <select
            value={question.config.style || "stars"}
            onChange={(event) => updateQuestion(formId, question.id, { config: { ...question.config, style: event.target.value as "stars" | "numbers" } })}
            className="h-10 rounded-lg border border-[#e4dfd6] px-2 text-[13px]"
          >
            <option value="stars">Stars</option>
            <option value="numbers">Numbers</option>
          </select>
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
      {(question.type === "number" || question.type === "price" || question.type === "fees" || question.type === "date") ? (
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput placeholder="Min" value={question.config.min || ""} onCommit={(min) => updateQuestion(formId, question.id, { config: { ...question.config, min } })} />
          <BufferedInput placeholder="Max" value={question.config.max || ""} onCommit={(max) => updateQuestion(formId, question.id, { config: { ...question.config, max } })} />
        </div>
      ) : null}
    </div>
  );
}

function OptionsEditor({ formId, question, locked }: { formId: string; question: FormQuestion; locked: boolean }) {
  return (
    <div>
      <FieldLabel>Options</FieldLabel>
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <div key={option.id} className="flex gap-2">
            <BufferedInput
              value={option.label}
              disabled={locked && !option.isOther}
              onCommit={(label) => {
                const options = question.options.map((item) => item.id === option.id ? { ...item, label } : item);
                updateQuestion(formId, question.id, { options });
              }}
            />
            <button
              type="button"
              disabled={locked}
              onClick={() => updateQuestion(formId, question.id, { options: question.options.filter((item) => item.id !== option.id) })}
              className="text-slate-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <span className="sr-only">{index}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 text-[12px]">
        <button
          type="button"
          disabled={locked}
          className="font-medium text-[#4f63ea]"
          onClick={() => updateQuestion(formId, question.id, { options: [...question.options, { id: `opt-${Date.now()}`, label: `Option ${question.options.length + 1}` }] })}
        >
          Add option
        </button>
        <button
          type="button"
          disabled={locked}
          className="text-slate-500"
          onClick={() => {
            const pasted = window.prompt("Paste one option per line");
            if (!pasted) return;
            const options = pasted.split("\n").map((label) => label.trim()).filter(Boolean).map((label, index) => ({ id: `opt-${Date.now()}-${index}`, label }));
            if (options.length) updateQuestion(formId, question.id, { options });
          }}
        >
          Bulk paste
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
      <select
        value={rule.action}
        onChange={(event) => write({ ...rule, action: event.target.value as LogicRule["action"] })}
        className="h-10 w-full rounded-lg border border-[#e4dfd6] px-3 text-[13px]"
      >
        <option value="SHOW">Show if</option>
        <option value="HIDE">Hide if</option>
      </select>
      <select
        value={rule.match}
        onChange={(event) => write({ ...rule, match: event.target.value as LogicRule["match"] })}
        className="h-10 w-full rounded-lg border border-[#e4dfd6] px-3 text-[13px]"
      >
        <option value="ALL">All conditions (AND)</option>
        <option value="ANY">Any condition (OR)</option>
      </select>
      {rule.conditions.map((condition) => {
        const source = sources.find((item) => item.id === condition.sourceQuestionId) || sources[0];
        const operators = operatorsFor(source?.type || "short_text");
        return (
          <div key={condition.id} className="space-y-2 rounded-xl border border-[#f0ece6] p-2">
            <select
              value={condition.sourceQuestionId}
              onChange={(event) => {
                const nextSource = sources.find((item) => item.id === event.target.value);
                write({
                  ...rule,
                  conditions: rule.conditions.map((item) => item.id === condition.id ? { ...item, sourceQuestionId: event.target.value, operator: operatorsFor(nextSource?.type || "short_text")[0] } : item),
                });
              }}
              className="h-10 w-full rounded-lg border border-[#e4dfd6] px-2 text-[13px]"
            >
              {sources.map((item) => (
                <option key={item.id} value={item.id}>{item.label || "Untitled"}</option>
              ))}
            </select>
            <select
              value={condition.operator}
              onChange={(event) => write({ ...rule, conditions: rule.conditions.map((item) => item.id === condition.id ? { ...item, operator: event.target.value } : item) })}
              className="h-10 w-full rounded-lg border border-[#e4dfd6] px-2 text-[13px]"
            >
              {operators.map((operator) => <option key={operator}>{operator}</option>)}
            </select>
            {questionNeedsValue(condition.operator) ? (
              <BufferedInput value={condition.value} onCommit={(next) => write({ ...rule, conditions: rule.conditions.map((item) => item.id === condition.id ? { ...item, value: next } : item) })} placeholder="Value" />
            ) : null}
            <button type="button" className="text-[12px] text-[#b42318]" onClick={() => write({ ...rule, conditions: rule.conditions.filter((item) => item.id !== condition.id) })}>Remove</button>
          </div>
        );
      })}
      <GhostButton
        disabled={locked || !sources.length || rule.conditions.length >= 10}
        onClick={() => {
          const source = sources[0];
          write({
            ...rule,
            conditions: [...rule.conditions, { id: `cnd-${Date.now()}`, sourceQuestionId: source.id, operator: operatorsFor(source.type)[0], value: "" }],
          });
        }}
      >
        Add condition
      </GhostButton>
      {rule.conditions.length ? (
        <button type="button" className="block text-[12px] text-slate-500" onClick={() => write(null)}>Clear rule</button>
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

function TemplateDialog({ formId, onClose }: { formId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [visibility, setVisibility] = useState<"PRIVATE" | "SHARED">("PRIVATE");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <Panel className="w-full max-w-md space-y-3 p-5">
        <h2 className="text-[16px] font-semibold">Save as template</h2>
        <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Template name" />
        <TextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
        <TextInput value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" />
        <select value={visibility} onChange={(event) => setVisibility(event.target.value as "PRIVATE" | "SHARED")} className="h-10 w-full rounded-lg border border-[#e4dfd6] px-3 text-[13px]">
          <option value="PRIVATE">Private</option>
          <option value="SHARED">Shared with all creators</option>
        </select>
        <div className="flex justify-end gap-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            disabled={!name.trim()}
            onClick={() => {
              void saveAsTemplate(formId, { name, description, category, visibility }).then(() => {
                toast.success("Template saved");
                onClose();
              });
            }}
          >
            Save template
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
    <label className="flex items-center justify-between gap-3 py-1 text-[13px]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
