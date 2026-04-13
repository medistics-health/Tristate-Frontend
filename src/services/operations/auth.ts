import axios from "axios";
import { apiConnector } from "../apiConnector";
import { authEnpoints } from "../apis";
import type { LoginPayload, SignupPayload } from "../types";

const { LOGIN, SIGNUP, AUTHME, LOGOUT } = authEnpoints;

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

export async function authMe() {
  try {
    const response = await apiConnector({
      method: "GET",
      url: AUTHME,
      credentials: true,
    });
    return response.status;
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

    return response.status;
  } catch (Err) {
    return Err;
  }
}
