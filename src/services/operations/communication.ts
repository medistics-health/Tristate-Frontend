import axios from "axios";
import { communicationEndpoints } from "../apis";
import { apiConnector } from "../apiConnector";

type GraphRecipient = {
  emailAddress?: {
    address?: string;
    name?: string;
  };
};

type GraphBody = {
  contentType?: string;
  content?: string;
};

type RawEmail = {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  body?: GraphBody | string;
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  sentDateTime?: string;
  createdDateTime?: string;
  receivedDateTime?: string;
  internetMessageId?: string;
};

export type SentEmail = {
  id: string;
  subject: string;
  bodyPreview: string;
  bodyHtml: string;
  from: string;
  to: string[];
  cc: string[];
  sentDateTime: string | null;
  internetMessageId: string;
};

export type SentEmailFilters = {
  sender?: string;
  toEmail?: string;
  sentFrom?: string;
  sentTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type SentEmailPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SentEmailsResponse = {
  emails: SentEmail[];
  pagination: SentEmailPagination;
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.error || data?.message || fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

function parseRecipients(recipients: GraphRecipient[] | undefined): string[] {
  if (!Array.isArray(recipients)) return [];
  return recipients
    .map((recipient) => recipient?.emailAddress?.address?.trim())
    .filter((email): email is string => Boolean(email));
}

function normalizeEmailRecord(email: RawEmail, index: number): SentEmail {
  const bodyValue =
    typeof email.body === "string" ? email.body : (email.body?.content ?? "");
  const sentDateTime =
    email.sentDateTime ?? email.createdDateTime ?? email.receivedDateTime ?? null;

  return {
    id: email.id || email.internetMessageId || `email-${index}`,
    subject: email.subject?.trim() || "(No Subject)",
    bodyPreview: email.bodyPreview?.trim() || "",
    bodyHtml: bodyValue || "",
    from: email.from?.emailAddress?.address?.trim() || "",
    to: parseRecipients(email.toRecipients),
    cc: parseRecipients(email.ccRecipients),
    sentDateTime,
    internetMessageId: email.internetMessageId || "",
  };
}

export async function getSentEmails(
  filters: SentEmailFilters = {},
): Promise<SentEmailsResponse> {
  try {
    const params: Record<string, string | number> = {
      sender: filters.sender?.trim() || "noreply@tristatemso.com",
      page: filters.page && filters.page > 0 ? filters.page : 1,
      limit: filters.limit && filters.limit > 0 ? filters.limit : 25,
    };
    if (filters.toEmail?.trim()) {
      params.toEmail = filters.toEmail.trim();
    }
    if (filters.sentFrom?.trim()) {
      params.sentFrom = filters.sentFrom.trim();
    }
    if (filters.sentTo?.trim()) {
      params.sentTo = filters.sentTo.trim();
    }
    if (filters.search?.trim()) {
      params.search = filters.search.trim();
    }

    const response = await apiConnector({
      method: "GET",
      url: communicationEndpoints.SENT_EMAILS,
      credentials: true,
      params,
    });

    const payload = response.data as
      | RawEmail[]
      | {
          emails?: RawEmail[];
          messages?: RawEmail[];
          data?: RawEmail[];
          pagination?: Partial<SentEmailPagination>;
        };

    const records = Array.isArray(payload)
      ? payload
      : payload.emails || payload.messages || payload.data || [];
    const emails = records.map(normalizeEmailRecord);
    const paginationPayload = Array.isArray(payload)
      ? undefined
      : payload.pagination;
    const page = paginationPayload?.page || Number(params.page);
    const limit = paginationPayload?.limit || Number(params.limit);
    const total = paginationPayload?.total ?? emails.length;
    const totalPages =
      paginationPayload?.totalPages ||
      Math.max(1, Math.ceil(total / limit) || 1);

    return {
      emails,
      pagination: { page, limit, total, totalPages },
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch sent communication emails."),
    );
  }
}

export async function getEmailHistoryByPersonId(
  personId: string,
): Promise<SentEmail[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: communicationEndpoints.HISTORY_BY_PERSON(personId),
      credentials: true,
    });

    const payload = response.data as
      | RawEmail[]
      | { emails?: RawEmail[]; messages?: RawEmail[]; data?: RawEmail[] };

    const records = Array.isArray(payload)
      ? payload
      : payload.emails || payload.messages || payload.data || [];

    return records.map(normalizeEmailRecord);
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch person email history."),
    );
  }
}
