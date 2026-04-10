const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";

export const authEnpoints = {
  LOGIN: BACKEND_URL + "/api/v1/login",
  SIGNUP: BACKEND_URL + "/api/v1/signup",
  AUTHME: BACKEND_URL + "/api/v1/auth/me",
  LOGOUT: BACKEND_URL + "/api/v1/logout",
};

export const companyEndpoints = {
  BASE: BACKEND_URL + "/api/v1/companies",
  LIST: BACKEND_URL + "/api/v1/companies",
  CREATE: BACKEND_URL + "/api/v1/companies",
  GET: (id: string) => BACKEND_URL + `/api/v1/companies/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/companies/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/companies/${id}`,
};

export const practiceEndpoints = {
  BASE: BACKEND_URL + "/api/v1/practices",
  LIST: BACKEND_URL + "/api/v1/practices",
  CREATE: BACKEND_URL + "/api/v1/practices",
  GET: (id: string) => BACKEND_URL + `/api/v1/practices/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/practices/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/practices/${id}`,
};

export const personEndpoints = {
  BASE: BACKEND_URL + "/api/v1/persons",
  LIST: BACKEND_URL + "/api/v1/persons",
  CREATE: BACKEND_URL + "/api/v1/persons",
  GET: (id: string) => BACKEND_URL + `/api/v1/persons/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/persons/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/persons/${id}`,
};
