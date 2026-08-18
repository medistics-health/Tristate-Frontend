import axios from "axios";
import { apiConnector } from "../apiConnector";
import { authEnpoints } from "../apis";
import type { LoginPayload, SignupPayload } from "../types";

const {
  LOGIN,
  SIGNUP,
  AUTHME,
  LOGOUT,
  SETUP_2FA,
  VERIFY_2FA_SETUP,
  VERIFY_2FA_LOGIN,
  TOGGLE_2FA,
} = authEnpoints;

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

export async function signUp({
  userName,
  firstName,
  lastName,
  email,
  password,
  role,
}: SignupPayload) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: SIGNUP,
      body: {
        userName,
        firstName,
        lastName,
        email,
        password,
        role,
      },
      credentials: true,
    });

    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create your account."));
  }
}

export async function login({ identifier, password }: LoginPayload) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: LOGIN,
      body: {
        identifier,
        password,
      },
      credentials: true,
    });

    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to sign you in."));
  }
}

export async function setup2FA(userId?: string) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: SETUP_2FA,
      body: userId ? { userId } : {},
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to initialize 2FA setup."));
  }
}

export async function verify2FASetup(code: string, userId?: string) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: VERIFY_2FA_SETUP,
      body: { code, ...(userId ? { userId } : {}) },
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to verify 2FA setup."));
  }
}

export async function verify2FALogin(userId: string, code: string) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: VERIFY_2FA_LOGIN,
      body: { userId, code },
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to verify 2FA code."));
  }
}

export async function toggle2FA(enabled: boolean) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: TOGGLE_2FA,
      body: { enabled },
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update 2FA setting."));
  }
}

export async function authMe() {
  try {
    const response = await apiConnector({
      method: "GET",
      url: AUTHME,
      credentials: true,
    });
    return response.data;
  } catch (Err) {
    return Err;
  }
}

export async function logout() {
  try {
    const response = await apiConnector({
      method: "POST",
      url: LOGOUT,
      credentials: true,
    });

    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }

    return response.status;
  } catch (Err) {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
    return Err;
  }
}
