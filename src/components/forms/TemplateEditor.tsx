import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FormsLayout, FieldLabel, GhostButton, Panel, PrimaryButton, TextArea, TextInput } from "./chrome";
import { createForm, getDocument, saveFormContent, saveTemplate } from "./api";

type QuestionType = "short_text" | "long_text" | "yes_no" | "single_choice" | "rating";

type DraftQuestion = {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string;
};

const TYPE_LABELS: { type: QuestionType; label: string }[] = [
  { type: "short_text", label: "Short text" },
  { type: "long_text", label: "Long text" },
  { type: "yes_no", label: "Yes / No" },
  { type: "single_choice", label: "Single choice" },
  { type: "rating", label: "Rating" },
];

function blankQuestion(type: QuestionType = "short_text"): DraftQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    label: "",
    required: true,
    options: type === "single_choice" ? "Yes\nNo" : "",
  };
}

export default function TemplateEditor() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [saving, setSaving] = useState(false);

  function update(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question) => (question.id === id ? { ...question, ...patch } : question)));
  }

  async function save() {
    const title = name.trim();
    if (!title) {
      toast.error("Template name is required.");
      return;
    }
    if (questions.some((question) => !question.label.trim())) {
      toast.error("Every question needs a label.");
      return;
    }
    if (questions.some((question) => question.type === "single_choice" && question.options.split("\n").map((item) => item.trim()).filter(Boolean).length < 2)) {
      toast.error("A single choice question needs at least two options.");
      return;
    }
    setSaving(true);
    try {
      const created = await createForm(title);
      const current = await getDocument(created.id);
      await saveFormContent(created.id, {
        title,
        description,
        lockVersion: current.lockVersion,
        sections: [
          {
            id: crypto.randomUUID(),
            title: "Questions",
            questions: questions.map((question) => ({
              id: question.id,
              type: question.type,
              label: question.label.trim(),
              required: question.required,
              options:
                question.type === "single_choice"
                  ? question.options
                      .split("\n")
                      .map((label) => label.trim())
                      .filter(Boolean)
                      .map((label) => ({ id: crypto.randomUUID(), label }))
                  : [],
              config: question.type === "rating" ? { scale: 5, style: "numbers" } : {},
            })),
          },
        ],
      });
      await saveTemplate(created.id, {
        name: title,
        description,
        category: "General",
        visibility: "PRIVATE",
      });
      navigate(`/forms/${created.id}/send`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormsLayout title="New template" activeSubItem="All Forms">
      <div className="mx-auto max-w-2xl space-y-4 font-app-sans">
        <Panel className="space-y-3 p-4">
          <div>
            <FieldLabel>Template name</FieldLabel>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Practice check-in" />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <TextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this form is for" />
          </div>
        </Panel>

        {questions.map((question, index) => (
          <Panel key={question.id} className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-slate-500">Question {index + 1}</p>
              {questions.length > 1 ? (
                <button type="button" className="text-[12px] text-[#b42318]" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}>
                  Remove
                </button>
              ) : null}
            </div>
            <TextInput value={question.label} onChange={(event) => update(question.id, { label: event.target.value })} placeholder="Question" />
            <div className="flex flex-wrap gap-2">
              {TYPE_LABELS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => update(question.id, { type: item.type, options: item.type === "single_choice" ? question.options || "Yes\nNo" : question.options })}
                  className={`rounded-full px-3 py-1 text-[12px] ${question.type === item.type ? "bg-[#eef2ff] text-[#3144c4]" : "bg-[#f7f5f1] text-slate-500"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {question.type === "single_choice" ? (
              <TextArea value={question.options} onChange={(event) => update(question.id, { options: event.target.value })} placeholder={"One option per line"} />
            ) : null}
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              <input type="checkbox" checked={question.required} onChange={(event) => update(question.id, { required: event.target.checked })} />
              Required
            </label>
          </Panel>
        ))}

        <div className="flex items-center justify-between">
          <GhostButton onClick={() => setQuestions((current) => [...current, blankQuestion()])}>Add question</GhostButton>
          <PrimaryButton disabled={saving} onClick={save}>Save and choose recipients</PrimaryButton>
        </div>
      </div>
    </FormsLayout>
  );
}
