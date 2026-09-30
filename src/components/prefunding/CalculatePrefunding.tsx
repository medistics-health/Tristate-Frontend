import React, { useState } from "react";
import { Calculator, Calendar, Users, DollarSign, FileText, ChevronRight, CheckCircle2, FileDown } from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { getStandardNavbarActions } from "../shared/PageComponents";
import Select from "../shared/Select";

// --- Dummy Data ---

const PRACTICES = [
  { label: "Acme Healthcare", value: "acme" },
  { label: "Global Tech LLC", value: "global" },
  { label: "Stark Industries", value: "stark" },
];

const CYCLES = Array.from({ length: 12 }).map((_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() + i);
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return { label: `${month} ${year}`, value: `${month}-${year}` };
});

const INITIAL_EMPLOYEES = [
  {
    id: '1',
    name: "Alice Johnson",
    jobCategory: "RN",
    location: "New York HQ",
    state: "NY",
    joinDate: "2023-01-15",
    payType: "Salary",
    payRate: 8500,
    budgetedHours: 160,
    bufferPercent: 5,
    workingPeriodHours: 160,
    grossWages: 8500,
  },
  {
    id: '2',
    name: "Bob Smith",
    jobCategory: "Technician",
    location: "New York HQ",
    state: "NY",
    joinDate: "2023-06-20",
    payType: "Hourly",
    payRate: 45,
    budgetedHours: 160,
    bufferPercent: 10,
    workingPeriodHours: 160,
    grossWages: 7200,
  },
];

const PREFUNDING_RATES = [
  { id: '1', name: "Payroll Taxes", basis: "Gross Wages", pricingModel: "Percentage", rate: 7.65 },
  { id: '2', name: "Workers Comp", basis: "Gross Wages", pricingModel: "Percentage", rate: 1.25 },
  { id: '3', name: "Admin Fee", basis: "Headcount", pricingModel: "Flat", rate: 150 },
];

// --- Component ---

export default function CalculatePrefunding() {
  const navbarActions = getStandardNavbarActions(() => {});

  // State
  const [selectedPractice, setSelectedPractice] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);

  // Handlers
  const handleEmployeeChange = (id: string, field: string, value: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      const updatedEmp = { ...emp, [field]: Number(value) || 0 };
      
      // Auto-calculate gross wages for hourly if working period changes
      if (field === 'workingPeriodHours' && updatedEmp.payType === 'Hourly') {
        updatedEmp.grossWages = updatedEmp.workingPeriodHours * updatedEmp.payRate;
      }
      return updatedEmp;
    }));
  };

  const handleNextStep = () => {
    setStep(s => Math.min(s + 1, 4));
  };

  // Calculations
  const totalGrossWages = employees.reduce((acc, emp) => acc + emp.grossWages, 0);
  
  const calculatedRates = PREFUNDING_RATES.map(rate => {
    let amount = 0;
    if (rate.basis === "Gross Wages" && rate.pricingModel === "Percentage") {
      amount = totalGrossWages * (rate.rate / 100);
    } else if (rate.basis === "Headcount" && rate.pricingModel === "Flat") {
      amount = employees.length * rate.rate;
    }
    return { ...rate, amount };
  });

  const totalRatesAmount = calculatedRates.reduce((acc, rate) => acc + rate.amount, 0);
  const grandTotal = totalGrossWages + totalRatesAmount;

  return (
    <AppLayout title="Calculate Prefunding" activeModule="Prefunding" navbarActions={navbarActions}>
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-y-auto rounded-2xl bg-white shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Calculate Prefunding</h1>
              <p className="text-sm text-slate-500 mt-1">Generate prefunding invoices based on practice requirements</p>
            </div>
            {step === 4 && (
              <button className="flex items-center gap-2 px-4 py-2 bg-[#4f63ea] text-white rounded-md text-[13px] font-medium hover:bg-[#4f63ea]/90 transition-colors shadow-sm">
                <FileDown className="h-4 w-4" />
                Invoice PDF Preview
              </button>
            )}
          </div>

          {/* Stepper */}
          <div className="flex items-center mt-8 gap-4 overflow-x-auto pb-2">
            {[
              { num: 1, label: "Setup", icon: Calendar },
              { num: 2, label: "Employees & Wages", icon: Users },
              { num: 3, label: "Prefunding Rates", icon: Calculator },
              { num: 4, label: "Summary", icon: FileText }
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-[#4f63ea]' : 'text-slate-400'}`}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step >= s.num ? 'border-[#4f63ea] bg-[#f0f2fe]' : 'border-slate-300 bg-white'}`}>
                    {step > s.num ? <CheckCircle2 className="w-5 h-5 text-[#4f63ea]" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[13px] font-medium whitespace-nowrap">{s.label}</span>
                </div>
                {i < 3 && <div className={`flex-1 min-w-[30px] h-[2px] ${step > s.num ? 'bg-[#4f63ea]' : 'bg-slate-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="max-w-5xl space-y-6">
            
            {/* Step 1: Setup */}
            <div className={`bg-white rounded-xl border ${step >= 1 ? 'border-[#e8e4dc]' : 'border-transparent opacity-50 pointer-events-none'} shadow-sm overflow-hidden transition-all`}>
              <div className="bg-slate-50/50 px-6 py-4 border-b border-[#e8e4dc] flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-800">1. Setup Criteria</h2>
                {step > 1 && <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">Completed</span>}
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Select Practice</label>
                  <Select 
                    options={PRACTICES}
                    value={selectedPractice}
                    onChange={setSelectedPractice}
                    placeholder="Choose a practice..."
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Prefunding Cycle</label>
                  <Select 
                    options={CYCLES}
                    value={selectedCycle}
                    onChange={setSelectedCycle}
                    placeholder="Choose next cycle..."
                  />
                </div>
              </div>
              {step === 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-[#e8e4dc] flex justify-end">
                  <button 
                    onClick={handleNextStep}
                    disabled={!selectedPractice || !selectedCycle}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4f63ea] text-white rounded-md text-[13px] font-medium disabled:opacity-50 transition-colors"
                  >
                    Load Employees
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Employees */}
            {step >= 2 && (
              <div className="bg-white rounded-xl border border-[#e8e4dc] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-slate-50/50 px-6 py-4 border-b border-[#e8e4dc] flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-slate-800">2. Employees & Wages</h2>
                  {step > 2 && <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">Completed</span>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                        <th className="px-6 py-3">Employee</th>
                        <th className="px-6 py-3">Job & Location</th>
                        <th className="px-6 py-3">Pay Info</th>
                        <th className="px-6 py-3">Budget / Buffer</th>
                        <th className="px-6 py-3">Working Period (Hrs)</th>
                        <th className="px-6 py-3">Gross Wages ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8e4dc]">
                      {employees.map(emp => (
                        <tr key={emp.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">{emp.name}</div>
                            <div className="text-slate-500 text-xs mt-0.5">Joined: {emp.joinDate}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-700">{emp.jobCategory}</div>
                            <div className="text-slate-500 text-xs mt-0.5">{emp.location} ({emp.state})</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-700">{emp.payType}</div>
                            <div className="text-slate-500 text-xs mt-0.5">${emp.payRate} {emp.payType === 'Hourly' ? '/hr' : ''}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-700">{emp.budgetedHours} hrs</div>
                            <div className="text-slate-500 text-xs mt-0.5">{emp.bufferPercent}% Buffer</div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              className="w-24 app-control rounded-md px-2 py-1 text-[13px]"
                              value={emp.workingPeriodHours}
                              onChange={(e) => handleEmployeeChange(emp.id, 'workingPeriodHours', e.target.value)}
                              disabled={step > 2}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              className="w-28 app-control rounded-md px-2 py-1 text-[13px] font-medium text-slate-800"
                              value={emp.grossWages}
                              onChange={(e) => handleEmployeeChange(emp.id, 'grossWages', e.target.value)}
                              disabled={step > 2}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-medium text-slate-800 border-t border-[#e8e4dc]">
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-right">Total Gross Wages:</td>
                        <td className="px-6 py-4 text-emerald-600">${totalGrossWages.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {step === 2 && (
                  <div className="px-6 py-4 bg-slate-50 flex justify-end">
                    <button 
                      onClick={handleNextStep}
                      className="flex items-center gap-2 px-4 py-2 bg-[#4f63ea] text-white rounded-md text-[13px] font-medium transition-colors"
                    >
                      Apply Prefunding Rates
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Rates */}
            {step >= 3 && (
              <div className="bg-white rounded-xl border border-[#e8e4dc] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-slate-50/50 px-6 py-4 border-b border-[#e8e4dc] flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-slate-800">3. Prefunding Rates</h2>
                  {step > 3 && <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">Completed</span>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                        <th className="px-6 py-3">Rate Name</th>
                        <th className="px-6 py-3">Basis</th>
                        <th className="px-6 py-3">Pricing Model</th>
                        <th className="px-6 py-3">Rate</th>
                        <th className="px-6 py-3">Calculated Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8e4dc]">
                      {calculatedRates.map(rate => (
                        <tr key={rate.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-medium text-slate-800">{rate.name}</td>
                          <td className="px-6 py-4 text-slate-700">{rate.basis}</td>
                          <td className="px-6 py-4 text-slate-700">{rate.pricingModel}</td>
                          <td className="px-6 py-4 text-slate-700">{rate.pricingModel === 'Percentage' ? `${rate.rate}%` : `$${rate.rate}`}</td>
                          <td className="px-6 py-4 font-medium text-slate-800">${rate.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-medium text-slate-800 border-t border-[#e8e4dc]">
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-right">Total Rates Amount:</td>
                        <td className="px-6 py-4 text-indigo-600">${totalRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {step === 3 && (
                  <div className="px-6 py-4 bg-slate-50 flex justify-end">
                    <button 
                      onClick={handleNextStep}
                      className="flex items-center gap-2 px-4 py-2 bg-[#4f63ea] text-white rounded-md text-[13px] font-medium transition-colors"
                    >
                      Calculate Grand Total
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Summary */}
            {step === 4 && (
              <div className="bg-white rounded-xl border border-[#4f63ea]/20 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#f0f2fe] px-6 py-5 border-b border-[#4f63ea]/20">
                  <h2 className="text-[16px] font-semibold text-[#4f63ea] flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Grand Total Summary
                  </h2>
                </div>
                <div className="p-8">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                      <span className="text-slate-600">Total Gross Wages</span>
                      <span className="font-medium text-slate-800">${totalGrossWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                      <span className="text-slate-600">Total Prefunding Rates</span>
                      <span className="font-medium text-slate-800">${totalRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 mt-4 bg-slate-50 px-4 rounded-lg border border-slate-200">
                      <span className="text-[15px] font-semibold text-slate-800">Grand Total Prefunding</span>
                      <span className="text-[18px] font-bold text-[#4f63ea]">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}