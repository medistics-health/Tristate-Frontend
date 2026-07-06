import axios from "axios";
import { apiConnector } from "../apiConnector";
import { stripeEndpoints } from "../apis";

export type StripeConnectedAccount = {
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
};

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

export async function getStripeConnectedAccounts(): Promise<StripeConnectedAccount[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: stripeEndpoints.ACCOUNTS,
      credentials: true,
    });
    return (response.data as { accounts: StripeConnectedAccount[] }).accounts;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch Stripe accounts."));
  }
}

export async function getStripeConnectedAccount(accountId: string): Promise<StripeConnectedAccount> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: stripeEndpoints.ACCOUNT(accountId),
      credentials: true,
    });
    return (response.data as { account: StripeConnectedAccount }).account;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch Stripe account."));
  }
}
