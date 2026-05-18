import { apiConnector } from "../apiConnector";
import { mercuryEndpoints } from "../apis";

export type MercuryTransaction = {
  id: string;
  mercuryTransactionId: string;
  accountId: string;
  amount: string | number;
  direction: "CREDIT" | "DEBIT";
  status: string;
  description?: string | null;
  counterpartyName?: string | null;
  postedAt?: string | null;
  matchedEntityType?: string | null;
  matchedEntityId?: string | null;
  reconciliationStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type MercuryAccount = {
  id: string;
  name: string;
  type: string;
  status: string;
  currentBalance?: number;
  availableBalance?: number;
  currencyCode?: string;
  routingNumber?: string;
  accountNumber?: string;
};

export type MercuryTransactionsResponse = {
  transactions: MercuryTransaction[];
  total: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  configured?: boolean;
  environment?: string;
  fromCache?: boolean;
  warning?: string;
  message?: string;
};

export type MercuryAccountsResponse = {
  accounts: MercuryAccount[];
  configured?: boolean;
  environment?: string;
  message?: string;
};

export async function getMercuryAccounts(): Promise<MercuryAccountsResponse> {
  const response = await apiConnector({ method: "GET", url: mercuryEndpoints.GET_ACCOUNTS, credentials: true });
  return response.data;
}

export async function getMercuryTransactions(params?: {
  page?: number;
  limit?: number;
  accountId?: string;
  reconciliationStatus?: string;
  direction?: string;
}): Promise<MercuryTransactionsResponse> {
  const query: Record<string, string> = {};
  if (params?.page) query.page = String(params.page);
  if (params?.limit) query.limit = String(params.limit);
  if (params?.accountId) query.accountId = params.accountId;
  if (params?.reconciliationStatus) query.reconciliationStatus = params.reconciliationStatus;
  if (params?.direction) query.direction = params.direction;

  const url = mercuryEndpoints.LIST_TRANSACTIONS + (Object.keys(query).length ? `?${new URLSearchParams(query)}` : "");
  const response = await apiConnector({ method: "GET", url, credentials: true });
  return response.data;
}

export async function reconcileMercuryTransaction(
  id: string,
  payload: {
    reconciliationStatus: string;
    matchedEntityType?: string;
    matchedEntityId?: string;
  }
): Promise<{ transaction: MercuryTransaction }> {
  const response = await apiConnector({ method: "PATCH", url: mercuryEndpoints.RECONCILE(id), body: payload, credentials: true });
  return response.data;
}

export async function syncMercuryTransactions(accountId?: string): Promise<{
  synced: number;
  accounts: number;
  message: string;
}> {
  const response = await apiConnector({ method: "POST", url: mercuryEndpoints.SYNC, body: accountId ? { accountId } : {}, credentials: true });
  return response.data;
}
