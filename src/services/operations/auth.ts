import axios from "axios";
import { apiConnector } from "../apiConnector";
import { authEnpoints } from "../apis";
import type { LoginPayload, SignupPayload } from "../types";

const { LOGIN, SIGNUP } = authEnpoints;

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

export async function login({ userName, password }: LoginPayload) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: LOGIN,
      body: {
        userName,
        password,
      },
      credentials: true,
    });

    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to sign you in."));
  }
}
