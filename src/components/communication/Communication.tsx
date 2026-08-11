import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Mail, RefreshCw, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import {
  getSentEmails,
  type SentEmail,
  type SentEmailFilters,
} from "../../services/operations/communication";
import { getAllPersonEmails } from "../../services/operations/persons";

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

function collectRecipientEmails(records: SentEmail[]) {
  const deduped = new Map<string, string>();
  for (const record of records) {
    for (const recipient of record.to) {
      const trimmed = recipient.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, trimmed);
      }
    }
  }
  return Array.from(deduped.values()).sort((a, b) => a.localeCompare(b));
}

function getFilterSignature(filters: SentEmailFilters) {
  return JSON.stringify({
    toEmail: (filters.toEmail || "").trim().toLowerCase(),
    sentFrom: (filters.sentFrom || "").trim(),
    sentTo: (filters.sentTo || "").trim(),
  });
}

export default function CommunicationPage() {
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
  const [searchParams] = useSearchParams();
  const initialToEmail = searchParams.get("toEmail")?.trim() || "";
  const initialSentFrom = searchParams.get("sentFrom")?.trim() || "";
  const initialSentTo = searchParams.get("sentTo")?.trim() || "";
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [sentFromDate, setSentFromDate] = useState(initialSentFrom);
  const [sentToDate, setSentToDate] = useState(initialSentTo);
  const [recipientInput, setRecipientInput] = useState(initialToEmail);
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState(initialToEmail);
  const [knownRecipients, setKnownRecipients] = useState<string[]>([]);
  const [lastSuccessfulFilterSignature, setLastSuccessfulFilterSignature] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const didRunInitialLoad = useRef(false);
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  const recipientBlurTimerRef = useRef<number | null>(null);

  const hasInvalidDateRange = Boolean(
    sentFromDate && sentToDate && sentFromDate > sentToDate,
  );
  const hasAnyFilterApplied = Boolean(
    searchText.trim() ||
      selectedRecipientEmail.trim() ||
      sentFromDate.trim() ||
      sentToDate.trim(),
  );

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

  const recipientOptions = useMemo(() => {
    const query = recipientInput.trim().toLowerCase();
    if (!query) return knownRecipients.slice(0, 50);
    return knownRecipients
      .filter((recipient) => recipient.toLowerCase().includes(query))
      .slice(0, 50);
  }, [knownRecipients, recipientInput]);

  const totalPages = Math.max(1, Math.ceil(visibleEmails.length / pageSize));
  const paginatedEmails = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return visibleEmails.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, visibleEmails]);

  const activeFilters = useMemo<SentEmailFilters>(
    () => ({
      sender: SENDER_EMAIL,
      toEmail: selectedRecipientEmail || undefined,
      sentFrom: sentFromDate || undefined,
      sentTo: sentToDate || undefined,
    }),
    [selectedRecipientEmail, sentFromDate, sentToDate],
  );
  const currentFilterSignature = useMemo(
    () => getFilterSignature(activeFilters),
    [activeFilters],
  );
  const hasFetchedCurrentFilters =
    currentFilterSignature === lastSuccessfulFilterSignature;

  const loadEmails = useCallback(
    async ({
      silent = false,
      filters = {},
    }: {
      silent?: boolean;
      filters?: SentEmailFilters;
    } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setIsLoading(true);
        }
        const data = await getSentEmails(filters);
        setEmails(data);
        setLastSuccessfulFilterSignature(getFilterSignature(filters));
        setKnownRecipients((previous) => {
          const byLowercase = new Map<string, string>();
          for (const existingRecipient of previous) {
            byLowercase.set(existingRecipient.toLowerCase(), existingRecipient);
          }
          for (const nextRecipient of collectRecipientEmails(data)) {
            const key = nextRecipient.toLowerCase();
            if (!byLowercase.has(key)) {
              byLowercase.set(key, nextRecipient);
            }
          }
          return Array.from(byLowercase.values()).sort((a, b) => a.localeCompare(b));
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to load communication emails.",
        );
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    const loadPersonEmails = async () => {
      try {
        const personEmails = await getAllPersonEmails();
        if (!isMounted) return;
        setKnownRecipients((previous) => {
          const byLowercase = new Map<string, string>();
          for (const existingRecipient of previous) {
            byLowercase.set(existingRecipient.toLowerCase(), existingRecipient);
          }
          for (const nextRecipient of personEmails) {
            const key = nextRecipient.toLowerCase();
            if (!byLowercase.has(key)) {
              byLowercase.set(key, nextRecipient);
            }
          }
          return Array.from(byLowercase.values()).sort((a, b) => a.localeCompare(b));
        });
      } catch (error) {
        if (!isMounted) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load person emails for recipient filter.",
        );
      }
    };

    loadPersonEmails();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (hasInvalidDateRange) return;
    loadEmails({
      silent: didRunInitialLoad.current,
      filters: activeFilters,
    });
    didRunInitialLoad.current = true;
  }, [activeFilters, hasInvalidDateRange, loadEmails]);

  function clearAllFilters() {
    setSentFromDate("");
    setSentToDate("");
    setRecipientInput("");
    setSelectedRecipientEmail("");
  }

  async function refreshCurrentResults() {
    if (hasInvalidDateRange) return;
    await loadEmails({ silent: true, filters: activeFilters });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSelectedRecipientEmail(recipientInput.trim());
    }, 220);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [recipientInput]);

  useEffect(() => {
    return () => {
      if (recipientBlurTimerRef.current) {
        window.clearTimeout(recipientBlurTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedRecipientEmail, sentFromDate, sentToDate]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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
              onClick={refreshCurrentResults}
              className="inline-flex items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={refreshing || hasInvalidDateRange}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </section>

        <section className="app-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#ece8e1] bg-white">
          <div className="border-b border-[#f0ece6] p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search by subject, recipient, or body..."
                  className="w-full rounded-lg border border-[#ece8e1] bg-[#fbfaf8] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[#4f63ea]"
                />
              </div>

              <div className="flex min-w-[170px] flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Sent From
                </label>
                <input
                  type="date"
                  value={sentFromDate}
                  onChange={(event) => setSentFromDate(event.target.value)}
                  max={sentToDate || undefined}
                  className="rounded-lg border border-[#ece8e1] bg-[#fbfaf8] px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#4f63ea]"
                />
              </div>

              <div className="flex min-w-[170px] flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Sent To
                </label>
                <input
                  type="date"
                  value={sentToDate}
                  onChange={(event) => setSentToDate(event.target.value)}
                  min={sentFromDate || undefined}
                  className="rounded-lg border border-[#ece8e1] bg-[#fbfaf8] px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#4f63ea]"
                />
              </div>

              <div className="flex min-w-[260px] flex-1 flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Sent To Email
                </label>
                <div className="relative">
                  <input
                    value={recipientInput}
                    onChange={(event) => {
                      setRecipientInput(event.target.value);
                      setIsRecipientDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (recipientBlurTimerRef.current) {
                        window.clearTimeout(recipientBlurTimerRef.current);
                        recipientBlurTimerRef.current = null;
                      }
                      setIsRecipientDropdownOpen(true);
                    }}
                    onBlur={() => {
                      recipientBlurTimerRef.current = window.setTimeout(() => {
                        setIsRecipientDropdownOpen(false);
                      }, 130);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setIsRecipientDropdownOpen(false);
                      }
                    }}
                    placeholder="Search recipient email..."
                    className="w-full rounded-lg border border-[#ece8e1] bg-[#fbfaf8] px-3 py-2 pr-8 text-[13px] text-slate-700 outline-none focus:border-[#4f63ea]"
                  />
                  <ChevronDown
                    className={`pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${
                      isRecipientDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                  {isRecipientDropdownOpen ? (
                    <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#ece8e1] bg-white py-1 shadow-lg">
                      {recipientOptions.length > 0 ? (
                        recipientOptions.map((recipient) => (
                          <button
                            key={recipient}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setRecipientInput(recipient);
                              setSelectedRecipientEmail(recipient);
                              setIsRecipientDropdownOpen(false);
                            }}
                            className={`block w-full px-3 py-2 text-left text-[13px] transition-colors ${
                              selectedRecipientEmail.toLowerCase() === recipient.toLowerCase()
                                ? "bg-[#f0f2fe] text-[#4f63ea] font-medium"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {recipient}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-[12px] text-slate-400">
                          No matching emails
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-lg border border-[#ece8e1] bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear Filters
              </button>
            </div>
            {hasInvalidDateRange ? (
              <p className="mt-2 text-[12px] text-rose-500">
                Sent From date cannot be after Sent To date.
              </p>
            ) : null}
            {!isLoading && !refreshing && hasAnyFilterApplied && hasFetchedCurrentFilters ? (
              <p className="mt-2 text-[12px] text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {paginatedEmails.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {visibleEmails.length}
                </span>{" "}
                {visibleEmails.length === 1 ? "mail" : "mails"} filtered.
              </p>
            ) : null}
          </div>

          <div
            className={`relative min-h-0 flex-1 ${refreshing ? "overflow-hidden" : "overflow-auto"}`}
          >
            {refreshing && !isLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-2 text-[12px] font-medium text-slate-600 shadow-sm">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Applying Filters...
                </div>
              </div>
            ) : null}

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
              <div className="flex h-full flex-col">
                <table className="w-full text-left text-[13px]">
                  <thead className="sticky top-0 bg-[#fbfaf8] text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 font-semibold">To</th>
                      <th className="px-4 py-3 font-semibold">Preview</th>
                      <th className="px-4 py-3 font-semibold">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ece6]">
                    {paginatedEmails.map((email) => {
                      const preview = email.bodyPreview || stripHtml(email.bodyHtml);
                      return (
                        <tr
                          key={email.id}
                          className="cursor-pointer align-top hover:bg-[#fbfaf8]"
                          onClick={() => setSelectedEmail(email)}
                        >
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
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {formatDateTime(email.sentDateTime)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#f0ece6] bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-[12px] text-slate-500">
                    <span>Rows per page</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                        setCurrentPage(1);
                      }}
                      className="rounded-md border border-[#ece8e1] bg-white px-2 py-1 text-[12px] text-slate-700 outline-none focus:border-[#4f63ea]"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-[12px] text-slate-500">
                      Page{" "}
                      <span className="font-semibold text-slate-700">{currentPage}</span> of{" "}
                      <span className="font-semibold text-slate-700">{totalPages}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage >= totalPages}
                      className="rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
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
