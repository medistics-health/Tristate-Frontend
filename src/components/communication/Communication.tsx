import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { getSentEmails, type SentEmail } from "../../services/operations/communication";

const SENDER_EMAIL = "noreply@tristatemso.com";

function formatDateTime(dateValue: string | null) {
  if (!dateValue) return "-";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function CommunicationPage() {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);

  const visibleEmails = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return emails;
    return emails.filter((email) => {
      const target = [
        email.subject,
        email.from,
        email.to.join(", "),
        email.cc.join(", "),
        email.bodyPreview,
        stripHtml(email.bodyHtml),
      ]
        .join(" ")
        .toLowerCase();
      return target.includes(query);
    });
  }, [emails, searchText]);

  async function loadEmails({ silent = false }: { silent?: boolean } = {}) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const data = await getSentEmails(SENDER_EMAIL);
      setEmails(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load communication emails.",
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEmails();
  }, []);

  return (
    <AppLayout title="Communication" activeSubItem="Communication">
      <div className="flex h-full flex-col gap-3">
        <section className="app-panel rounded-2xl border border-[#ece8e1] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-[18px] font-semibold text-slate-800">
                  Communication Inbox
                </h1>
                <p className="text-[12px] text-slate-500">
                  Sent email history from <span className="font-medium">{SENDER_EMAIL}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadEmails({ silent: true })}
              className="inline-flex items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </section>

        <section className="app-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#ece8e1] bg-white">
          <div className="border-b border-[#f0ece6] p-4">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by subject, recipient, or body..."
                className="w-full rounded-lg border border-[#ece8e1] bg-[#fbfaf8] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[#4f63ea]"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-[13px] text-slate-500">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading communication emails...
              </div>
            ) : visibleEmails.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <Mail className="h-8 w-8" />
                <p className="text-[14px]">No sent emails found.</p>
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-[#fbfaf8] text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Sent At</th>
                    <th className="px-4 py-3 font-semibold">Subject</th>
                    <th className="px-4 py-3 font-semibold">To</th>
                    <th className="px-4 py-3 font-semibold">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece6]">
                  {visibleEmails.map((email) => {
                    const preview = email.bodyPreview || stripHtml(email.bodyHtml);
                    return (
                      <tr
                        key={email.id}
                        className="cursor-pointer align-top hover:bg-[#fbfaf8]"
                        onClick={() => setSelectedEmail(email)}
                      >
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(email.sentDateTime)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{email.subject}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            From: {email.from || SENDER_EMAIL}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {email.to.length > 0 ? email.to.join(", ") : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          <p className="line-clamp-2 max-w-xl">{preview || "-"}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
      {selectedEmail ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#f0ece6] px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-[18px] font-semibold text-slate-800">
                  {selectedEmail.subject}
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">
                  From: {selectedEmail.from || SENDER_EMAIL}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  To: {selectedEmail.to.length ? selectedEmail.to.join(", ") : "-"}
                </p>
                {selectedEmail.cc.length ? (
                  <p className="mt-1 text-[12px] text-slate-500">
                    Cc: {selectedEmail.cc.join(", ")}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px] text-slate-500">
                  Sent: {formatDateTime(selectedEmail.sentDateTime)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setSelectedEmail(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[#fbfaf8] p-5">
              {selectedEmail.bodyHtml ? (
                <div
                  className="rounded-xl border border-[#ece8e1] bg-white p-4 text-[13px] text-slate-700"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              ) : (
                <div className="rounded-xl border border-[#ece8e1] bg-white p-4 text-[13px] text-slate-500">
                  {selectedEmail.bodyPreview || "No body content available."}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
