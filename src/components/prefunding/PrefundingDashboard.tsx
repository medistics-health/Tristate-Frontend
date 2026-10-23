import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import { getStandardNavbarActions } from "../shared/PageComponents";
import Select from "../shared/Select";
import DatePicker from "../shared/DatePicker";
import {
  TrendingUp,
  Building2,
  CalendarDays,
  FileText,
  Clock,
  CheckCircle,
  UploadCloud,
  DollarSign,
  AlertCircle,
  FileSignature,
  Layers,
  ArrowRight,
  RefreshCw,
  Eye,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getPrefundingDashboard,
  openPrefundingInvoicePdf,
} from "../../services/operations/prefundingInvoices";

interface DashboardData {
  summary: {
    totalPractices: number;
    upcomingCyclesCount: number;
    totalCalculations: number;
    ratesCount: number;
    totalPrefundingAmount: number;
    upcomingDueAmount: number;
    statusCounts: {
      draft: number;
      pendingApproval: number;
      approved: number;
      posted: number;
      paid: number;
      overdue: number;
      cancelled: number;
    };
    statusAmounts: {
      draft: number;
      pendingApproval: number;
      approved: number;
      posted: number;
      paid: number;
      overdue: number;
    };
    stripeTransfers: Array<{
      status: string;
      count: number;
      totalAmount: number;
    }>;
  };
  upcomingCycles: Array<{
    label: string;
    startDate: string;
    endDate: string;
    practiceId: string;
    practiceName: string;
    cycleType: string;
    daysUntilStart: number;
  }>;
  reminders: Array<{
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    practiceId: string;
    practiceName: string;
    type: "reminder_due" | "overdue" | "cycle_starting";
    title: string;
    message: string;
    dueDate: string;
    cycle: string;
    amount: number;
    daysRemaining: number;
    severity: "info" | "warning" | "urgent";
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    practiceId: string;
    practiceName: string;
    cycle: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    status: string;
    paymentMethod?: string | null;
    stripeInvoiceId?: string | null;
    stripeHostedInvoiceUrl?: string | null;
    invoicePdfBlobUrl?: string | null;
    receiptPdfBlobUrl?: string | null;
    createdAt: string;
    createdByName?: string | null;
    lineItemsCount: number;
  }>;
  availablePractices: Array<{
    id: string;
    name: string;
    cycle?: string | null;
  }>;
  availableCycles: string[];
}

function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function PrefundingDashboard() {
  const navigate = useNavigate();

  // Filters State
  const [filterPractice, setFilterPractice] = useState<string>("all");
  const [filterCycle, setFilterCycle] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboard = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await getPrefundingDashboard({
        practiceId: filterPractice !== "all" ? filterPractice : undefined,
        cycle: filterCycle !== "all" ? filterCycle : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      });

      if (res) {
        setData(res);
      }
    } catch (err: any) {
      console.error("Failed to load prefunding dashboard data:", err);
      toast.error(err?.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [filterPractice, filterCycle, filterStatus, filterDateFrom, filterDateTo]);

  const handleResetFilters = () => {
    setFilterPractice("all");
    setFilterCycle("all");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasActiveFilters =
    filterPractice !== "all" ||
    filterCycle !== "all" ||
    filterStatus !== "all" ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

  // Prepare select options
  const practiceOptions = useMemo(() => {
    const list = [{ label: "All Practices", value: "all" }];
    if (data?.availablePractices) {
      data.availablePractices.forEach((p) => {
        list.push({ label: p.name, value: p.id });
      });
    }
    return list;
  }, [data?.availablePractices]);

  const cycleOptions = useMemo(() => {
    const list = [{ label: "All Cycles", value: "all" }];
    if (data?.availableCycles) {
      data.availableCycles.forEach((c) => {
        list.push({ label: c, value: c });
      });
    }
    return list;
  }, [data?.availableCycles]);

  const statusOptions = [
    { label: "All Statuses", value: "all" },
    { label: "Draft", value: "Draft" },
    { label: "Pending Approval", value: "Pending Approval" },
    { label: "Approved", value: "Approved" },
    { label: "Posted", value: "Posted" },
    { label: "Paid", value: "Paid" },
    { label: "Overdue", value: "Overdue" },
  ];

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
        </span>
      );
    }
    if (s === "posted" || s === "sent") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">
          <UploadCloud className="w-3 h-3 text-cyan-600" /> Posted
        </span>
      );
    }
    if (s === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <CheckCircle className="w-3 h-3 text-blue-600" /> Approved
        </span>
      );
    }
    if (s === "pending approval" || s === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
        </span>
      );
    }
    if (s === "overdue") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" /> Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <FileText className="w-3 h-3 text-slate-500" /> {status || "Draft"}
      </span>
    );
  };

  const navbarActions = getStandardNavbarActions(() => fetchDashboard(true));

  return (
    <AppLayout
      title="Prefunding Dashboard"
      activeModule="Prefunding"
      navbarActions={navbarActions}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-y-auto rounded-2xl bg-[#faf9f7] shadow-xs p-6">
          {/* Header & Quick Action Buttons */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                  Prefunding Dashboard
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2a6365]/10 text-[#2a6365] border border-[#2a6365]/20">
                  Live Operations
                </span>
              </div>
              <p className="text-[13px] text-slate-500 mt-1">
                Real-time visibility into practices, upcoming cycles, calculations, invoices, and reminders.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchDashboard(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-[#ece8e1] rounded-lg shadow-2xs hover:bg-[#faf9f7] transition"
                title="Refresh real data"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#2a6365]" : "text-slate-500"}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => navigate("/prefunding/calculate")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2a6365] rounded-lg shadow-sm hover:bg-[#204e50] transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                New Calculation
              </button>

              <button
                type="button"
                onClick={() => navigate("/prefunding/invoices")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-[#ece8e1] rounded-lg shadow-2xs hover:bg-[#faf9f7] transition"
              >
                <FileSignature className="w-3.5 h-3.5 text-slate-500" />
                Invoices
              </button>

              <button
                type="button"
                onClick={() => navigate("/prefunding/rates")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-[#ece8e1] rounded-lg shadow-2xs hover:bg-[#faf9f7] transition"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Rate Templates
              </button>
            </div>
          </div>

          {/* Filter Bar (Practice, Cycle, Status, Date) */}
          <div className="bg-white rounded-xl border border-[#ece8e1] p-4 mb-6 shadow-2xs">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Practice
                </label>
                <Select
                  value={filterPractice}
                  onChange={setFilterPractice}
                  options={practiceOptions}
                  className="w-full text-xs"
                />
              </div>

              <div className="flex-1 min-w-[170px]">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Prefunding Cycle
                </label>
                <Select
                  value={filterCycle}
                  onChange={setFilterCycle}
                  options={cycleOptions}
                  className="w-full text-xs"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Invoice Status
                </label>
                <Select
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={statusOptions}
                  className="w-full text-xs"
                />
              </div>

              <div className="w-[145px]">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Date From
                </label>
                <DatePicker
                  value={filterDateFrom}
                  onChange={setFilterDateFrom}
                  placeholder="Start Date"
                  className="w-full text-xs"
                />
              </div>

              <div className="w-[145px]">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Date To
                </label>
                <DatePicker
                  value={filterDateTo}
                  onChange={setFilterDateTo}
                  placeholder="End Date"
                  className="w-full text-xs"
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition h-[36px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Primary Operations Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Practices */}
            <div className="bg-white rounded-xl border border-[#ece8e1] p-4 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-slate-500">
                    Prefunding-enabled Practices
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    {data?.summary.totalPractices ?? 0}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configured for payroll prefunding
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Upcoming Cycles */}
            <div className="bg-white rounded-xl border border-[#ece8e1] p-4 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-slate-500">
                    Upcoming Cycles
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    {data?.summary.upcomingCyclesCount ?? 0}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Next cycle projections scheduled
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Total Prefunding Amount */}
            <div className="bg-white rounded-xl border border-[#ece8e1] p-4 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-slate-500">
                    Total Prefunding Amount
                  </p>
                  <h3 className="text-2xl font-bold text-emerald-700 mt-1">
                    {formatCurrency(data?.summary.totalPrefundingAmount)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Across {data?.summary.totalCalculations ?? 0} calculations
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Upcoming Due Amounts */}
            <div className="bg-white rounded-xl border border-[#ece8e1] p-4 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-slate-500">
                    Upcoming Due Amounts
                  </p>
                  <h3 className="text-2xl font-bold text-purple-700 mt-1">
                    {formatCurrency(data?.summary.upcomingDueAmount)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Awaiting payment settlement
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Pipeline & Status Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
            {/* Draft */}
            <div
              onClick={() => setFilterStatus("Draft")}
              className={`bg-white rounded-xl border p-3.5 cursor-pointer transition ${
                filterStatus === "Draft"
                  ? "border-[#2a6365] bg-slate-50/50 shadow-xs ring-1 ring-[#2a6365]"
                  : "border-[#ece8e1] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Draft Invoices
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 mt-2">
                {data?.summary.statusCounts.draft ?? 0}
              </h4>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                {formatCurrency(data?.summary.statusAmounts.draft)}
              </p>
            </div>

            {/* Pending Approval */}
            <div
              onClick={() => setFilterStatus("Pending Approval")}
              className={`bg-white rounded-xl border p-3.5 cursor-pointer transition ${
                filterStatus === "Pending Approval"
                  ? "border-amber-500 bg-amber-50/40 shadow-xs ring-1 ring-amber-500"
                  : "border-[#ece8e1] hover:border-amber-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  Pending Approval
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              </div>
              <h4 className="text-xl font-bold text-amber-800 mt-2">
                {data?.summary.statusCounts.pendingApproval ?? 0}
              </h4>
              <p className="text-xs font-semibold text-amber-700 mt-0.5">
                {formatCurrency(data?.summary.statusAmounts.pendingApproval)}
              </p>
            </div>

            {/* Approved */}
            <div
              onClick={() => setFilterStatus("Approved")}
              className={`bg-white rounded-xl border p-3.5 cursor-pointer transition ${
                filterStatus === "Approved"
                  ? "border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-500"
                  : "border-[#ece8e1] hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                  Approved
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <h4 className="text-xl font-bold text-blue-800 mt-2">
                {data?.summary.statusCounts.approved ?? 0}
              </h4>
              <p className="text-xs font-semibold text-blue-700 mt-0.5">
                {formatCurrency(data?.summary.statusAmounts.approved)}
              </p>
            </div>

            {/* Posted */}
            <div
              onClick={() => setFilterStatus("Posted")}
              className={`bg-white rounded-xl border p-3.5 cursor-pointer transition ${
                filterStatus === "Posted"
                  ? "border-cyan-500 bg-cyan-50/40 shadow-xs ring-1 ring-cyan-500"
                  : "border-[#ece8e1] hover:border-cyan-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700">
                  Posted Invoices
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              </div>
              <h4 className="text-xl font-bold text-cyan-800 mt-2">
                {data?.summary.statusCounts.posted ?? 0}
              </h4>
              <p className="text-xs font-semibold text-cyan-700 mt-0.5">
                {formatCurrency(data?.summary.statusAmounts.posted)}
              </p>
            </div>

            {/* Paid & Overdue / Rates */}
            <div
              onClick={() => setFilterStatus("Paid")}
              className={`bg-white rounded-xl border p-3.5 cursor-pointer transition ${
                filterStatus === "Paid"
                  ? "border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500"
                  : "border-[#ece8e1] hover:border-emerald-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                  Paid Invoices
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <h4 className="text-xl font-bold text-emerald-800 mt-2">
                {data?.summary.statusCounts.paid ?? 0}
              </h4>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                {formatCurrency(data?.summary.statusAmounts.paid)}
              </p>
            </div>
          </div>

          {/* Secondary Operational Metrics & Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-[#ece8e1] p-4 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-500">
                  Prefunding Rate Templates
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-bold text-slate-800">
                    {data?.summary.ratesCount ?? 0} Active Rates
                  </span>
                  <Link
                    to="/prefunding/rates"
                    className="text-[11px] font-semibold text-[#2a6365] hover:underline inline-flex items-center"
                  >
                    Manage &rarr;
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#ece8e1] p-4 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-500">
                  Overdue Invoices
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-bold text-rose-600">
                    {data?.summary.statusCounts.overdue ?? 0} (
                    {formatCurrency(data?.summary.statusAmounts.overdue)})
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#ece8e1] p-4 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-500">
                  Stripe Connected Transfers
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {data?.summary.stripeTransfers?.length
                      ? data.summary.stripeTransfers
                          .map((t) => `${t.status}: ${t.count}`)
                          .join(" | ")
                      : "No active transfers"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Layout: Reminders & Upcoming Cycles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Applicable Reminders Card */}
            <div className="bg-white rounded-xl border border-[#ece8e1] p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <h2 className="text-[14px] font-bold text-slate-800">
                    Applicable Reminders
                  </h2>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {data?.reminders?.length ?? 0} Notice(s)
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[340px] space-y-3 pr-1">
                {data?.reminders && data.reminders.length > 0 ? (
                  data.reminders.map((rem) => {
                    const isUrgent = rem.severity === "urgent";
                    const isWarning = rem.severity === "warning";
                    return (
                      <div
                        key={rem.id}
                        className={`p-3.5 rounded-xl border transition ${
                          isUrgent
                            ? "bg-rose-50/70 border-rose-200"
                            : isWarning
                            ? "bg-amber-50/70 border-amber-200"
                            : "bg-[#fdfaf5] border-[#f5ead6]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                isUrgent
                                  ? "bg-rose-100 text-rose-800"
                                  : isWarning
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200/80 text-slate-700"
                              }`}
                            >
                              {rem.title}
                            </span>
                            <span className="text-[13px] font-bold text-slate-800">
                              {rem.practiceName}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">
                            Due: {formatDate(rem.dueDate)}
                          </span>
                        </div>

                        <p className="text-[12px] text-slate-600 leading-relaxed mb-2">
                          {rem.message}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs">
                          <span className="font-semibold text-slate-700">
                            Cycle: <span className="font-normal text-slate-600">{rem.cycle}</span>
                          </span>
                          <span className="font-bold text-[#2a6365]">
                            {formatCurrency(rem.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-70" />
                    <p className="text-sm font-medium text-slate-600">
                      All caught up!
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No invoices currently require urgent payment reminders.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Prefunding Cycles Card */}
            <div className="bg-white rounded-xl border border-[#ece8e1] p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="text-[14px] font-bold text-slate-800">
                    Upcoming Prefunding Cycles
                  </h2>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {data?.upcomingCycles?.length ?? 0} Projected
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[340px] space-y-2.5 pr-1">
                {data?.upcomingCycles && data.upcomingCycles.length > 0 ? (
                  data.upcomingCycles.map((cycle, idx) => {
                    const startsSoon = cycle.daysUntilStart <= 5 && cycle.daysUntilStart >= 0;
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-[#ece8e1] rounded-xl flex items-center justify-between gap-3 hover:border-[#2a6365]/30 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {cycle.practiceName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {cycle.cycleType}
                            </span>
                          </div>
                          <p className="text-[12px] font-medium text-[#2a6365] mt-0.5">
                            {cycle.label}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              startsSoon
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : cycle.daysUntilStart < 0
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {cycle.daysUntilStart === 0
                              ? "Starts Today"
                              : cycle.daysUntilStart < 0
                              ? "Active Cycle"
                              : `In ${cycle.daysUntilStart} days`}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/prefunding/calculate?practiceId=${cycle.practiceId}&cycle=${encodeURIComponent(
                                  cycle.label
                                )}`
                              )
                            }
                            className="block text-[11px] font-semibold text-[#2a6365] hover:underline mt-1 text-right"
                          >
                            Calculate &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      No upcoming cycles scheduled
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Enable prefunding on practices to see upcoming cycles here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Prefunding Calculations / Invoices Table */}
          <div className="bg-white rounded-xl border border-[#ece8e1] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <FileSignature className="w-4 h-4 text-teal-700" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-slate-800">
                    Recent Prefunding Calculations & Invoices
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real invoice records and calculated totals from active prefunding cycles.
                  </p>
                </div>
              </div>

              <Link
                to="/prefunding/invoices"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2a6365] hover:underline"
              >
                View All Invoices <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#ece8e1] bg-[#faf9f7]">
                    <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Invoice #
                    </th>
                    <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Practice
                    </th>
                    <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Cycle
                    </th>
                    <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Due Date
                    </th>
                    <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                    <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[13px] divide-y divide-[#f5f3f0]">
                  {data?.recentInvoices && data.recentInvoices.length > 0 ? (
                    data.recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#faf9f7] transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {inv.practiceName}
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-xs">
                          {inv.cycle}
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-xs">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-3">
                          {getStatusBadge(inv.status)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openPrefundingInvoicePdf(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-[#ece8e1] rounded hover:bg-slate-50 transition"
                              title="Preview PDF"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              View
                            </button>

                            {inv.stripeHostedInvoiceUrl && (
                              <a
                                href={inv.stripeHostedInvoiceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2a6365] bg-[#2a6365]/10 border border-[#2a6365]/20 rounded hover:bg-[#2a6365]/20 transition"
                                title="Stripe Payment Link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Stripe
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No prefunding calculations or invoices match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
