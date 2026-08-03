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
  sender = "noreply@tristatemso.com",
): Promise<SentEmail[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: communicationEndpoints.SENT_EMAILS,
      credentials: true,
      params: { sender },
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
      getErrorMessage(error, "Unable to fetch sent communication emails."),
    );
  }
}
