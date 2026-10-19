import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RespondentForm } from "./RespondentForm";
import { markOpened, submitResponse, useFormStore } from "./store";

export default function PublicFormPage() {
  const { token = "" } = useParams();
  const { forms } = useFormStore();
  const match = forms.flatMap((form) => {
    const recipient = form.recipients.find((item) => item.token === token);
    if (recipient) return [{ form, recipient }];
    if (form.publicLinkEnabled && form.publicToken === token) return [{ form, recipient: null }];
    return [];
  })[0];
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (match?.recipient && match.form.status === "PUBLISHED") {
      markOpened(match.form.id, match.recipient.id);
    }
  }, [match?.form.id, match?.form.status, match?.recipient]);

  if (!match) return <Status title="This link is not valid" body="The link may have been revoked or typed incorrectly." />;
  const { form, recipient } = match;
  if (form.status === "DRAFT" || form.scheduled) return <Status title="This form is not open yet" body="Please come back when the invitation window starts." />;
  if (form.status === "CLOSED" || form.status === "ARCHIVED") return <Status title="This form is closed" body="Responses are no longer accepted." />;
  if (recipient?.status === "REMOVED" || recipient?.status === "EXPIRED") return <Status title="This link is no longer active" body="Ask the sender for a new invitation." />;
  if (form.oneResponse && recipient?.status === "COMPLETED") return <Status title="Already submitted" body="A response has already been recorded for this link." />;
  if (notice) return <Status title="Thank you" body={notice} />;

  return (
    <main className="min-h-screen bg-[#f6f4f0] px-4 py-8 font-app-sans">
      <RespondentForm
        form={form}
        onSubmit={(answers) => {
          const result = submitResponse(
            form.id,
            recipient?.id || null,
            answers,
            recipient?.practice || "",
            recipient?.name || "Anonymous",
          );
          if (!result.ok && result.reason === "already") setNotice("A response has already been recorded for this link.");
          else if (!result.ok) setNotice("This form is no longer accepting responses.");
          else setNotice(form.confirmationMessage);
        }}
      />
    </main>
  );
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
