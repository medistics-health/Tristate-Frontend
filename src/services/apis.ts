const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";

export const authEnpoints = {
  LOGIN: BACKEND_URL + "/api/v1/login",
  SIGNUP: BACKEND_URL + "/api/v1/signup",
};

console.log(authEnpoints);
