import axios from "axios";
import { apiConnector } from "../apiConnector";
import { monthlyReportEndpoints } from "../apis";
import type {
  MonthlyReport,
  MonthlyReportRow,
  MonthlyReportViewData,
  SubmitReportPayload,
  MonthlyReportQueryParams,
} from "../../components/monthly-reporting/types";

const { LIST, CREATE, GET, UPDATE, DELETE } = monthlyReportEndpoints;

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

function reportToRow(report: MonthlyReport): MonthlyReportRow {
  return {
    id: report.id,
    values: {
      practiceName: report.practiceName,
      serviceName: report.serviceName,
      status: report.status,
      submittedBy: report.submittedBy ?? "-",
      dueDate: report.dueDate ?? "-",
    },
  };
}

const fields = [
  { id: "practiceName", label: "Practice", type: "text" as const, visible: true },
  { id: "serviceName", label: "Service", type: "text" as const, visible: true },
  { id: "status", label: "Status", type: "text" as const, visible: true },
  { id: "submittedBy", label: "Submitted By", type: "text" as const, visible: true },
  { id: "dueDate", label: "Due Date", type: "text" as const, visible: true },
];

export async function getMonthlyReportsView(
  params?: MonthlyReportQueryParams,
): Promise<MonthlyReportViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);
    if (params?.status) queryString.set("status", params.status);
    if (params?.practiceName) queryString.set("practiceName", params.practiceName);
    if (params?.serviceName) queryString.set("serviceName", params.serviceName);

    const url = queryString.toString()
      ? `${LIST}?${queryString.toString()}`
      : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { reports, pagination } = response.data as {
      reports: MonthlyReport[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
    return {
      viewId: "monthly-report-view-001",
      title: "Monthly Reports",
      totalCount: pagination.total,
      fields,
      rows: reports.map(reportToRow),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch monthly reports."));
  }
}

export async function getMonthlyReport(id: string): Promise<MonthlyReport> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { report: MonthlyReport }).report;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch report."));
  }
}

export async function submitMonthlyReport(
  data: SubmitReportPayload,
): Promise<MonthlyReportRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const report = (response.data as { report: MonthlyReport }).report;
    return reportToRow(report);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to submit report."));
  }
}

export async function updateMonthlyReport(
  id: string,
  data: Partial<SubmitReportPayload>,
): Promise<MonthlyReportRow> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const report = (response.data as { report: MonthlyReport }).report;
    return reportToRow(report);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update report."));
  }
}

export async function deleteMonthlyReport(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete report."));
  }
}
