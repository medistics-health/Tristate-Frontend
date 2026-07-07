import axios from "axios";
import { apiConnector } from "../apiConnector";
import { invoiceEndpoints } from "../apis";

const STRIPE_PAYOUTS = `${invoiceEndpoints.LIST}/stripe-payouts`;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = (
      error.response?.data as { message?: string } | undefined
    )?.message;
    return apiMessage ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export type StripePayoutRow = {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  practiceName: string;
  invoiceStatus: string;
  stripeConnectedAccountId: string;
  stripeConnectedAccountName: string;
  amount: number;
  currency: string;
  status: string;
  stripeTransferId: string | null;
  transferGroup: string | null;
  failureMessage: string | null;
  serviceNames: string[];
  lineItemDescriptions: string[];
  createdAt: string;
  updatedAt: string;
};

export type StripePayoutAccountSummary = {
  stripeConnectedAccountId: string;
  stripeConnectedAccountName: string;
  transferCount: number;
  invoiceCount: number;
  customerPaidTotal: number;
  sentTotal: number;
  pendingTotal: number;
  failedTotal: number;
  skippedTotal: number;
  latestStatus: string;
  latestUpdatedAt: string;
};

export type StripePayoutSummaryResponse = {
  platformAccount: {
    id: string;
    displayName: string;
    email: string | null;
    country: string | null;
    defaultCurrency: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsDisabledReason: string | null;
    businessProfile: {
      name: string | null;
      url: string | null;
    };
  } | null;
  connectedAccounts: StripePayoutAccountSummary[];
  totals: {
    totalAllocated: number;
    totalSent: number;
    totalPending: number;
    totalFailed: number;
    totalSkipped: number;
    customerPaidTotal: number;
    transferCount: number;
  };
  rows: StripePayoutRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type StripePayoutQueryParams = {
  page?: number;
  limit?: number;
  accountId?: string;
  status?: string;
  invoiceStatus?: string;
  search?: string;
};

export async function getInvoiceStripePayoutSummary(
  params?: StripePayoutQueryParams,
): Promise<StripePayoutSummaryResponse> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.accountId) queryString.set("accountId", params.accountId);
    if (params?.status) queryString.set("status", params.status);
    if (params?.invoiceStatus) queryString.set("invoiceStatus", params.invoiceStatus);
    if (params?.search) queryString.set("search", params.search);

    const url = queryString.toString()
      ? `${STRIPE_PAYOUTS}?${queryString.toString()}`
      : STRIPE_PAYOUTS;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });

    return response.data as StripePayoutSummaryResponse;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch Stripe payout summary."),
    );
  }
}
