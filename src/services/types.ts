export interface LoginPayload {
  userName: string;
  password: string;
}

export interface SignupPayload {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export interface AuthSuccessResponse {
  message?: string;
  [key: string]: unknown;
}
