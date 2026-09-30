import React, { useState } from "react";
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
  FileSignature
} from "lucide-react";

const dummyMetrics = [
  { label: "Prefunding-enabled Practices", value: "24", icon: <Building2 className="w-5 h-5 text-blue-600" />, bgColor: "bg-blue-50" },
  { label: "Upcoming Prefunding Cycles", value: "8", icon: <CalendarDays className="w-5 h-5 text-indigo-600" />, bgColor: "bg-indigo-50" },
  { label: "Draft Invoices", value: "5", icon: <FileText className="w-5 h-5 text-orange-600" />, bgColor: "bg-orange-50" },
  { label: "Pending Approval", value: "3", icon: <Clock className="w-5 h-5 text-yellow-600" />, bgColor: "bg-yellow-50" },
  { label: "Approved Invoices", value: "12", icon: <CheckCircle className="w-5 h-5 text-emerald-600" />, bgColor: "bg-emerald-50" },
  { label: "Posted Invoices", value: "45", icon: <UploadCloud className="w-5 h-5 text-cyan-600" />, bgColor: "bg-cyan-50" },
  { label: "Total Prefunding Amount", value: "$1.2M", icon: <DollarSign className="w-5 h-5 text-green-600" />, bgColor: "bg-green-50" },
  { label: "Upcoming Due Amounts", value: "$340K", icon: <TrendingUp className="w-5 h-5 text-purple-600" />, bgColor: "bg-purple-50" },
];

const dummyReminders = [
  { id: 1, message: "Invoice #INV-2026-045 due in 2 days", practice: "Metro Health", date: "2026-10-02" },
  { id: 2, message: "Prefunding Cycle starts tomorrow", practice: "City Care Clinic", date: "2026-10-01" },
];

export default function PrefundingDashboard() {
  const [filterPractice, setFilterPractice] = useState("");
  const [filterCycle, setFilterCycle] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const navbarActions = getStandardNavbarActions(() => {});

  return (
    <AppLayout title="Prefunding Dashboard" activeModule="Prefunding" navbarActions={navbarActions}>
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-y-auto rounded-2xl bg-[#faf9f7] shadow-xs p-6">
        
        {/* Header & Filters */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Prefunding Dashboard</h1>
            <p className="text-[13px] text-slate-500 mt-1">Consolidated summary of prefunding operations and metrics.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-48">
              <Select value={filterPractice} onChange={setFilterPractice} placeholder="All Practices" options={[{label: "Metro Health", value: "metro"}, {label: "City Care Clinic", value: "city"}]} className="w-full text-[13px]" />
            </div>
            <div className="w-40">
              <Select value={filterCycle} onChange={setFilterCycle} placeholder="All Cycles" options={[{label: "Weekly", value: "weekly"}, {label: "Monthly", value: "monthly"}]} className="w-full text-[13px]" />
            </div>
            <div className="w-40">
              <Select value={filterStatus} onChange={setFilterStatus} placeholder="Invoice Status" options={[{label: "Draft", value: "draft"}, {label: "Approved", value: "approved"}]} className="w-full text-[13px]" />
            </div>
            <div className="w-40">
              <DatePicker value={filterDate} onChange={setFilterDate} placeholder="Filter Date" className="w-full text-[13px]" />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {dummyMetrics.map((metric, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#ece8e1] p-5 shadow-xs flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${metric.bgColor}`}>
                {metric.icon}
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-500">{metric.label}</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{metric.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reminders & Alerts */}
          <div className="bg-white rounded-xl border border-[#ece8e1] p-5 shadow-xs lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-[14px] font-semibold text-slate-800">Applicable Reminders</h2>
            </div>
            <div className="space-y-3">
              {dummyReminders.map(rem => (
                <div key={rem.id} className="p-3 bg-[#fdfaf5] border border-[#f5ead6] rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[13px] font-medium text-slate-800">{rem.practice}</span>
                    <span className="text-[11px] font-medium text-slate-500">{rem.date}</span>
                  </div>
                  <p className="text-[12px] text-slate-600">{rem.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Prefunding Calculations / Invoices */}
          <div className="bg-white rounded-xl border border-[#ece8e1] p-5 shadow-xs lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <FileSignature className="w-5 h-5 text-indigo-500" />
              <h2 className="text-[14px] font-semibold text-slate-800">Recent Prefunding Invoices</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#ece8e1]">
                    <th className="pb-3 text-[12px] font-semibold text-slate-500">Invoice #</th>
                    <th className="pb-3 text-[12px] font-semibold text-slate-500">Practice</th>
                    <th className="pb-3 text-[12px] font-semibold text-slate-500">Cycle</th>
                    <th className="pb-3 text-[12px] font-semibold text-slate-500">Amount</th>
                    <th className="pb-3 text-[12px] font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  <tr className="border-b border-[#f5f3f0]">
                    <td className="py-3 font-medium text-indigo-600">INV-2026-045</td>
                    <td className="py-3 text-slate-700">Metro Health</td>
                    <td className="py-3 text-slate-600">Weekly</td>
                    <td className="py-3 text-slate-800 font-medium">$14,500.00</td>
                    <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[11px] font-medium">Pending Approval</span></td>
                  </tr>
                  <tr className="border-b border-[#f5f3f0]">
                    <td className="py-3 font-medium text-indigo-600">INV-2026-044</td>
                    <td className="py-3 text-slate-700">City Care Clinic</td>
                    <td className="py-3 text-slate-600">Monthly</td>
                    <td className="py-3 text-slate-800 font-medium">$8,200.00</td>
                    <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium">Approved</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-indigo-600">INV-2026-043</td>
                    <td className="py-3 text-slate-700">Downtown Dental</td>
                    <td className="py-3 text-slate-600">Weekly</td>
                    <td className="py-3 text-slate-800 font-medium">$21,000.00</td>
                    <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[11px] font-medium">Posted</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
      </div>
    </AppLayout>
  );
}
