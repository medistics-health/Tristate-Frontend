const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";

export const authEnpoints = {
  LOGIN: BACKEND_URL + "/api/v1/auth/login",
  SIGNUP: BACKEND_URL + "/api/v1/auth/signup",
  AUTHME: BACKEND_URL + "/api/v1/auth/me",
  LOGOUT: BACKEND_URL + "/api/v1/auth/logout",
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

export const auditEndpoints = {
  BASE: BACKEND_URL + "/api/v1/audits",
  LIST: BACKEND_URL + "/api/v1/audits",
  CREATE: BACKEND_URL + "/api/v1/audits",
  GET: (id: string) => BACKEND_URL + `/api/v1/audits/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/audits/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/audits/${id}`,
};

export const serviceEndpoints = {
  BASE: BACKEND_URL + "/api/v1/services",
  LIST: BACKEND_URL + "/api/v1/services",
  CREATE: BACKEND_URL + "/api/v1/services",
  GET: (id: string) => BACKEND_URL + `/api/v1/services/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/services/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/services/${id}`,
};

export const purchaseOrderEndpoints = {
  BASE: BACKEND_URL + "/api/v1/purchase-orders",
  LIST: BACKEND_URL + "/api/v1/purchase-orders",
  CREATE: BACKEND_URL + "/api/v1/purchase-orders",
  GET: (id: string) => BACKEND_URL + `/api/v1/purchase-orders/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/purchase-orders/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/purchase-orders/${id}`,
};

export const vendorEndpoints = {
  BASE: BACKEND_URL + "/api/v1/vendors",
  LIST: BACKEND_URL + "/api/v1/vendors",
  CREATE: BACKEND_URL + "/api/v1/vendors",
  GET: (id: string) => BACKEND_URL + `/api/v1/vendors/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/vendors/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/vendors/${id}`,
};

export const invoiceEndpoints = {
  BASE: BACKEND_URL + "/api/v1/invoices",
  LIST: BACKEND_URL + "/api/v1/invoices",
  CREATE: BACKEND_URL + "/api/v1/invoices",
  GET: (id: string) => BACKEND_URL + `/api/v1/invoices/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/invoices/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/invoices/${id}`,
};

export const agreementEndpoints = {
  BASE: BACKEND_URL + "/api/v1/agreements",
  LIST: BACKEND_URL + "/api/v1/agreements",
  CREATE: BACKEND_URL + "/api/v1/agreements",
  GET: (id: string) => BACKEND_URL + `/api/v1/agreements/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/agreements/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/agreements/${id}`,
  GET_DOCUSEAL_TEMPLATES: BACKEND_URL + "/api/v1/agreements/docuseal/templates",
  GET_DOCUSEAL_FORM: (slug: string) =>
    BACKEND_URL + `/api/v1/agreements/docuseal/forms/${slug}`,
  SEND_AGREEMENT_EMAIL: BACKEND_URL + "/api/v1/agreements/send-email",
  CREATE_DOCUSEAL_SUBMISSION:
    BACKEND_URL + "/api/v1/agreements/docuseal/submission",
};

export const assessmentEndpoints = {
  BASE: BACKEND_URL + "/api/v1/assessments",
  LIST: BACKEND_URL + "/api/v1/assessments",
  CREATE: BACKEND_URL + "/api/v1/assessments",
  GET: (id: string) => BACKEND_URL + `/api/v1/assessments/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/assessments/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/assessments/${id}`,
};

export const practiceGroupEndpoints = {
  LIST: BACKEND_URL + "/api/v1/practice-groups",
  GET: (id: string) => BACKEND_URL + `/api/v1/practice-groups/${id}`,
};

export const groupNpiEndpoints = {
  LIST: BACKEND_URL + "/api/v1/group-npis",
  GET: (id: string) => BACKEND_URL + `/api/v1/group-npis/${id}`,
};

export const onboardingEndpoints = {
  BASE: BACKEND_URL + "/api/v1/onboarding",
  LIST: BACKEND_URL + "/api/v1/onboarding",
  CREATE: BACKEND_URL + "/api/v1/onboardings",
  GET: (id: string) => BACKEND_URL + `/api/v1/onboarding/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/onboarding/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/onboarding/${id}`,
  EXTERNAL: BACKEND_URL + "/api/v1/onboarding/external",
};
