const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";

export const authEnpoints = {
  LOGIN: BACKEND_URL + "/api/v1/auth/login",
  SIGNUP: BACKEND_URL + "/api/v1/auth/signup",
  AUTHME: BACKEND_URL + "/api/v1/auth/me",
  LOGOUT: BACKEND_URL + "/api/v1/auth/logout",
  SETUP_2FA: BACKEND_URL + "/api/v1/auth/2fa/setup",
  VERIFY_2FA_SETUP: BACKEND_URL + "/api/v1/auth/2fa/verify-setup",
  VERIFY_2FA_LOGIN: BACKEND_URL + "/api/v1/auth/2fa/verify-login",
  TOGGLE_2FA: BACKEND_URL + "/api/v1/auth/2fa/toggle",
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

export const credentialingEndpoints = {
  BASE: BACKEND_URL + "/api/v1/credentialing",
  DASHBOARD: BACKEND_URL + "/api/v1/credentialing/dashboard",
  LIST: BACKEND_URL + "/api/v1/credentialing",
  CREATE: BACKEND_URL + "/api/v1/credentialing",
  GET: (id: string) => BACKEND_URL + `/api/v1/credentialing/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/credentialing/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/credentialing/${id}`,
};

export const onboardingProjectsEndpoints = {
  PROJECTS: BACKEND_URL + "/api/v1/onboarding-projects/projects",
  PROJECT_UPDATE: (id: string) => BACKEND_URL + `/api/v1/onboarding-projects/projects/${id}`,
  TASKS: BACKEND_URL + "/api/v1/onboarding-projects/tasks",
  TASK_CREATE: BACKEND_URL + "/api/v1/onboarding-projects/tasks",
  TASK_UPDATE: (id: string) => BACKEND_URL + `/api/v1/onboarding-projects/tasks/${id}`,
  TASK_DELETE: (id: string) => BACKEND_URL + `/api/v1/onboarding-projects/tasks/${id}`,
  TEMPLATES: BACKEND_URL + "/api/v1/onboarding-projects/templates",
  TEMPLATE_CREATE: BACKEND_URL + "/api/v1/onboarding-projects/templates",
  TEMPLATE_UPDATE: (id: string) => BACKEND_URL + `/api/v1/onboarding-projects/templates/${id}`,
  TEMPLATE_DELETE: (id: string) => BACKEND_URL + `/api/v1/onboarding-projects/templates/${id}`,
  MILESTONES: BACKEND_URL + "/api/v1/onboarding-projects/milestones",
  MILESTONE_CREATE: BACKEND_URL + "/api/v1/onboarding-projects/milestones",
  MILESTONE_UPDATE: (id: string) => BACKEND_URL + `/api/v1/onboarding-projects/milestones/${id}`,
  MILESTONE_DELETE: (id: string) => BACKEND_URL + `/api/v1/onboarding-projects/milestones/${id}`,
};

export const insuranceEndpoints = {
  BASE: BACKEND_URL + "/api/v1/insurance",
  CARRIERS: BACKEND_URL + "/api/v1/insurance/carriers",
  CARRIER_OPTIONS: BACKEND_URL + "/api/v1/insurance/carriers/options",
  PLAN_OPTIONS: BACKEND_URL + "/api/v1/insurance/plans/options",
  PAYERS_LIST: BACKEND_URL + "/api/v1/insurance/payers/list",
  CREATE_CARRIER: BACKEND_URL + "/api/v1/insurance/carriers",
  UPDATE_CARRIER: (id: string) => BACKEND_URL + `/api/v1/insurance/carriers/${id}`,
  DELETE_CARRIER: (id: string) => BACKEND_URL + `/api/v1/insurance/carriers/${id}`,
  CREATE_PLANS: BACKEND_URL + "/api/v1/insurance/plans",
  UPDATE_PLAN: (id: string) => BACKEND_URL + `/api/v1/insurance/plans/${id}`,
  DELETE_PLAN: (id: string) => BACKEND_URL + `/api/v1/insurance/plans/${id}`,
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

export const stripeEndpoints = {
  ACCOUNTS: BACKEND_URL + "/api/v1/stripe/accounts",
  ACCOUNT: (accountId: string) => BACKEND_URL + `/api/v1/stripe/accounts/${accountId}`,
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
  PDF: (id: string) => BACKEND_URL + `/api/v1/invoices/${id}/pdf`,
  RECEIPT_PDF: (id: string) => BACKEND_URL + `/api/v1/invoices/${id}/receipt-pdf`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/invoices/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/invoices/${id}`,
};

export const billingEndpoints = {
  BASE: BACKEND_URL + "/api/v1/billing",
  READINESS: (practiceId: string) =>
    BACKEND_URL + `/api/v1/billing/practices/${practiceId}/readiness`,
  LIST_RUNS: BACKEND_URL + "/api/v1/billing/runs",
  CREATE_RUN: BACKEND_URL + "/api/v1/billing/runs",
  GET_RUN: (id: string) => BACKEND_URL + `/api/v1/billing/runs/${id}`,
  INVOICE_PREVIEW: (id: string) =>
    BACKEND_URL + `/api/v1/billing/runs/${id}/invoice-preview`,
  SAVE_SNAPSHOTS: (id: string) =>
    BACKEND_URL + `/api/v1/billing/runs/${id}/snapshots`,
  CALCULATE_RUN: (id: string) =>
    BACKEND_URL + `/api/v1/billing/runs/${id}/calculate`,
  APPROVE_RUN: (id: string) =>
    BACKEND_URL + `/api/v1/billing/runs/${id}/approve`,
  POST_RUN: (id: string) => BACKEND_URL + `/api/v1/billing/runs/${id}/post`,
  RECORD_PAYMENT: BACKEND_URL + "/api/v1/billing/payments/record",
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
  SEND_ONBOARDING_FORM:
    BACKEND_URL + "/api/v1/agreements/send-onboarding-form",
  CREATE_DOCUSEAL_SUBMISSION:
    BACKEND_URL + "/api/v1/agreements/docuseal/submission",
  RESUBMIT_DOCUSEAL_SUBMISSION:
    BACKEND_URL + "/api/v1/agreements/docuseal/submission/resubmit",
};

export const agreementVersionEndpoints = {
  BASE: BACKEND_URL + "/api/v1/agreements/versions",
  LIST: BACKEND_URL + "/api/v1/agreements/versions",
  CREATE: BACKEND_URL + "/api/v1/agreements/versions",
  GET: (id: string) => BACKEND_URL + `/api/v1/agreements/versions/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/agreements/versions/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/agreements/versions/${id}`,
};

export const agreementServiceTermEndpoints = {
  BASE: BACKEND_URL + "/api/v1/agreements/service-terms",
  LIST: BACKEND_URL + "/api/v1/agreements/service-terms",
  CREATE: BACKEND_URL + "/api/v1/agreements/service-terms",
  GET: (id: string) => BACKEND_URL + `/api/v1/agreements/service-terms/${id}`,
  UPDATE: (id: string) =>
    BACKEND_URL + `/api/v1/agreements/service-terms/${id}`,
  DELETE: (id: string) =>
    BACKEND_URL + `/api/v1/agreements/service-terms/${id}`,
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
  EXTERNAL_GET: (practiceId: string) =>
    BACKEND_URL + `/api/v1/onboarding/external/${practiceId}`,
  UPLOAD_EXTERNAL_DOCUMENT:
    BACKEND_URL + "/api/v1/onboarding/external/upload-document",
  DELETE_EXTERNAL_DOCUMENT:
    BACKEND_URL + "/api/v1/onboarding/external/delete-document",
};

export const dealEndpoints = {
  BASE: BACKEND_URL + "/api/v1/deals",
  LIST: BACKEND_URL + "/api/v1/deals",
  CREATE: BACKEND_URL + "/api/v1/deals",
  GET: (id: string) => BACKEND_URL + `/api/v1/deals/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/deals/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/deals/${id}`,
};

export const monthlyReportEndpoints = {
  BASE: BACKEND_URL + "/api/v1/monthly-reports",
  LIST: BACKEND_URL + "/api/v1/monthly-reports",
  CREATE: BACKEND_URL + "/api/v1/monthly-reports",
  GET: (id: string) => BACKEND_URL + `/api/v1/monthly-reports/${id}`,
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/monthly-reports/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/monthly-reports/${id}`,
};
export const quickbooksEndpoints = {
  GET_LOGS: BACKEND_URL + "/api/v1/quickbooks/sync-logs",
  RETRY_JOB: (jobId: string) =>
    BACKEND_URL + "/api/v1/quickbooks/sync-logs/" + jobId + "/retry",
  CONNECT: BACKEND_URL + "/api/v1/quickbooks/connect",
  STATUS: (companyId: string) =>
    BACKEND_URL + `/api/v1/quickbooks/connections/${companyId}`,
  DISCONNECT: (companyId: string) =>
    BACKEND_URL + `/api/v1/quickbooks/connections/${companyId}`,
};

export const portalEndpoints = {
  GET_SNAPSHOT: BACKEND_URL + "/api/v1/portal/snapshot",
};

export const mercuryEndpoints = {
  BASE: BACKEND_URL + "/api/v1/mercury",
  GET_ACCOUNTS: BACKEND_URL + "/api/v1/mercury/accounts",
  GET_ACCOUNT_TRANSACTIONS: (accountId: string) =>
    BACKEND_URL + `/api/v1/mercury/accounts/${accountId}/transactions`,
  LIST_TRANSACTIONS: BACKEND_URL + "/api/v1/mercury/transactions",
  RECONCILE: (id: string) => BACKEND_URL + `/api/v1/mercury/transactions/${id}/reconcile`,
  SYNC: BACKEND_URL + "/api/v1/mercury/sync",
};

export const communicationEndpoints = {
  SENT_EMAILS: BACKEND_URL + "/api/v1/emails/sent",
  HISTORY_BY_PERSON: (personId: string) =>
    BACKEND_URL + `/api/v1/emails/history/${personId}`,
};

