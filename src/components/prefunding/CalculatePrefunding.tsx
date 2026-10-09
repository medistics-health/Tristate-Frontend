import React, { useState, useEffect } from "react";
import { Calculator, Calendar, Users, DollarSign, FileText, ChevronRight, CheckCircle2, FileDown, Loader2 } from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { getStandardNavbarActions } from "../shared/PageComponents";
import Select from "../shared/Select";
import { apiConnector } from "../../services/apiConnector";
import { practiceEndpoints, prefundingEndpoints } from "../../services/apis";

const CYCLES = Array.from({ length: 12 }).map((_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() + i);
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return { label: `${month} ${year}`, value: `${month}-${year}` };
});

const getPricingModelColorClass = (val: string) => {
  const colors: Record<string, string> = {
    "Percentage": "bg-purple-100 text-purple-700",
    "Flat Fee": "bg-emerald-100 text-emerald-700",
    "Addition": "bg-blue-100 text-blue-700",
    "Subtraction": "bg-red-100 text-red-700",
    "Multiplication": "bg-amber-100 text-amber-700",
    "Division": "bg-cyan-100 text-cyan-700",
  };
  return colors[val] || "bg-slate-100 text-slate-700";
};

export default function CalculatePrefunding() {
  const navbarActions = getStandardNavbarActions(() => {});

  // State
  const [step, setStep] = useState(1);
  const [selectedPractice, setSelectedPractice] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");
  
  const [practices, setPractices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Practices on mount
  useEffect(() => {
    const fetchPractices = async () => {
      try {
        const response = await apiConnector({ url: practiceEndpoints.LIST, method: "GET", credentials: true });
        if (response?.data) {
          const dataList = response.data.practices || (Array.isArray(response.data) ? response.data : []);
          const prefundingPractices = dataList.filter((p: any) => p.isPrefundingEnabled);
          setPractices(prefundingPractices.map((p: any) => ({ label: p.name, value: p.id })));
        }
      } catch (err) {
        console.error("Failed to load practices", err);
      }
    };
    fetchPractices();
  }, []);

  const loadEmployeesAndRates = async () => {
    if (!selectedPractice) return;
    setLoading(true);
    try {
      // 1. Fetch practice details to get its persons
      const practiceRes = await apiConnector({ url: practiceEndpoints.GET(selectedPractice), method: "GET", credentials: true });
      const practicePersons = practiceRes?.data?.practice?.persons?.map((pp: any) => pp.person) || [];
      
      const mappedEmployees = practicePersons.map((p: any) => {
        const payRate = p.payRate ? Number(p.payRate) : 0;
        const budgetedHours = p.budgetedHours ? Number(p.budgetedHours) : 160;
        const bufferPercent = p.bufferPercentage ? Number(p.bufferPercentage) : 0;
        
        // Initial working period hours
        const workingPeriodHours = budgetedHours;
        
        let grossWages = 0;
        if (p.payType?.toLowerCase() === 'hourly') {
          grossWages = workingPeriodHours * payRate;
        } else {
          grossWages = payRate; // Assuming salary is for the period
        }

        return {
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          jobCategory: p.jobCategory || "N/A",
          location: p.workLocation || "N/A",
          state: p.state || "N/A",
          joinDate: p.dateOfJoining ? new Date(p.dateOfJoining).toISOString().split('T')[0] : "N/A",
          payType: p.payType || "Salary",
          payRate: payRate,
          budgetedHours: budgetedHours,
          bufferPercent: bufferPercent,
          workingPeriodHours: workingPeriodHours,
          grossWages: grossWages,
        };
      });
      setEmployees(mappedEmployees);

      // 2. Fetch rates
      const ratesRes = await apiConnector({ url: prefundingEndpoints.RATES, method: "GET", credentials: true });
      const allRates = ratesRes?.data?.rates || [];
      // Filter rates applicable to selected practice
      const practiceSpecificRates = allRates.filter((r: any) => 
        r.practiceRates?.some((pr: any) => pr.practiceId === selectedPractice)
      );
      setRates(practiceSpecificRates);

      setStep(2);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      loadEmployeesAndRates();
    } else {
      setStep(s => Math.min(s + 1, 4));
    }
  };

  const handleEmployeeChange = (id: string, field: string, value: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      const updatedEmp = { ...emp, [field]: Number(value) || 0 };
      
      if (field === 'workingPeriodHours' && updatedEmp.payType?.toLowerCase() === 'hourly') {
        updatedEmp.grossWages = updatedEmp.workingPeriodHours * updatedEmp.payRate;
      }
      return updatedEmp;
    }));
  };

  const generateInvoice = async () => {
    setSubmitting(true);
    try {
      const payload = {
        practiceId: selectedPractice,
        cycle: selectedCycle,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
        totalAmount: grandTotal,
        lineItems: calculatedRates.map(r => ({
          name: r.name,
          basis: r.basis,
          pricingModel: r.pricingModel,
          rate: r.rate,
          amount: r.amount,
          isOneTime: false,
        })),
      };

      await apiConnector({ url: prefundingEndpoints.INVOICES, method: "POST", body: payload, credentials: true });
      alert("Prefunding Invoice Generated Successfully!");
      setStep(1);
      setSelectedPractice("");
      setSelectedCycle("");
    } catch (err) {
      console.error("Failed to generate invoice", err);
      alert("Failed to generate invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const totalGrossWages = employees.reduce((acc, emp) => acc + emp.grossWages, 0);
  
  const calculatedRates = rates.map(rate => {
    let amount = 0;
    const rateVal = Number(rate.rate) || 0;
    if (rate.basis === "Gross Wages" && rate.pricingModel === "Percentage") {
      amount = totalGrossWages * (rateVal / 100);
    } else if (rate.basis === "Headcount" && rate.pricingModel === "Flat Fee") {
      amount = employees.length * rateVal;
    } else {
      amount = rateVal; // fallback
    }
    return { ...rate, amount };
  });

  const totalRatesAmount = calculatedRates.reduce((acc, rate) => acc + rate.amount, 0);
  const grandTotal = totalGrossWages + totalRatesAmount;

  return (
    <AppLayout title="Calculate Prefunding" activeModule="Prefunding" navbarActions={navbarActions}>
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0ece6]">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Calculate Prefunding</h1>
              <p className="text-sm text-slate-500 mt-1">Generate prefunding invoices based on practice requirements</p>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar Stepper */}
          <div className="w-[280px] flex-shrink-0 border-r border-[#f0ece6] bg-[#fcfaf8] p-8 overflow-y-auto">
            <div className="flex flex-col">
              {[
                { num: 1, label: "Setup", desc: "Select practice and cycle", icon: Calendar },
                { num: 2, label: "Employees & Wages", desc: "Verify working periods", icon: Users },
                { num: 3, label: "Prefunding Rates", desc: "Apply adjustments", icon: Calculator },
                { num: 4, label: "Summary", desc: "Review and generate", icon: FileText }
              ].map((s, i) => (
                <div key={s.num} className="relative flex items-start group">
                  {i < 3 && (
                    <div className={`absolute left-4 top-8 -bottom-4 w-[2px] ${step > s.num ? 'bg-[#4f63ea]' : 'bg-slate-200'}`} />
                  )}
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-white border-2">
                    <div className={`flex items-center justify-center w-full h-full rounded-full ${step >= s.num ? 'border-[#4f63ea] bg-[#f0f2fe] text-[#4f63ea]' : 'border-slate-300 bg-white text-slate-400'}`}>
                      {step > s.num ? <CheckCircle2 className="w-5 h-5 text-[#4f63ea]" /> : <s.icon className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="ml-4 pb-8">
                    <p className={`text-[14px] font-semibold ${step >= s.num ? 'text-slate-800' : 'text-slate-500'}`}>{s.label}</p>
                    <p className="text-[13px] text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Side Content */}
          <div className="flex-1 overflow-y-auto p-10 bg-white">
            <div className="max-w-4xl space-y-6">
            
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
                    options={practices}
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
                    disabled={!selectedPractice || !selectedCycle || loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4f63ea] text-white rounded-md text-[13px] font-medium disabled:opacity-50 transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load Employees"}
                    {!loading && <ChevronRight className="h-4 w-4" />}
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
                  {employees.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">No employees found for this practice.</div>
                  ) : (
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
                              <div className="text-slate-500 text-xs mt-0.5">${emp.payRate} {emp.payType?.toLowerCase() === 'hourly' ? '/hr' : ''}</div>
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
                  )}
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
                  {calculatedRates.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">No prefunding rates found.</div>
                  ) : (
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
                            <td className="px-6 py-4">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPricingModelColorClass(rate.pricingModel)}`}>
                                {rate.pricingModel}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                                {rate.pricingModel === 'Percentage' ? `${rate.rate}%` : 
                                 rate.pricingModel === 'Multiplication' ? `x${rate.rate}` : 
                                 rate.pricingModel === 'Division' ? `/${rate.rate}` : 
                                 `${rate.rate}`}
                              </td>
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
                  )}
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
                <div className="bg-[#f0f2fe] px-6 py-5 border-b border-[#4f63ea]/20 flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-[#4f63ea] flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Grand Total Summary
                  </h2>
                  <button 
                    onClick={generateInvoice}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4f63ea] text-white rounded-md text-[13px] font-medium hover:bg-[#4f63ea]/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    {submitting ? "Generating..." : "Generate Invoice"}
                  </button>
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
            </div>
          </div>
          </section>
        </div>
    </AppLayout>
  );
}