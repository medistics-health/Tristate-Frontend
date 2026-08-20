import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import AppLayout from "../layout/AppLayout";
import {
  submitMonthlyReport,
  updateMonthlyReport,
  getMonthlyReport,
} from "../../services/operations/monthlyReports";
import { getAllPractices } from "../../services/operations/practices";
import { getAllServices } from "../../services/operations/services";
import type { Practice } from "../practices/types";
import type { Service } from "../services/types";
import toast from "react-hot-toast";

const monthOptions = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

interface MarketingFormData {
  websiteVisits: string;
  leadsGenerated: string;
  reviewsGenerated: string;
  socialPostsPublished: string;
  seoKeywordImprovements: string;
}

function SubmitMonthlyReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [practices, setPractices] = useState<Practice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(!!reportId);
  const [practice, setPractice] = useState(searchParams.get("practiceId") ?? "");
  const [service, setService] = useState(searchParams.get("serviceId") ?? "");
  const [month, setMonth] = useState(searchParams.get("month") ?? monthOptions[new Date().getMonth()]);
  const [year, setYear] = useState(Number(searchParams.get("year")) || currentYear);
  const [dueDate, setDueDate] = useState(searchParams.get("dueDate") ?? "");
  const [metrics, setMetrics] = useState<MarketingFormData>({
    websiteVisits: "",
    leadsGenerated: "",
    reviewsGenerated: "",
    socialPostsPublished: "",
    seoKeywordImprovements: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!reportId;

  useEffect(() => {
    async function loadOptions() {
      try {
        setIsLoadingOptions(true);
        const [practicesData, servicesData] = await Promise.all([
          getAllPractices(),
          getAllServices(),
        ]);
        setPractices(practicesData);
        setServices(servicesData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load options";
        toast.error(message);
      } finally {
        setIsLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (!reportId) return;
    async function loadReport() {
      try {
        setIsLoadingReport(true);
        const report = await getMonthlyReport(reportId);
        setPractice(report.practiceId);
        setService(report.serviceId);
        setMonth(report.month);
        setYear(report.year);
        setDueDate(report.dueDate ?? "");
        if (report.metrics) {
          setMetrics({
            websiteVisits: String(report.metrics.websiteVisits ?? ""),
            leadsGenerated: String(report.metrics.leadsGenerated ?? ""),
            reviewsGenerated: String(report.metrics.reviewsGenerated ?? ""),
            socialPostsPublished: String(report.metrics.socialPostsPublished ?? ""),
            seoKeywordImprovements: String(report.metrics.seoKeywordImprovements ?? ""),
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load report";
        toast.error(message);
        navigate("/monthly-reporting/dashboard");
      } finally {
        setIsLoadingReport(false);
      }
    }
    loadReport();
  }, [reportId, navigate]);

  function handleMetricChange(field: keyof MarketingFormData, value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setMetrics((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!practice) {
      toast.error("Please select a practice");
      return;
    }
    if (!service) {
      toast.error("Please select a service");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date");
      return;
    }

    const numericMetrics = {
      websiteVisits: Number(metrics.websiteVisits) || 0,
      leadsGenerated: Number(metrics.leadsGenerated) || 0,
      reviewsGenerated: Number(metrics.reviewsGenerated) || 0,
      socialPostsPublished: Number(metrics.socialPostsPublished) || 0,
      seoKeywordImprovements: Number(metrics.seoKeywordImprovements) || 0,
    };

    setIsSubmitting(true);
    try {
      const practiceName =
        practices.find((p) => p.id === practice)?.name ?? practice;
      const serviceName =
        services.find((s) => s.id === service)?.name ?? service;

      const payload = {
        practiceId: practice,
        practiceName,
        serviceName,
        serviceId: service,
        month,
        year,
        dueDate,
        metrics: numericMetrics,
      };

      if (isEditMode && reportId) {
        await updateMonthlyReport(reportId, payload);
        toast.success(`${serviceName} report for ${practiceName} updated successfully!`);
      } else {
        await submitMonthlyReport(payload);
        toast.success(`${serviceName} report for ${practiceName} submitted successfully!`);
      }
      navigate("/monthly-reporting/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit report";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const metricFields: {
    key: keyof MarketingFormData;
    label: string;
  }[] = [
    { key: "websiteVisits", label: "Website Visits" },
    { key: "leadsGenerated", label: "Leads Generated" },
    { key: "reviewsGenerated", label: "Reviews Generated" },
    { key: "socialPostsPublished", label: "Social Posts Published" },
    { key: "seoKeywordImprovements", label: "SEO Keyword Improvements" },
  ];

  const isLoading = isLoadingOptions || isLoadingReport;

  return (
    <AppLayout
      title="Monthly Reports"
      activeModule="Monthly Reports"
      activeSubItem={isEditMode ? "Edit Report" : "Submit Report"}
    >
      <div className="h-full min-h-0 overflow-hidden">
        <div className="custom-scrollbar h-full overflow-y-auto [direction:rtl]">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 [direction:ltr]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/monthly-reporting/dashboard")}
            className="rounded-md border border-[#e4e0d8] bg-white p-2 text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[18px] font-semibold text-slate-800">
            {isEditMode ? "Edit Monthly Report" : "Submit Monthly Report"}
          </h1>
        </div>

        {isLoading ? (
          <div className="app-panel flex items-center justify-center gap-2 rounded-2xl bg-white p-12 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-[14px]">Loading...</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="app-panel flex flex-col gap-6 rounded-2xl bg-white p-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Practice <span className="text-red-500">*</span>
                </label>
                <select
                  value={practice}
                  onChange={(e) => setPractice(e.target.value)}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  disabled={isEditMode}
                >
                  <option value="">Select practice</option>
                  {practices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Service <span className="text-red-500">*</span>
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  disabled={isEditMode}
                >
                  <option value="">Select service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  disabled={isEditMode}
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  disabled={isEditMode}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                />
              </div>
            </div>

            <div className="border-t border-[#f0ece6] pt-4">
              <h2 className="mb-4 text-[15px] font-semibold text-slate-700">
                {service
                  ? `${services.find((s) => s.id === service)?.name ?? "Service"} Monthly Metrics`
                  : "Service Metrics"}
              </h2>

              <div className="space-y-4">
                {metricFields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between rounded-lg border border-[#f0ece6] bg-[#faf9f7] px-4 py-3"
                  >
                    <label className="text-[14px] font-medium text-slate-700">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metrics[field.key]}
                      onChange={(e) =>
                        handleMetricChange(field.key, e.target.value)
                      }
                      placeholder="0"
                      className="app-control w-32 rounded-md px-3 py-1.5 text-right text-[14px]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
              <button
                type="button"
                onClick={() => navigate("/monthly-reporting/dashboard")}
                className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="app-control inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Update Report"
                    : "Submit Report"}
              </button>
            </div>
          </form>
        )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default SubmitMonthlyReport;
