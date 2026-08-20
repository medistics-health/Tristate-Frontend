import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Mail, X } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar, {
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
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
    search: (filters.search || "").trim().toLowerCase(),
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [sentFromDate, setSentFromDate] = useState(initialSentFrom);
  const [sentToDate, setSentToDate] = useState(initialSentTo);
  const [recipientInput, setRecipientInput] = useState(initialToEmail);
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState(initialToEmail);
  const [knownRecipients, setKnownRecipients] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [totalEmails, setTotalEmails] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const prevListQueryKeyRef = useRef("");
  const loadRequestIdRef = useRef(0);
  const totalsByFilterRef = useRef<Map<string, number>>(new Map());
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  const recipientBlurTimerRef = useRef<number | null>(null);

  const hasInvalidDateRange = Boolean(
    sentFromDate && sentToDate && sentFromDate > sentToDate,
  );

  const recipientOptions = useMemo(() => {
    const query = recipientInput.trim().toLowerCase();
    if (!query) return knownRecipients.slice(0, 50);
    return knownRecipients
      .filter((recipient) => recipient.toLowerCase().includes(query))
      .slice(0, 50);
  }, [knownRecipients, recipientInput]);

  const activeFilters = useMemo<SentEmailFilters>(
    () => ({
      sender: SENDER_EMAIL,
      toEmail: selectedRecipientEmail || undefined,
      sentFrom: sentFromDate || undefined,
      sentTo: sentToDate || undefined,
      search: debouncedSearch || undefined,
    }),
    [selectedRecipientEmail, sentFromDate, sentToDate, debouncedSearch],
  );
  const currentFilterSignature = useMemo(
    () => getFilterSignature(activeFilters),
    [activeFilters],
  );

  const loadEmails = useCallback(
    async ({ filters = {} }: { filters?: SentEmailFilters } = {}) => {
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      try {
        setIsLoading(true);
        const data = await getSentEmails(filters);
        if (requestId !== loadRequestIdRef.current) return;
        const recipient = filters.toEmail?.trim().toLowerCase();
        const emails = recipient
          ? data.emails.filter((email) =>
              email.to.some((to) => to.trim().toLowerCase() === recipient),
            )
          : data.emails;
        const filterSignature = getFilterSignature(filters);
        const pageLimit = filters.limit && filters.limit > 0 ? filters.limit : emails.length;
        const previousTotal = totalsByFilterRef.current.get(filterSignature);
        const incomingTotal = data.pagination.total;
        const looksTruncated =
          emails.length < pageLimit && incomingTotal === emails.length;
        const total = Math.max(
          incomingTotal,
          emails.length,
          looksTruncated || (previousTotal !== undefined && incomingTotal < previousTotal)
            ? previousTotal ?? 0
            : 0,
        );
        totalsByFilterRef.current.set(filterSignature, total);
        setEmails(emails);
        setTotalEmails(total);
        setTotalPages(Math.max(1, Math.ceil(total / Math.max(pageLimit, 1))));
        const requestedPage = filters.page && filters.page > 0 ? filters.page : 1;
        const lastPage = Math.max(1, Math.ceil(total / Math.max(pageLimit, 1)));
        if (requestedPage > lastPage) {
          setCurrentPage(lastPage);
        }
        setKnownRecipients((previous) => {
          const byLowercase = new Map<string, string>();
          for (const existingRecipient of previous) {
            byLowercase.set(existingRecipient.toLowerCase(), existingRecipient);
          }
          for (const nextRecipient of collectRecipientEmails(data.emails)) {
            const key = nextRecipient.toLowerCase();
            if (!byLowercase.has(key)) {
              byLowercase.set(key, nextRecipient);
            }
          }
          return Array.from(byLowercase.values()).sort((a, b) => a.localeCompare(b));
        });
      } catch (error) {
        if (requestId !== loadRequestIdRef.current) return;
        toast.error(
          error instanceof Error ? error.message : "Unable to load communication emails.",
        );
      } finally {
        if (requestId !== loadRequestIdRef.current) return;
        setIsLoading(false);
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
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchText]);

  useEffect(() => {
    if (hasInvalidDateRange) return;

    const listQueryKey = `${currentFilterSignature}|${pageSize}`;
    if (prevListQueryKeyRef.current !== listQueryKey) {
      prevListQueryKeyRef.current = listQueryKey;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }

    loadEmails({
      filters: {
        ...activeFilters,
        page: currentPage,
        limit: pageSize,
      },
    });
  }, [
    activeFilters,
    currentFilterSignature,
    currentPage,
    hasInvalidDateRange,
    loadEmails,
    pageSize,
  ]);

  function resetToFirstPage() {
    setCurrentPage(1);
  }

  function clearAllFilters() {
    setSearchText("");
    setDebouncedSearch("");
    setSentFromDate("");
    setSentToDate("");
    setRecipientInput("");
    setSelectedRecipientEmail("");
    resetToFirstPage();
  }

  async function refreshCurrentResults() {
    if (hasInvalidDateRange) return;
    totalsByFilterRef.current.delete(getFilterSignature(activeFilters));
    await loadEmails({
      filters: {
        ...activeFilters,
        page: currentPage,
        limit: pageSize,
      },
    });
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

  const activeFilterCount = [
    selectedRecipientEmail,
    sentFromDate,
    sentToDate,
  ].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedRecipientEmail) {
      chips.push({
        key: "toEmail",
        label: "Sent To Email",
        displayValue: selectedRecipientEmail,
        onClear: () => {
          setRecipientInput("");
          setSelectedRecipientEmail("");
          resetToFirstPage();
        },
      });
    }
    if (sentFromDate) {
      chips.push({
        key: "sentFrom",
        label: "Sent From",
        displayValue: sentFromDate,
        onClear: () => {
          setSentFromDate("");
          resetToFirstPage();
        },
      });
    }
    if (sentToDate) {
      chips.push({
        key: "sentTo",
        label: "Sent To",
        displayValue: sentToDate,
        onClear: () => {
          setSentToDate("");
          resetToFirstPage();
        },
      });
    }
    return chips;
  }, [selectedRecipientEmail, sentFromDate, sentToDate]);

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Sent From
        </span>
        <input
          type="date"
          value={sentFromDate}
          onChange={(event) => {
            setSentFromDate(event.target.value);
            resetToFirstPage();
          }}
          max={sentToDate || undefined}
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Sent To
        </span>
        <input
          type="date"
          value={sentToDate}
          onChange={(event) => {
            setSentToDate(event.target.value);
            resetToFirstPage();
          }}
          min={sentFromDate || undefined}
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        />
      </label>
      <label className="block md:col-span-2 lg:col-span-3">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Sent To Email
        </span>
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
            className="app-control w-full rounded-md px-3 py-2 pr-8 text-[13px]"
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
                      resetToFirstPage();
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
      </label>
      {hasInvalidDateRange ? (
        <p className="md:col-span-2 lg:col-span-3 text-[12px] text-rose-500">
          Sent From date cannot be after Sent To date.
        </p>
      ) : null}
    </>
  );

  return (
    <AppLayout title="Communication" activeSubItem="Communication">
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Communication Inbox"
            subtitle={`Sent email history from ${SENDER_EMAIL}`}
            searchPlaceholder="Search by subject, recipient, or body..."
            searchValue={searchText}
            onSearchChange={(value) => {
              setSearchText(value);
              resetToFirstPage();
            }}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={clearAllFilters}
            filterModalTitle="Filter Communication"
            filterFields={filterFieldsModal}
            onRefresh={refreshCurrentResults}
            isLoading={isLoading}
            page={currentPage}
            pageSize={pageSize}
            totalRecords={totalEmails}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize as (typeof PAGE_SIZE_OPTIONS)[number]);
              resetToFirstPage();
            }}
            pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
          >
            <div className="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {hasInvalidDateRange ? (
                <p className="px-4 pt-3 text-[12px] text-rose-500">
                  Sent From date cannot be after Sent To date.
                </p>
              ) : null}

              {emails.length === 0 && !isLoading ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 text-slate-400">
                  <Mail className="h-8 w-8" />
                  <p className="text-[14px]">No sent emails found.</p>
                </div>
              ) : (
                <table className="w-full text-left text-[13px]">
                  <thead className="sticky top-0 z-10 bg-[#fbfaf8] text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 font-semibold">To</th>
                      <th className="px-4 py-3 font-semibold">Preview</th>
                      <th className="px-4 py-3 font-semibold">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ece6]">
                    {emails.map((email) => {
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
              )}
            </div>
          </DataTableToolbar>
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
