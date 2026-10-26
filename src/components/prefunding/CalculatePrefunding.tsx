import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Calculator,
  Calendar,
  Users,
  DollarSign,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileDown,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
  X,
  AlertCircle,
  Eye,
  Info,
  GripVertical,
} from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { getStandardNavbarActions } from "../shared/PageComponents";
import Select from "../shared/Select";
import DatePicker from "../shared/DatePicker";
import MultiSelect from "../shared/MultiSelect";
import ConfirmModal from "../shared/ConfirmModal";
import toast from "react-hot-toast";
import { apiConnector } from "../../services/apiConnector";
import { practiceEndpoints, prefundingEndpoints } from "../../services/apis";
import { createPrefundingRate } from "../../services/operations/prefundingRates";
import { openPrefundingInvoicePdf, getPrefundingInvoice, updatePrefundingInvoice, validatePracticeForPrefunding } from "../../services/operations/prefundingInvoices";

// Types
export type EmployeeCalculationItem = {
  id: string;
  name: string;
  jobCategory: string;
  location: string;
  state: string;
  joinDate: string;
  payType: "Hourly" | "Salary";
  payRate: number;
  budgetedHours: number;
  bufferPercent: number;
  workingPeriodHours: number;
  baseWages: number;
  grossWages: number;
  isCustomGrossWages?: boolean;
  isExcluded?: boolean;
};

export type PrefundingRateCalculationItem = {
  id: string;
  name: string;
  basis: string;
  pricingModel: string;
  rate: number;
  amount: number;
  notes?: string | null;
  customAmount?: number | null;
  isOneTime: boolean;
  isExcluded?: boolean;
  includeInGrandTotal?: boolean;
};

const PRICING_MODELS = [
  { value: "Percentage", label: "Percentage (%)" },
  { value: "Flat Fee", label: "Flat Fee ($)" },
  { value: "Addition", label: "Addition (+)" },
  { value: "Subtraction", label: "Subtraction (-)" },
  { value: "Multiplication", label: "Multiplication (x)" },
  { value: "Division", label: "Division (/)" },
];

const BASE_BASIS_OPTIONS = [
  { value: "Gross Wages", label: "Gross Wages" },
  { value: "Total Employees", label: "Total Employees" },
  { value: "Flat Fee", label: "Flat Fee" },
  { value: "GMS Projection", label: "GMS Projection (Subtotal)" },
  { value: "Grand Total", label: "Grand Total" },
];

const JOB_CATEGORY_OPTIONS = [
  { label: "Clinical", value: "CLINICAL" },
  { label: "Non-Clinical", value: "NON_CLINICAL" },
];

const US_STATES_OPTIONS = [
  { label: "Alabama", value: "AL" }, { label: "Alaska", value: "AK" }, { label: "Arizona", value: "AZ" },
  { label: "Arkansas", value: "AR" }, { label: "California", value: "CA" }, { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" }, { label: "Delaware", value: "DE" }, { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" }, { label: "Hawaii", value: "HI" }, { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" }, { label: "Indiana", value: "IN" }, { label: "Iowa", value: "IA" },
  { label: "Kansas", value: "KS" }, { label: "Kentucky", value: "KY" }, { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" }, { label: "Maryland", value: "MD" }, { label: "Massachusetts", value: "MA" },
  { label: "Michigan", value: "MI" }, { label: "Minnesota", value: "MN" }, { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" }, { label: "Montana", value: "MT" }, { label: "Nebraska", value: "NE" },
  { label: "Nevada", value: "NV" }, { label: "New Hampshire", value: "NH" }, { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" }, { label: "New York", value: "NY" }, { label: "North Carolina", value: "NC" },
  { label: "North Dakota", value: "ND" }, { label: "Ohio", value: "OH" }, { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" }, { label: "Pennsylvania", value: "PA" }, { label: "Rhode Island", value: "RI" },
  { label: "South Carolina", value: "SC" }, { label: "South Dakota", value: "SD" }, { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" }, { label: "Utah", value: "UT" }, { label: "Vermont", value: "VT" },
  { label: "Virginia", value: "VA" }, { label: "Washington", value: "WA" }, { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" }, { label: "Wyoming", value: "WY" }
];

const EMPLOYEE_PAY_TYPE_OPTIONS = [
  { label: "Hourly", value: "Hourly" },
  { label: "Monthly", value: "Monthly" },
  { label: "Annually", value: "Annually" },
];

function generatePracticeCycles(startDateStr?: string | null, cycleType?: string | null) {
  let baseDate: Date;
  if (startDateStr) {
    const parts = startDateStr.split("T")[0].split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      baseDate = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      baseDate = new Date(startDateStr);
    }
  } else {
    baseDate = new Date();
  }

  const cycle = (cycleType || "MONTHLY").toUpperCase();
  const cycles = [];
  let currentStart = new Date(baseDate);

  for (let i = 0; i < 12; i++) {
    let nextStart: Date;
    if (cycle === "WEEKLY") {
      nextStart = new Date(currentStart);
      nextStart.setDate(nextStart.getDate() + 7);
    } else if (cycle === "BI_WEEKLY" || cycle === "BIWEEKLY") {
      nextStart = new Date(currentStart);
      nextStart.setDate(nextStart.getDate() + 14);
    } else if (cycle === "QUARTERLY") {
      nextStart = new Date(currentStart);
      nextStart.setMonth(nextStart.getMonth() + 3);
    } else if (cycle === "SEMI_ANNUALLY" || cycle === "SEMIANNUALLY") {
      nextStart = new Date(currentStart);
      nextStart.setMonth(nextStart.getMonth() + 6);
    } else if (cycle === "YEARLY") {
      nextStart = new Date(currentStart);
      nextStart.setFullYear(nextStart.getFullYear() + 1);
    } else {
      // Default: MONTHLY (add 1 month from exact start day)
      nextStart = new Date(currentStart);
      nextStart.setMonth(nextStart.getMonth() + 1);
    }

    const currentEnd = new Date(nextStart);
    currentEnd.setDate(currentEnd.getDate() - 1);

    const startFormatted = currentStart.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const endFormatted = currentEnd.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

    const startISO = `${currentStart.getFullYear()}-${String(currentStart.getMonth() + 1).padStart(2, "0")}-${String(currentStart.getDate()).padStart(2, "0")}`;
    const endISO = `${currentEnd.getFullYear()}-${String(currentEnd.getMonth() + 1).padStart(2, "0")}-${String(currentEnd.getDate()).padStart(2, "0")}`;

    const label = `${startFormatted} - ${endFormatted}`;

    cycles.push({
      label,
      value: label,
      startDate: startISO,
      endDate: endISO,
      formattedStart: startFormatted,
      formattedEnd: endFormatted,
    });

    currentStart = nextStart;
  }

  return cycles;
}

const getPricingModelColorClass = (val: string) => {
  const colors: Record<string, string> = {
    "Percentage": "bg-purple-100 text-purple-700 border-purple-200",
    "Flat Fee": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Addition": "bg-blue-100 text-blue-700 border-blue-200",
    "Subtraction": "bg-red-100 text-red-700 border-red-200",
    "Multiplication": "bg-amber-100 text-amber-700 border-amber-200",
    "Division": "bg-cyan-100 text-cyan-700 border-cyan-200",
  };
  return colors[val] || "bg-slate-100 text-slate-700 border-slate-200";
};

export default function CalculatePrefunding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const navbarActions = getStandardNavbarActions(() => {});

  // Wizard state
  const editingInvoiceId = searchParams.get("invoiceId");
  const [step, setStep] = useState(1);
  const [selectedPractice, setSelectedPractice] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");
  const [cycleStartDate, setCycleStartDate] = useState("");
  const [cycleEndDate, setCycleEndDate] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [practices, setPractices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<EmployeeCalculationItem[]>([]);
  const [rates, setRates] = useState<PrefundingRateCalculationItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Practice Validation State
  const [practiceValidation, setPracticeValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    details?: any;
  } | null>(null);
  const [isValidatingPractice, setIsValidatingPractice] = useState(false);

  // Modals state
  const [showAddLineItemModal, setShowAddLineItemModal] = useState(false);
  const [showEditLineItemModal, setShowEditLineItemModal] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<PrefundingRateCalculationItem | null>(null);

  // New line item form state
  const [newLineItemName, setNewLineItemName] = useState("");
  const [newLineItemBasis, setNewLineItemBasis] = useState("Gross Wages");
  const [newLineItemPricingModel, setNewLineItemPricingModel] = useState("Percentage");
  const [newLineItemRate, setNewLineItemRate] = useState<number | string>(10);
  const [newLineItemNotes, setNewLineItemNotes] = useState("");
  const [newLineItemIncludeInGrandTotal, setNewLineItemIncludeInGrandTotal] = useState(true);
  const [newLineItemStorageOption, setNewLineItemStorageOption] = useState<"template" | "onetime">("onetime");
  const [isSavingLineItem, setIsSavingLineItem] = useState(false);
  const [lineItemModalErrors, setLineItemModalErrors] = useState<Record<string, string>>({});

  // Edit line item form state
  const [editLineItemName, setEditLineItemName] = useState("");
  const [editLineItemBasis, setEditLineItemBasis] = useState("Gross Wages");
  const [editLineItemPricingModel, setEditLineItemPricingModel] = useState("");
  const [editLineItemRate, setEditLineItemRate] = useState<number | string>(0);
  const [editLineItemAmount, setEditLineItemAmount] = useState<number | string>("");
  const [editLineItemNotes, setEditLineItemNotes] = useState("");
  const [editLineItemIncludeInGrandTotal, setEditLineItemIncludeInGrandTotal] = useState(true);

  // Add ad-hoc employee modal
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeJobCategory, setNewEmployeeJobCategory] = useState("CLINICAL");
  const [newEmployeeLocation, setNewEmployeeLocation] = useState("Main Clinic");
  const [newEmployeeState, setNewEmployeeState] = useState("NY");
  const [newEmployeeDateOfJoining, setNewEmployeeDateOfJoining] = useState(new Date().toISOString().split("T")[0]);
  const [newEmployeePayType, setNewEmployeePayType] = useState<"Hourly" | "Salary">("Hourly");
  const [newEmployeePayRate, setNewEmployeePayRate] = useState<number | string>(25);
  const [newEmployeeBudgetedHours, setNewEmployeeBudgetedHours] = useState<number | string>(160);
  const [newEmployeeBufferPercent, setNewEmployeeBufferPercent] = useState<number | string>(10);
  const [employeeModalErrors, setEmployeeModalErrors] = useState<Record<string, string>>({});

  // Generated Invoice Result
  const [generatedInvoice, setGeneratedInvoice] = useState<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    cycle: string;
    dueDate: string;
  } | null>(null);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);

  // Fetch Practices on mount
  useEffect(() => {
    const fetchPractices = async () => {
      try {
        const response = await apiConnector({ url: practiceEndpoints.LIST, method: "GET", credentials: true });
        if (response?.data) {
          const dataList = response.data.practices || (Array.isArray(response.data) ? response.data : []);
          const prefundingPractices = dataList.filter((p: any) => p.isPrefundingEnabled);
          setPractices(
            prefundingPractices.map((p: any) => ({
              label: p.name,
              value: p.id,
              prefundingCycle: p.prefundingCycle,
              prefundingStartDate: p.prefundingStartDate,
              prefundingDueOn: p.prefundingDueOn,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load practices", err);
      }
    };
    fetchPractices();
  }, []);


  // Pre-fill or load from API when editing an existing invoice
  useEffect(() => {
    const initData = async () => {
      const qPracticeId = searchParams.get("practiceId");
      const qCycle = searchParams.get("cycle");

      if (editingInvoiceId) {
        setLoading(true);
        try {
          const invRes = await getPrefundingInvoice(editingInvoiceId);
          const inv = invRes?.prefundingInvoice || invRes?.invoice || invRes;

          if (inv) {
            const pid = inv.practiceId || qPracticeId || "";
            const cycleVal = (inv.cycle || inv.prefundingCycle || qCycle || "").trim();

            setSelectedPractice(pid);
            if (cycleVal && cycleVal !== "undefined" && cycleVal !== "null") {
              setSelectedCycle(cycleVal);
            }

            if (inv.invoiceDate) {
              setInvoiceDate(new Date(inv.invoiceDate).toISOString().split("T")[0]);
            }
            if (inv.dueDate) {
              setDueDate(new Date(inv.dueDate).toISOString().split("T")[0]);
            }

            // Extract cycle start and end dates from cycle string if present
            if (cycleVal && cycleVal.includes(" - ")) {
              const [startStr, endStr] = cycleVal.split(" - ").map((s: string) => s.trim());
              const parsedStart = new Date(startStr);
              const parsedEnd = new Date(endStr);
              if (!isNaN(parsedStart.getTime())) {
                setCycleStartDate(parsedStart.toISOString().split("T")[0]);
              }
              if (!isNaN(parsedEnd.getTime())) {
                setCycleEndDate(parsedEnd.toISOString().split("T")[0]);
              }
            }

            // Load Practice Employees
            if (pid) {
              const practiceRes = await apiConnector({
                url: practiceEndpoints.GET(pid),
                method: "GET",
                credentials: true,
              });
              const practicePersons = practiceRes?.data?.practice?.persons?.map((pp: any) => pp.person) || [];

              const grossWagesLineItem = Array.isArray(inv.lineItems)
                ? inv.lineItems.find((li: any) => li.name?.toLowerCase().startsWith("gross wages"))
                : null;

              // Restore saved employee snapshots if present in notes, or detect gross wages override
              let savedEmpSnapshotMap: Record<string, any> = {};
              if (grossWagesLineItem?.notes) {
                try {
                  const parsed = JSON.parse(grossWagesLineItem.notes);
                  if (parsed && typeof parsed === "object" && parsed.employees) {
                    savedEmpSnapshotMap = parsed.employees;
                  }
                } catch {
                  // Not JSON, ignore
                }
              }

              const mappedEmployees: EmployeeCalculationItem[] = practicePersons.map((p: any) => {
                const savedEmp = savedEmpSnapshotMap[p.id];
                const payRate = savedEmp?.payRate !== undefined ? Number(savedEmp.payRate) : (p.payRate ? Number(p.payRate) : 0);
                const budgetedHours = savedEmp?.budgetedHours !== undefined ? Number(savedEmp.budgetedHours) : (p.budgetedHours ? Number(p.budgetedHours) : 160);
                const bufferPercent = savedEmp?.bufferPercent !== undefined
                  ? Number(savedEmp.bufferPercent)
                  : ((p.bufferPercentage !== null && p.bufferPercentage !== undefined && Number(p.bufferPercentage) > 0)
                    ? Number(p.bufferPercentage)
                    : 10);
                const payType: "Hourly" | "Salary" = savedEmp?.payType
                  ? savedEmp.payType
                  : (p.payType?.toLowerCase() === "hourly" ? "Hourly" : "Salary");

                const workingPeriodHours = savedEmp?.workingPeriodHours !== undefined ? Number(savedEmp.workingPeriodHours) : budgetedHours;
                let baseWages = 0;
                if (payType === "Hourly") {
                  baseWages = workingPeriodHours * payRate;
                } else {
                  baseWages = (budgetedHours > 0 && workingPeriodHours !== budgetedHours)
                    ? (workingPeriodHours / budgetedHours) * payRate
                    : payRate;
                }
                const bufferAmount = baseWages * (bufferPercent / 100);
                const formulaGrossWages = Math.round((baseWages + bufferAmount) * 100) / 100;
                const grossWages = savedEmp?.grossWages !== undefined ? Number(savedEmp.grossWages) : formulaGrossWages;
                const isCustomGrossWages = savedEmp?.isCustomGrossWages !== undefined
                  ? Boolean(savedEmp.isCustomGrossWages)
                  : (savedEmp?.grossWages !== undefined && Math.abs(savedEmp.grossWages - formulaGrossWages) > 0.01);

                return {
                  id: p.id,
                  name: `${p.firstName} ${p.lastName}`.trim() || "Unnamed Employee",
                  jobCategory: p.jobCategory || "General Staff",
                  location: p.workLocation || "Main Location",
                  state: p.state || "NY",
                  joinDate: p.dateOfJoining ? new Date(p.dateOfJoining).toISOString().split("T")[0] : "N/A",
                  payType,
                  payRate,
                  budgetedHours,
                  bufferPercent,
                  workingPeriodHours,
                  baseWages: Math.round(baseWages * 100) / 100,
                  grossWages,
                  isCustomGrossWages,
                  isExcluded: Boolean(savedEmp?.isExcluded),
                };
              });

              // If gross wages line item was manually overridden as a whole and no per-employee snapshot exists
              if (grossWagesLineItem && !Object.keys(savedEmpSnapshotMap).length && mappedEmployees.length > 0) {
                const savedGrossWagesTotal = Number(grossWagesLineItem.amount) || 0;
                const sumDefaultGrossWages = mappedEmployees.reduce((acc, emp) => acc + emp.grossWages, 0);
                if (savedGrossWagesTotal > 0 && Math.abs(savedGrossWagesTotal - sumDefaultGrossWages) > 0.01) {
                  // If difference exists, distribute or flag the first employee / mark override
                  const diff = savedGrossWagesTotal - sumDefaultGrossWages;
                  mappedEmployees[0].grossWages = Math.round((mappedEmployees[0].grossWages + diff) * 100) / 100;
                  mappedEmployees[0].isCustomGrossWages = true;
                }
              }

              setEmployees(mappedEmployees);

              // Rates: Map from saved invoice line items (excluding gross wages line item)
              if (Array.isArray(inv.lineItems) && inv.lineItems.length > 0) {
                const nonGrossItems = inv.lineItems.filter(
                  (li: any) => !li.name?.toLowerCase().startsWith("gross wages")
                );

                if (nonGrossItems.length > 0) {
                  const mappedRates: PrefundingRateCalculationItem[] = nonGrossItems.map((li: any) => {
                    const savedAmount = li.amount !== null && li.amount !== undefined ? Number(li.amount) : 0;
                    return {
                      id: li.id || `rate_${Date.now()}_${Math.random()}`,
                      name: li.name,
                      basis: li.basis || "Gross Wages",
                      pricingModel: li.pricingModel || "Percentage",
                      rate: li.rate !== null && li.rate !== undefined ? Number(li.rate) : 0,
                      amount: savedAmount,
                      notes: li.notes || null,
                      customAmount: savedAmount,
                      includeInGrandTotal: li.includeInGrandTotal !== false,
                      isOneTime: Boolean(li.isOneTime),
                      isExcluded: false,
                    };
                  });
                  setRates(mappedRates);
                } else {
                  // Fallback: fetch practice rates
                  const ratesRes = await apiConnector({
                    url: `${prefundingEndpoints.RATES}?practiceId=${pid}&limit=1000`,
                    method: "GET",
                    credentials: true,
                  });
                  const allRates = ratesRes?.data?.rates || [];
                  setRates(allRates.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    basis: r.basis || "Gross Wages",
                    pricingModel: r.pricingModel || "Percentage",
                    rate: Number(r.rate) || 0,
                    amount: 0,
                    isOneTime: false,
                    isExcluded: false,
                  })));
                }
              }

              // All steps open/accessible: jump straight to summary so user can see full breakdown or any step
              setStep(4);
            }
          }
        } catch (err) {
          console.error("Failed to load existing invoice", err);
          toast.error("Failed to load existing invoice data");
        } finally {
          setLoading(false);
        }
      } else {
        // Reset wizard state when navigating directly to fresh calculation (e.g. from Sidebar)
        setStep(1);
        setEmployees([]);
        setRates([]);
        setGeneratedInvoice(null);
        setShowGeneratedModal(false);

        if (qPracticeId) {
          setSelectedPractice(qPracticeId);
        } else {
          setSelectedPractice("");
        }

        if (qCycle && qCycle !== "undefined" && qCycle !== "null") {
          setSelectedCycle(qCycle);
        } else {
          setSelectedCycle("");
          setCycleStartDate("");
          setCycleEndDate("");
        }
        setInvoiceDate("");
        setDueDate("");
      }
    };

    initData();
  }, [editingInvoiceId, searchParams]);

  // Determine working period hours considering employee dates & cycle period
  const calculateDefaultWorkingHours = (empJoinDateStr: string | null | undefined, budgetedHours: number) => {
    if (!cycleStartDate || !cycleEndDate) return budgetedHours;
    const start = new Date(cycleStartDate);
    const end = new Date(cycleEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return budgetedHours;

    const totalCycleDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    if (empJoinDateStr) {
      const join = new Date(empJoinDateStr);
      if (!isNaN(join.getTime())) {
        if (join > end) {
          return 0; // Hasn't joined yet
        }
        if (join > start) {
          // Joined mid-cycle: prorate working hours
          const activeDays = Math.max(1, Math.round((end.getTime() - join.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          const proration = Math.min(1, activeDays / totalCycleDays);
          return Math.round(budgetedHours * proration * 10) / 10;
        }
      }
    }
    return budgetedHours;
  };

  const loadEmployeesAndRates = async () => {
    if (!selectedPractice) return;

    // Practice Validation check before loading calculation
    setLoading(true);
    try {
      const valRes = await validatePracticeForPrefunding(selectedPractice);
      setPracticeValidation(valRes);

      if (!valRes.isValid) {
        toast.error("Practice fails configuration validation. Please resolve the errors in Practice Settings.");
        setLoading(false);
        return;
      }
    } catch (valErr) {
      console.warn("Validation error:", valErr);
    }

    try {
      // 1. Fetch practice details to get its persons
      const practiceRes = await apiConnector({ url: practiceEndpoints.GET(selectedPractice), method: "GET", credentials: true });
      const practicePersons = practiceRes?.data?.practice?.persons?.map((pp: any) => pp.person) || [];

      const mappedEmployees: EmployeeCalculationItem[] = practicePersons.map((p: any) => {
        const payRate = p.payRate ? Number(p.payRate) : 0;
        const budgetedHours = p.budgetedHours ? Number(p.budgetedHours) : 160;
        const bufferPercent = (p.bufferPercentage !== null && p.bufferPercentage !== undefined && Number(p.bufferPercentage) > 0)
          ? Number(p.bufferPercentage)
          : 10;
        const payType: "Hourly" | "Salary" = p.payType?.toLowerCase() === "hourly" ? "Hourly" : "Salary";

        // Step 4: Calculate applicable Working Period for this cycle
        const workingPeriodHours = calculateDefaultWorkingHours(p.dateOfJoining, budgetedHours);

        // Step 5: Calculate Base Wages & Gross Wages
        let baseWages = 0;
        if (payType === "Hourly") {
          baseWages = workingPeriodHours * payRate;
        } else {
          baseWages = (budgetedHours > 0 && workingPeriodHours !== budgetedHours)
            ? (workingPeriodHours / budgetedHours) * payRate
            : payRate;
        }

        const bufferAmount = baseWages * (bufferPercent / 100);
        const grossWages = Math.round((baseWages + bufferAmount) * 100) / 100;

        return {
          id: p.id,
          name: `${p.firstName} ${p.lastName}`.trim() || "Unnamed Employee",
          jobCategory: p.jobCategory || "General Staff",
          location: p.workLocation || "Main Location",
          state: p.state || "NY",
          joinDate: p.dateOfJoining ? new Date(p.dateOfJoining).toISOString().split("T")[0] : "N/A",
          payType,
          payRate,
          budgetedHours,
          bufferPercent,
          workingPeriodHours,
          baseWages: Math.round(baseWages * 100) / 100,
          grossWages,
          isExcluded: false,
        };
      });
      setEmployees(mappedEmployees);

      // 2. Fetch all rates assigned to this practice
      const ratesRes = await apiConnector({
        url: `${prefundingEndpoints.RATES}?practiceId=${selectedPractice}&limit=1000`,
        method: "GET",
        credentials: true,
      });
      const allRates = ratesRes?.data?.rates || [];
      const mappedRates: PrefundingRateCalculationItem[] = allRates.map((r: any) => ({
        id: r.id,
        name: r.name,
        basis: r.basis || "Gross Wages",
        pricingModel: r.pricingModel || "Percentage",
        rate: Number(r.rate) || 0,
        amount: 0,
        isOneTime: false,
        isExcluded: false,
      }));
      setRates(mappedRates);

      setStep(2);
    } catch (err) {
      console.error("Failed to load data", err);
      toast.error("Failed to load practice employees or rates");
    } finally {
      setLoading(false);
    }
  };

  const selectedPracticeObj = useMemo(() => {
    return practices.find((p) => p.value === selectedPractice) || null;
  }, [practices, selectedPractice]);

  const availableCycles = useMemo(() => {
    if (!selectedPracticeObj) {
      return generatePracticeCycles(null, "MONTHLY");
    }
    return generatePracticeCycles(
      selectedPracticeObj.prefundingStartDate,
      selectedPracticeObj.prefundingCycle
    );
  }, [selectedPracticeObj]);

  const handlePracticeChange = async (practiceId: string) => {
    setSelectedPractice(practiceId);
    setPracticeValidation(null);

    const p = practices.find((item) => item.value === practiceId);
    if (p) {
      const generated = generatePracticeCycles(p.prefundingStartDate, p.prefundingCycle);
      if (generated.length > 0) {
        setSelectedCycle(generated[0].value);
        setCycleStartDate(generated[0].startDate);
        setCycleEndDate(generated[0].endDate);

        // Calculate Due Date based on Due On (Days before start of cycle)
        if (generated[0].startDate) {
          const sDate = new Date(generated[0].startDate);
          if (!isNaN(sDate.getTime())) {
            const dueDays = p.prefundingDueOn !== undefined && p.prefundingDueOn !== null && p.prefundingDueOn !== ""
              ? Number(p.prefundingDueOn)
              : 5;
            const calcDue = new Date(sDate.getTime() - dueDays * 24 * 60 * 60 * 1000);
            setDueDate(calcDue.toISOString().split("T")[0]);
          }
        }
      } else {
        setSelectedCycle("");
        setCycleStartDate("");
        setCycleEndDate("");
        setDueDate("");
      }

      // Validate configuration for the selected practice
      setIsValidatingPractice(true);
      try {
        const valRes = await validatePracticeForPrefunding(practiceId);
        setPracticeValidation(valRes);
      } catch (err: any) {
        console.error("Practice validation check failed:", err);
      } finally {
        setIsValidatingPractice(false);
      }
    } else {
      setSelectedCycle("");
      setCycleStartDate("");
      setCycleEndDate("");
    }
  };

  const handleCycleChange = (val: string) => {
    setSelectedCycle(val);
    const found = availableCycles.find((c) => c.value === val);
    if (found) {
      setCycleStartDate(found.startDate);
      setCycleEndDate(found.endDate);

      // Re-calculate Due Date based on Due On (Days before start of cycle)
      if (found.startDate && selectedPracticeObj) {
        const sDate = new Date(found.startDate);
        if (!isNaN(sDate.getTime())) {
          const dueDays = selectedPracticeObj.prefundingDueOn !== undefined && selectedPracticeObj.prefundingDueOn !== null && selectedPracticeObj.prefundingDueOn !== ""
            ? Number(selectedPracticeObj.prefundingDueOn)
            : 5;
          const calcDue = new Date(sDate.getTime() - dueDays * 24 * 60 * 60 * 1000);
          setDueDate(calcDue.toISOString().split("T")[0]);
        }
      }
    }
  };

  // Employee editing (Section 9)
  const handleEmployeeFieldChange = (id: string, field: keyof EmployeeCalculationItem, val: any) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp;
        const updated = { ...emp, [field]: val };

        if (field === "grossWages") {
          updated.grossWages = Math.max(0, Number(val) || 0);
          updated.isCustomGrossWages = true;
          return updated;
        }

        if (
          field === "workingPeriodHours" ||
          field === "bufferPercent" ||
          field === "payRate" ||
          field === "payType" ||
          field === "budgetedHours"
        ) {
          const numRate = Math.max(0, Number(updated.payRate) || 0);
          const numHours = Math.max(0, Number(updated.workingPeriodHours) || 0);
          const numBudgeted = Math.max(0, Number(updated.budgetedHours) || 0);
          const numBuffer = Math.max(0, Number(updated.bufferPercent) || 0);

          if (field === "payRate") updated.payRate = numRate;
          if (field === "workingPeriodHours") updated.workingPeriodHours = numHours;
          if (field === "bufferPercent") updated.bufferPercent = numBuffer;

          let base = 0;
          if (updated.payType === "Hourly") {
            base = numHours * numRate;
          } else {
            base = (numBudgeted > 0 && numHours !== numBudgeted)
              ? (numHours / numBudgeted) * numRate
              : numRate;
          }
          const buffer = base * (numBuffer / 100);
          updated.baseWages = Math.round(base * 100) / 100;
          if (!updated.isCustomGrossWages) {
            updated.grossWages = Math.round((base + buffer) * 100) / 100;
          }
        }
        return updated;
      })
    );
  };

  // Employee removal & restoration (Section 9)
  const handleRemoveEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isExcluded: true } : e))
    );
    toast.success(`${emp?.name || "Employee"} excluded from this invoice calculation`);
  };

  const handleRestoreEmployee = (id: string) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isExcluded: false } : e))
    );
    toast.success("Employee restored to calculation");
  };

  const handleRestoreAllEmployees = () => {
    setEmployees((prev) => prev.map((e) => ({ ...e, isExcluded: false })));
    toast.success("All employees restored to calculation");
  };

  // Add Ad-Hoc employee for this calculation
  const handleAddCustomEmployee = () => {
    const errors: Record<string, string> = {};

    if (!newEmployeeName.trim()) {
      errors.name = "Employee full name is required";
    }

    const payRateNum = Number(newEmployeePayRate);
    if (newEmployeePayRate === "" || isNaN(payRateNum) || payRateNum <= 0) {
      errors.payRate = "Pay rate must be greater than 0";
    }

    const workingHoursNum = Number(newEmployeeBudgetedHours);
    if (newEmployeeBudgetedHours === "" || isNaN(workingHoursNum) || workingHoursNum <= 0) {
      errors.budgetedHours = "Working hours must be greater than 0";
    }

    if (Object.keys(errors).length > 0) {
      setEmployeeModalErrors(errors);
      return;
    }

    setEmployeeModalErrors({});
    const payRate = payRateNum;
    const workingHours = workingHoursNum;
    const buffer = Number(newEmployeeBufferPercent) || 0;
    const base = newEmployeePayType === "Hourly" ? workingHours * payRate : payRate;
    const gross = Math.round((base + base * (buffer / 100)) * 100) / 100;

    const newEmp: EmployeeCalculationItem = {
      id: `adhoc_${Date.now()}`,
      name: newEmployeeName.trim(),
      jobCategory: newEmployeeJobCategory === "CLINICAL" ? "Clinical" : newEmployeeJobCategory === "NON_CLINICAL" ? "Non-Clinical" : (newEmployeeJobCategory.trim() || "Staff"),
      location: newEmployeeLocation.trim() || "Main Location",
      state: newEmployeeState.trim() || "NY",
      joinDate: newEmployeeDateOfJoining ? new Date(newEmployeeDateOfJoining).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      payType: newEmployeePayType,
      payRate,
      budgetedHours: workingHours,
      bufferPercent: buffer,
      workingPeriodHours: workingHours,
      baseWages: Math.round(base * 100) / 100,
      grossWages: gross,
      isExcluded: false,
    };

    setEmployees((prev) => [...prev, newEmp]);
    setShowAddEmployeeModal(false);
    setNewEmployeeName("");
    setNewEmployeeJobCategory("CLINICAL");
    setNewEmployeeLocation("Main Clinic");
    setNewEmployeeState("NY");
    setNewEmployeeDateOfJoining(new Date().toISOString().split("T")[0]);
    setNewEmployeePayType("Hourly");
    setNewEmployeePayRate(25);
    setNewEmployeeBudgetedHours(160);
    setNewEmployeeBufferPercent(10);
    setEmployeeModalErrors({});
    toast.success("Employee added to this calculation");
  };

  // Active employees
  const activeEmployees = useMemo(() => {
    return employees.filter((e) => !e.isExcluded);
  }, [employees]);

  const excludedEmployees = useMemo(() => {
    return employees.filter((e) => e.isExcluded);
  }, [employees]);

  const totalGrossWages = useMemo(() => {
    return Math.round(activeEmployees.reduce((acc, emp) => acc + emp.grossWages, 0) * 100) / 100;
  }, [activeEmployees]);

  const totalBaseWages = useMemo(() => {
    return Math.round(activeEmployees.reduce((acc, emp) => acc + emp.baseWages, 0) * 100) / 100;
  }, [activeEmployees]);

  const totalEmployeesCount = activeEmployees.length;

  // Active rates calculation with dependency resolution
  const activeRates = useMemo(() => {
    return rates.filter((r) => !r.isExcluded);
  }, [rates]);

  const excludedRates = useMemo(() => {
    return rates.filter((r) => r.isExcluded);
  }, [rates]);

  // Multi-pass dependency resolution for prefunding rates
  const calculatedRates = useMemo(() => {
    const rateIdAmountMap: Record<string, number> = {};
    const rateNameAmountMap: Record<string, number> = {};

    const computeSingleRate = (rate: PrefundingRateCalculationItem) => {
      if (rate.customAmount !== undefined && rate.customAmount !== null) {
        return Number(rate.customAmount);
      }

      let amount = 0;
      const rateVal = Number(rate.rate) || 0;
      const basisList = (rate.basis || "")
        .split(",")
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);

      let baseAmount = 0;
      let includesGrossWages = false;
      let includesEmployees = false;
      let includesFlatFee = false;
      let hasLineItemDependency = false;

      basisList.forEach((b: string) => {
        if (b === "gross wages" || b === "gross wage") {
          baseAmount += totalGrossWages;
          includesGrossWages = true;
        } else if (b === "total employees" || b === "total employee" || b === "headcount") {
          includesEmployees = true;
        } else if (b === "flat fee" || b === "flat") {
          includesFlatFee = true;
        } else if (b === "grand total" || b === "grand_total") {
          // Computes based on Wages + all other active rates calculated so far
          const otherRatesSum = Object.values(rateIdAmountMap).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
          baseAmount += (totalGrossWages + otherRatesSum);
          includesGrossWages = true;
        } else if (
          b === "prefunding adjustments" ||
          b === "prefunding adjustments (subtotal)" ||
          b === "total prefunding adjustments" ||
          b === "gms projection" ||
          b === "gms projection (subtotal)" ||
          b === "total gms projection"
        ) {
          // Computes based on Wages + checked rates
          const checkedRatesSum = activeRates
            .filter((r) => r.includeInGrandTotal !== false && r.id !== rate.id)
            .reduce((acc, r) => acc + (rateIdAmountMap[r.id] ?? 0), 0);
          baseAmount += (totalGrossWages + checkedRatesSum);
          includesGrossWages = true;
        } else {
          // Line item dependency (e.g. "Medicare Tax")
          hasLineItemDependency = true;
          const match = activeRates.find(
            (r) => r.id === b || r.name.toLowerCase() === b
          );
          if (match) {
            const val = rateIdAmountMap[match.id] ?? rateNameAmountMap[match.name.toLowerCase()];
            if (val !== undefined) {
              baseAmount += val;
            }
          } else {
            const directMatchKey = Object.keys(rateNameAmountMap).find(
              (k) => k === b || k.includes(b) || b.includes(k)
            );
            if (directMatchKey && rateNameAmountMap[directMatchKey] !== undefined) {
              baseAmount += rateNameAmountMap[directMatchKey];
            }
          }
        }
      });

      const model = (rate.pricingModel || "").toLowerCase();

      if (includesFlatFee && model === "flat fee") {
        amount = rateVal;
      } else if (model === "percentage") {
        const base = (hasLineItemDependency || includesGrossWages)
          ? baseAmount
          : (baseAmount > 0 ? baseAmount : totalGrossWages);
        amount = base * (rateVal / 100);
      } else if (model === "flat fee") {
        if (includesEmployees) {
          amount = totalEmployeesCount * rateVal;
        } else {
          amount = rateVal;
        }
      } else if (model === "multiplication") {
        if (includesEmployees) {
          amount = totalEmployeesCount * rateVal;
        } else if (baseAmount > 0) {
          amount = baseAmount * rateVal;
        } else {
          amount = rateVal;
        }
      } else if (model === "division") {
        if (rateVal !== 0) {
          const base = (hasLineItemDependency || includesGrossWages) ? baseAmount : totalGrossWages;
          amount = base / rateVal;
        } else {
          amount = 0;
        }
      } else if (model === "subtraction") {
        amount = -Math.abs(rateVal);
      } else if (model === "addition") {
        amount = rateVal;
      } else {
        amount = rateVal;
      }

      return Math.round(amount * 100) / 100;
    };

    const passes = Math.max(1, activeRates.length);
    for (let pass = 0; pass < passes; pass++) {
      for (const rate of activeRates) {
        const computed = computeSingleRate(rate);
        rateIdAmountMap[rate.id] = computed;
        rateNameAmountMap[rate.name.toLowerCase()] = computed;
      }
    }

    return activeRates.map((rate) => ({
      ...rate,
      amount: rate.customAmount !== undefined && rate.customAmount !== null
        ? Number(rate.customAmount)
        : (rateIdAmountMap[rate.id] ?? computeSingleRate(rate)),
    }));
  }, [activeRates, totalGrossWages, totalEmployeesCount]);

  const checkedRates = useMemo(() => {
    return calculatedRates.filter((rate) => rate.includeInGrandTotal !== false);
  }, [calculatedRates]);

  const uncheckedRates = useMemo(() => {
    return calculatedRates.filter((rate) => rate.includeInGrandTotal === false);
  }, [calculatedRates]);

  const checkedRatesAmount = useMemo(() => {
    return Math.max(0, Math.round(checkedRates.reduce((acc, rate) => acc + rate.amount, 0) * 100) / 100);
  }, [checkedRates]);

  const prefundingSubtotal = useMemo(() => {
    return Math.max(0, Math.round((totalGrossWages + checkedRatesAmount) * 100) / 100);
  }, [totalGrossWages, checkedRatesAmount]);

  const uncheckedRatesAmount = useMemo(() => {
    return Math.max(0, Math.round(uncheckedRates.reduce((acc, rate) => acc + rate.amount, 0) * 100) / 100);
  }, [uncheckedRates]);

  const totalRatesAmount = useMemo(() => {
    return Math.max(0, Math.round(calculatedRates.reduce((acc, rate) => acc + rate.amount, 0) * 100) / 100);
  }, [calculatedRates]);

  const grandTotal = useMemo(() => {
    return Math.max(0, Math.round((totalGrossWages + totalRatesAmount) * 100) / 100);
  }, [totalGrossWages, totalRatesAmount]);

  // Drag and drop states for line items reordering within sections
  const [draggedCheckedRateId, setDraggedCheckedRateId] = useState<string | null>(null);
  const [dragOverCheckedRateId, setDragOverCheckedRateId] = useState<string | null>(null);

  const [draggedUncheckedRateId, setDraggedUncheckedRateId] = useState<string | null>(null);
  const [dragOverUncheckedRateId, setDragOverUncheckedRateId] = useState<string | null>(null);

  const handleDropCheckedRate = (targetId: string) => {
    if (!draggedCheckedRateId || draggedCheckedRateId === targetId) {
      setDraggedCheckedRateId(null);
      setDragOverCheckedRateId(null);
      return;
    }

    setRates((prev) => {
      const checkedSubset = prev.filter((r) => r.includeInGrandTotal !== false);
      const otherSubset = prev.filter((r) => r.includeInGrandTotal === false);

      const fromIndex = checkedSubset.findIndex((r) => r.id === draggedCheckedRateId);
      const toIndex = checkedSubset.findIndex((r) => r.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const updatedChecked = [...checkedSubset];
      const [moved] = updatedChecked.splice(fromIndex, 1);
      updatedChecked.splice(toIndex, 0, moved);

      return [...updatedChecked, ...otherSubset];
    });

    setDraggedCheckedRateId(null);
    setDragOverCheckedRateId(null);
  };

  const handleDropUncheckedRate = (targetId: string) => {
    if (!draggedUncheckedRateId || draggedUncheckedRateId === targetId) {
      setDraggedUncheckedRateId(null);
      setDragOverUncheckedRateId(null);
      return;
    }

    setRates((prev) => {
      const checkedSubset = prev.filter((r) => r.includeInGrandTotal !== false);
      const uncheckedSubset = prev.filter((r) => r.includeInGrandTotal === false);

      const fromIndex = uncheckedSubset.findIndex((r) => r.id === draggedUncheckedRateId);
      const toIndex = uncheckedSubset.findIndex((r) => r.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const updatedUnchecked = [...uncheckedSubset];
      const [moved] = updatedUnchecked.splice(fromIndex, 1);
      updatedUnchecked.splice(toIndex, 0, moved);

      return [...checkedSubset, ...updatedUnchecked];
    });

    setDraggedUncheckedRateId(null);
    setDragOverUncheckedRateId(null);
  };

  // Section 10.2 & 10.3: Add Additional Line Item
  const handleCreateAdditionalLineItem = async () => {
    const errors: Record<string, string> = {};

    if (!newLineItemName.trim()) {
      errors.name = "Line item name is required";
    }

    if (!newLineItemBasis) {
      errors.basis = "Please select a basis";
    }

    const rateNum = Number(newLineItemRate);
    if (newLineItemRate === "" || isNaN(rateNum) || rateNum < 0) {
      errors.rate = "Rate value must be greater than or equal to 0";
    }

    if (Object.keys(errors).length > 0) {
      setLineItemModalErrors(errors);
      return;
    }

    setLineItemModalErrors({});
    const validRateNum = Math.max(0, rateNum);
    const formattedBasis = newLineItemBasis.trim();
    setIsSavingLineItem(true);

    try {
      if (newLineItemStorageOption === "template") {
        // Option 1: Add to Prefunding Rates Template
        const createRes = await createPrefundingRate({
          name: newLineItemName.trim(),
          basis: formattedBasis,
          pricingModel: newLineItemPricingModel,
          rate: validRateNum,
          practiceIds: [selectedPractice],
        });

        const createdRate = createRes?.prefundingRate;
        const newRateItem: PrefundingRateCalculationItem = {
          id: createdRate?.id || `template_${Date.now()}`,
          name: newLineItemName.trim(),
          basis: formattedBasis,
          pricingModel: newLineItemPricingModel,
          rate: validRateNum,
          amount: 0,
          notes: newLineItemNotes.trim() || null,
          includeInGrandTotal: newLineItemIncludeInGrandTotal,
          isOneTime: false,
          isExcluded: false,
        };

        setRates((prev) => [...prev, newRateItem]);
        toast.success("Rate created and added to practice template for future cycles!");
      } else {
        // Option 2: One-Time Only
        const newRateItem: PrefundingRateCalculationItem = {
          id: `onetime_${Date.now()}`,
          name: newLineItemName.trim(),
          basis: formattedBasis,
          pricingModel: newLineItemPricingModel,
          rate: validRateNum,
          amount: 0,
          notes: newLineItemNotes.trim() || null,
          includeInGrandTotal: newLineItemIncludeInGrandTotal,
          isOneTime: true,
          isExcluded: false,
        };

        setRates((prev) => [...prev, newRateItem]);
        toast.success("One-time charge added to current invoice calculation!");
      }

      // Reset modal state
      setShowAddLineItemModal(false);
      setNewLineItemName("");
      setNewLineItemBasis("Gross Wages");
      setNewLineItemPricingModel("Percentage");
      setNewLineItemRate(10);
      setNewLineItemNotes("");
      setNewLineItemIncludeInGrandTotal(true);
      setNewLineItemStorageOption("onetime");
      setLineItemModalErrors({});
    } catch (err: any) {
      console.error("Failed to create line item", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to add line item");
    } finally {
      setIsSavingLineItem(false);
    }
  };

  // Section 10.1: Edit Line Item
  const handleOpenEditLineItem = (rate: PrefundingRateCalculationItem) => {
    setEditingLineItem(rate);
    setEditLineItemName(rate.name);
    setEditLineItemBasis(rate.basis ? rate.basis.trim() : "Gross Wages");
    setEditLineItemPricingModel(rate.pricingModel);
    setEditLineItemRate(rate.rate);
    setEditLineItemAmount(rate.amount);
    setEditLineItemNotes(rate.notes || "");
    setEditLineItemIncludeInGrandTotal(rate.includeInGrandTotal !== false);
    setShowEditLineItemModal(true);
  };

  const handleSaveEditedLineItem = () => {
    if (!editingLineItem) return;
    if (!editLineItemName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    const updatedRateNum = Math.max(0, Number(editLineItemRate) || 0);
    const customAmtNum = editLineItemAmount !== "" ? Math.max(0, Number(editLineItemAmount)) : null;
    const formattedBasis = editLineItemBasis.trim();

    setRates((prev) =>
      prev.map((r) => {
        if (r.id !== editingLineItem.id) return r;
        return {
          ...r,
          name: editLineItemName.trim(),
          basis: formattedBasis || r.basis,
          pricingModel: editLineItemPricingModel || r.pricingModel,
          rate: updatedRateNum,
          notes: editLineItemNotes.trim() || null,
          includeInGrandTotal: editLineItemIncludeInGrandTotal,
          customAmount: customAmtNum !== null && !isNaN(customAmtNum) ? customAmtNum : null,
        };
      })
    );

    setShowEditLineItemModal(false);
    setEditingLineItem(null);
    toast.success("Line item updated for this calculation");
  };

  // Section 11: Remove Line Item
  const handleRemoveLineItem = (id: string) => {
    const target = rates.find((r) => r.id === id);
    if (target?.isOneTime) {
      // One-time item can just be deleted from array
      setRates((prev) => prev.filter((r) => r.id !== id));
      toast.success(`"${target.name}" removed from invoice`);
    } else {
      // Template rate: exclude from this invoice calculation without deleting from DB
      setRates((prev) => prev.map((r) => (r.id === id ? { ...r, isExcluded: true } : r)));
      toast.success(`"${target?.name}" removed from current invoice (template preserved)`);
    }
  };

  const handleRestoreLineItem = (id: string) => {
    setRates((prev) => prev.map((r) => (r.id === id ? { ...r, isExcluded: false } : r)));
    toast.success("Rate restored to calculation");
  };

  // Dynamic basis options including other line items
  const dynamicBasisOptions = useMemo(() => {
    const options = [...BASE_BASIS_OPTIONS];
    activeRates.forEach((r) => {
      if (!options.some((o) => o.value.toLowerCase() === r.name.toLowerCase())) {
        options.push({ value: r.name, label: `${r.name} (Line Item)` });
      }
    });
    return options;
  }, [activeRates]);

  // Final Generate or Update Invoice (Step 7)
  const generateInvoice = async () => {
    setSubmitting(true);
    try {
      // Section 17: Due Date calculation based on Due On (Days before start of cycle)
      let calculatedDueDate = dueDate ? new Date(dueDate) : (cycleEndDate ? new Date(cycleEndDate) : new Date(new Date().setDate(new Date().getDate() + 30)));
      if (!dueDate && cycleStartDate) {
        const startDate = new Date(cycleStartDate);
        if (!isNaN(startDate.getTime())) {
          const dueOnDays = selectedPracticeObj?.prefundingDueOn !== undefined && selectedPracticeObj?.prefundingDueOn !== null && selectedPracticeObj?.prefundingDueOn !== ""
            ? Number(selectedPracticeObj.prefundingDueOn)
            : 5;
          calculatedDueDate = new Date(startDate.getTime() - dueOnDays * 24 * 60 * 60 * 1000);
        }
      }

      const effectiveInvoiceDate = invoiceDate ? new Date(invoiceDate) : (cycleStartDate ? new Date(cycleStartDate) : new Date());

      // Build employee breakdown snapshot to persist overrides
      const employeeSnapshot: Record<string, any> = {};
      employees.forEach((emp) => {
        employeeSnapshot[emp.id] = {
          payType: emp.payType,
          payRate: emp.payRate,
          budgetedHours: emp.budgetedHours,
          bufferPercent: emp.bufferPercent,
          workingPeriodHours: emp.workingPeriodHours,
          grossWages: emp.grossWages,
          isCustomGrossWages: Boolean(emp.isCustomGrossWages),
          isExcluded: Boolean(emp.isExcluded),
        };
      });

      const payload = {
        practiceId: selectedPractice,
        cycle: selectedCycle,
        invoiceDate: effectiveInvoiceDate.toISOString(),
        dueDate: calculatedDueDate.toISOString(),
        totalAmount: grandTotal,
        lineItems: [
          // Primary line item representing Employee Gross Wages with serialized snapshot
          {
            name: `Gross Wages (${activeEmployees.length} Employee${activeEmployees.length === 1 ? "" : "s"})`,
            basis: "Gross Wages",
            pricingModel: "Addition",
            rate: totalGrossWages,
            amount: totalGrossWages,
            notes: JSON.stringify({ employees: employeeSnapshot }),
            includeInGrandTotal: true,
            sequence: 0,
            isOneTime: false,
          },
          // Checked rates in user's reordered sequence
          ...checkedRates.map((r, idx) => ({
            name: r.name,
            basis: r.basis,
            pricingModel: r.pricingModel,
            rate: r.rate,
            amount: r.amount,
            notes: r.notes || null,
            includeInGrandTotal: true,
            sequence: idx + 1,
            isOneTime: Boolean(r.isOneTime),
          })),
          // Unchecked rates in user's reordered sequence
          ...uncheckedRates.map((r, idx) => ({
            name: r.name,
            basis: r.basis,
            pricingModel: r.pricingModel,
            rate: r.rate,
            amount: r.amount,
            notes: r.notes || null,
            includeInGrandTotal: false,
            sequence: checkedRates.length + idx + 1,
            isOneTime: Boolean(r.isOneTime),
          })),
        ],
      };

      if (editingInvoiceId) {
        const updateRes = await updatePrefundingInvoice(editingInvoiceId, payload);
        const inv = updateRes?.prefundingInvoice || updateRes?.invoice || updateRes;
        const year = new Date().getFullYear();
        const code = inv?.id ? inv.id.replace(/-/g, "").slice(0, 5).toUpperCase() : "001";
        const invoiceNumber = inv?.invoiceNumber || `INV-${year}-${code}`;

        setGeneratedInvoice({
          id: inv?.id || editingInvoiceId,
          invoiceNumber,
          totalAmount: grandTotal,
          cycle: selectedCycle,
          dueDate: dueDate || cycleEndDate || "In 30 days",
        });

        setShowGeneratedModal(true);
        toast.success("Prefunding Invoice Updated Successfully!");
      } else {
        const res = await apiConnector({
          url: prefundingEndpoints.INVOICES,
          method: "POST",
          body: payload,
          credentials: true,
        });

        const inv = res?.data?.prefundingInvoice;
        const year = new Date().getFullYear();
        const code = inv?.id ? inv.id.replace(/-/g, "").slice(0, 5).toUpperCase() : "001";
        const invoiceNumber = `INV-${year}-${code}`;

        setGeneratedInvoice({
          id: inv?.id,
          invoiceNumber,
          totalAmount: grandTotal,
          cycle: selectedCycle,
          dueDate: cycleEndDate || "In 30 days",
        });

        setShowGeneratedModal(true);
        toast.success("Prefunding Invoice Generated Successfully!");
      }
    } catch (err: any) {
      console.error("Failed to save prefunding invoice", err);
      toast.error(err?.response?.data?.message || err?.message || (editingInvoiceId ? "Failed to update invoice" : "Failed to generate invoice"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetCalculationWizard = () => {
    setShowGeneratedModal(false);
    setGeneratedInvoice(null);
    setStep(1);
    setSelectedPractice("");
    setSelectedCycle("");
    setCycleStartDate("");
    setCycleEndDate("");
    setEmployees([]);
    setRates([]);
  };

  return (
    <AppLayout title="Calculate Prefunding" activeModule="Prefunding" navbarActions={navbarActions}>
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0ece6]">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-[#4f63ea]" />
                Calculate Prefunding
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Configure employee wages, apply prefunding rate line items, and generate invoices
              </p>
            </div>
            {step > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                {step < 4 && (
                  <button
                    onClick={() => setStep((s) => Math.min(4, s + 1))}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#4f63ea] hover:bg-[#3d4ecf] rounded-lg transition-colors"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Top Horizontal Stepper Bar */}
          <div className="border-b border-[#f0ece6] bg-[#fcfaf8] px-4 sm:px-6 py-3 sticky top-0 z-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Stepper items - horizontal scrollable on mobile without wrapping awkwardly */}
              <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { num: 1, label: "Setup", desc: "Practice & cycle", icon: Calendar },
                  { num: 2, label: "Employees & Wages", desc: "Periods & wages", icon: Users },
                  { num: 3, label: "Prefunding Rates", desc: "Line items", icon: Calculator },
                  { num: 4, label: editingInvoiceId ? "Summary & Update" : "Summary & Generate", desc: "Grand total", icon: FileText },
                ].map((s, i) => (
                  <div
                    key={s.num}
                    onClick={() => {
                      // Allow opening any step when editing or when practice is loaded
                      if (editingInvoiceId || step >= s.num || employees.length > 0) {
                        setStep(s.num);
                      }
                    }}
                    className={`flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer group`}
                  >
                    <div
                      className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs font-bold transition-all shrink-0 ${
                        step === s.num
                          ? "bg-[#4f63ea] text-white ring-4 ring-[#4f63ea]/20 shadow-xs"
                          : (editingInvoiceId || step > s.num)
                          ? "bg-[#4f63ea] text-white"
                          : "border border-slate-300 bg-white text-slate-400"
                      }`}
                    >
                      {(editingInvoiceId && step !== s.num) || step > s.num ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        s.num
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-xs font-semibold block transition-colors leading-tight ${
                          step === s.num
                            ? "text-[#4f63ea]"
                            : (editingInvoiceId || step > s.num)
                            ? "text-slate-800 group-hover:text-[#4f63ea]"
                            : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                      <span className="text-[10px] text-slate-400 hidden xl:block">
                        {s.desc}
                      </span>
                    </div>
                    {i < 3 && (
                      <div className="w-4 sm:w-8 lg:w-10 h-[1.5px] bg-slate-200 ml-1 sm:ml-2 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Running Total Quick Summary Badge at Top */}
              {step > 1 && (
                <div className="flex items-center gap-2 sm:gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs self-start md:self-auto overflow-x-auto shrink-0">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-slate-500">Staff:</span>
                    <span className="font-bold text-slate-800">{activeEmployees.length}</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-slate-500">Wages:</span>
                    <span className="font-semibold text-slate-800">
                      ${totalGrossWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-slate-500">Adjustments:</span>
                    <span className="font-semibold text-slate-800">
                      ${totalRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-[#4f63ea] font-bold">Total:</span>
                    <span className="text-[#4f63ea] font-black">
                      ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Main Content Panel */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white">
              {/* Skeleton loading when opening an existing draft invoice */}
              {editingInvoiceId && loading ? (
                <div className="mx-auto space-y-6 animate-pulse">
                  {/* Top Notification Banner Skeleton */}
                  <div className="h-16 w-full rounded-xl bg-slate-100 border border-slate-200" />

                  {/* Step 1 Setup Criteria Card Skeleton */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200" />
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                      </div>
                      <div className="h-5 w-24 bg-slate-200 rounded" />
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                        <div className="h-10 w-full bg-slate-100 rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-24 bg-slate-200 rounded" />
                        <div className="h-10 w-full bg-slate-100 rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                        <div className="h-10 w-full bg-slate-100 rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                        <div className="h-10 w-full bg-slate-100 rounded-lg" />
                      </div>
                    </div>
                  </div>

                  {/* Table Skeleton (Employees / Calculations) */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200" />
                        <div className="h-4 w-40 bg-slate-200 rounded" />
                      </div>
                      <div className="h-8 w-32 bg-slate-200 rounded-lg" />
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Table Header row */}
                      <div className="grid grid-cols-6 gap-4 pb-3 border-b border-slate-100">
                        <div className="h-3 bg-slate-200 rounded col-span-2" />
                        <div className="h-3 bg-slate-200 rounded" />
                        <div className="h-3 bg-slate-200 rounded" />
                        <div className="h-3 bg-slate-200 rounded" />
                        <div className="h-3 bg-slate-200 rounded" />
                      </div>
                      {/* Table items rows */}
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="grid grid-cols-6 gap-4 py-3 border-b border-slate-50 items-center">
                          <div className="space-y-1.5 col-span-2">
                            <div className="h-4 w-3/4 bg-slate-200 rounded" />
                            <div className="h-3 w-1/2 bg-slate-100 rounded" />
                          </div>
                          <div className="h-4 bg-slate-100 rounded" />
                          <div className="h-4 bg-slate-100 rounded" />
                          <div className="h-4 bg-slate-100 rounded" />
                          <div className="h-4 bg-slate-200 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary / Grand Total Card Skeleton */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                      <div className="h-8 w-44 bg-slate-200 rounded" />
                    </div>
                    <div className="h-10 w-36 bg-slate-200 rounded-lg" />
                  </div>
                </div>
              ) : (
                <div className="mx-auto space-y-8">
                {/* ======================================================== */}
                {/* STEP 1: SETUP CRITERIA */}
                {/* ======================================================== */}
                <div
                  className={`bg-white rounded-xl border ${
                    step >= 1 ? "border-[#e8e4dc]" : "border-transparent opacity-50 pointer-events-none"
                  } shadow-xs overflow-hidden transition-all`}
                >
                  <div className="bg-slate-50/70 px-6 py-4 border-b border-[#e8e4dc] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4f63ea] text-white text-xs font-bold">
                        1
                      </span>
                      <h2 className="text-[15px] font-semibold text-slate-800">Setup Criteria</h2>
                    </div>
                    {step > 1 && (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md flex items-center gap-1 border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> Configured
                      </span>
                    )}
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Select Practice <span className="text-red-500">*</span>
                      </label>
                      <Select
                        options={practices}
                        value={selectedPractice}
                        onChange={handlePracticeChange}
                        placeholder="Choose a practice with prefunding..."
                        disabled={submitting}
                      />
                      {selectedPracticeObj && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span>
                            Cycle Type:{" "}
                            <strong className="text-slate-700 font-semibold">
                              {selectedPracticeObj.prefundingCycle || "MONTHLY"}
                            </strong>
                          </span>
                          {selectedPracticeObj.prefundingStartDate && (
                            <>
                              <span>•</span>
                              <span>
                                Anchor Start:{" "}
                                <strong className="text-slate-700 font-semibold">
                                  {selectedPracticeObj.prefundingStartDate.split("T")[0]}
                                </strong>
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Prefunding Cycle <span className="text-red-500">*</span>
                      </label>
                      <Select
                        options={availableCycles}
                        value={selectedCycle}
                        onChange={handleCycleChange}
                        placeholder="Choose from next 12 cycles..."
                        disabled={submitting || !selectedPractice}
                      />
                      <p className="text-xs text-slate-400 mt-1.5">Displaying next 12 configured cycles</p>
                    </div>

                    {selectedCycle && (
                      <>
                        <div>
                          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                            Cycle Start Date
                          </label>
                          <DatePicker
                            value={cycleStartDate}
                            onChange={(val) => setCycleStartDate(val)}
                            disabled={submitting}
                            placeholder="MM-DD-YYYY"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                            Cycle End Date
                          </label>
                          <DatePicker
                            value={cycleEndDate}
                            onChange={(val) => setCycleEndDate(val)}
                            disabled={submitting}
                            placeholder="MM-DD-YYYY"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                            Invoice Due Date (Due On Days Before Start)
                          </label>
                          <DatePicker
                            value={dueDate}
                            onChange={(val) => setDueDate(val)}
                            disabled={submitting}
                            placeholder="MM-DD-YYYY"
                          />
                          {selectedPracticeObj?.prefundingDueOn !== undefined && (
                            <p className="text-[11px] text-slate-400 mt-1">
                              Calculated as {selectedPracticeObj.prefundingDueOn || 5} days before cycle start date
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Practice Validation Banner */}
                  {selectedPractice && (
                    <div className="px-6 py-3 border-t border-[#e8e4dc]">
                      {isValidatingPractice ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                          <Loader2 className="w-4 h-4 animate-spin text-[#4f63ea]" />
                          <span>Checking Practice Configuration Validation...</span>
                        </div>
                      ) : practiceValidation ? (
                        practiceValidation.isValid ? (
                          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-semibold text-emerald-900">
                                Practice Validation Passed
                              </div>
                              <div className="text-emerald-700 mt-0.5">
                                All required Prefunding parameters (Cycle, Start Date, Due/Reminder, State, Recipient, Rates & Stripe account) are properly configured.
                              </div>
                              {practiceValidation.warnings && practiceValidation.warnings.length > 0 && (
                                <ul className="list-disc pl-4 mt-1 text-emerald-800 space-y-0.5">
                                  {practiceValidation.warnings.map((w, idx) => (
                                    <li key={idx}>{w}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                            <div className="flex items-center gap-2 font-semibold text-red-900 mb-1.5">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                              <span>Practice Configuration Incomplete</span>
                            </div>
                            <p className="text-red-700 mb-2 leading-relaxed">
                              This Practice cannot be used for Prefunding calculations until the following required configuration items are resolved in Practice Settings:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-red-800 font-medium">
                              {practiceValidation.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                            <div className="mt-3 pt-2 border-t border-red-200/80">
                              <span className="text-[11px] text-red-600">
                                Open <strong>Practices &rarr; Edit Practice &rarr; Prefunding Setup</strong> to complete configuration.
                              </span>
                            </div>
                          </div>
                        )
                      ) : null}
                    </div>
                  )}

                  <div className="px-6 py-4 bg-slate-50 border-t border-[#e8e4dc] flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {editingInvoiceId ? "Invoice configuration loaded from saved draft" : "Select practice and cycle to load prefunding details"}
                    </span>
                    <button
                      onClick={loadEmployeesAndRates}
                      disabled={!selectedPractice || !selectedCycle || loading || submitting || (practiceValidation !== null && !practiceValidation.isValid)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#4f63ea] hover:bg-[#3d4ecf] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load Employees & Rates"}
                      {!loading && <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* STEP 2: EMPLOYEES & WAGES (Sections 8.2 Steps 3, 4, 5 & 9) */}
                {/* ======================================================== */}
                {step >= 2 && (
                  <div className="bg-white rounded-xl border border-[#e8e4dc] shadow-xs overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-slate-50/70 px-6 py-4 border-b border-[#e8e4dc] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4f63ea] text-white text-xs font-bold">
                          2
                        </span>
                        <div>
                          <h2 className="text-[15px] font-semibold text-slate-800">
                            Employees & Working Periods
                          </h2>
                          <p className="text-xs text-slate-500">
                            Review working periods, pay rates, buffer %, and gross wages (editable)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAddEmployeeModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-2xs"
                        >
                          <Plus className="h-3.5 w-3.5 text-[#4f63ea]" />
                          Add Employee
                        </button>
                        {step > 2 && (
                          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-200">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {activeEmployees.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-medium text-slate-700">No active employees in this calculation</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Add an employee or restore excluded employees below
                          </p>
                        </div>
                      ) : (
                        <table className="w-full text-[13px] text-left">
                          <thead className="bg-slate-50/90 text-slate-500 font-semibold text-xs border-b border-[#e8e4dc]">
                            <tr>
                              <th className="px-5 py-3">Employee Details</th>
                              <th className="px-4 py-3">Pay Type</th>
                              <th className="px-4 py-3">Pay Rate ($)</th>
                              <th className="px-4 py-3">Working Period (Hrs)</th>
                              <th className="px-4 py-3">Buffer %</th>
                              <th className="px-4 py-3">Base Wages ($)</th>
                              <th className="px-4 py-3">Gross Wages ($)</th>
                              <th className="px-3 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e8e4dc]">
                            {activeEmployees.map((emp) => {
                              const bufferAmt = Math.round((emp.baseWages * (emp.bufferPercent / 100)) * 100) / 100;

                              return (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3.5 align-middle">
                                    <div className="font-medium text-slate-800">{emp.name}</div>
                                    <div className="text-slate-500 text-xs flex items-center gap-1.5 mt-0.5">
                                      <span>{emp.jobCategory}</span>
                                      <span>•</span>
                                      <span>{emp.location} ({emp.state})</span>
                                      <span>•</span>
                                      <span>Joined: {emp.joinDate}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    <div className="w-28">
                                      <Select
                                        options={[
                                          { value: "Hourly", label: "Hourly" },
                                          { value: "Salary", label: "Salary" },
                                        ]}
                                        value={emp.payType}
                                        onChange={(val) =>
                                          handleEmployeeFieldChange(emp.id, "payType", val as "Hourly" | "Salary")
                                        }
                                        className="!py-1 !text-xs !rounded-lg"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    <div className="relative w-24">
                                      <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-medium">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        onKeyDown={(e) => {
                                          if (e.key === "-" || e.key === "e") e.preventDefault();
                                        }}
                                        className="w-full h-8 rounded-lg border border-slate-300 bg-white pl-6 pr-2 py-1 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                        value={emp.payRate}
                                        onChange={(e) => handleEmployeeFieldChange(emp.id, "payRate", e.target.value)}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    <input
                                      type="number"
                                      min="0"
                                      onKeyDown={(e) => {
                                        if (e.key === "-" || e.key === "e") e.preventDefault();
                                      }}
                                      className="w-20 h-8 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                      value={emp.workingPeriodHours}
                                      onChange={(e) =>
                                        handleEmployeeFieldChange(emp.id, "workingPeriodHours", e.target.value)
                                      }
                                    />
                                    <span className="text-[11px] text-slate-400 block mt-0.5">
                                      Budgeted: {emp.budgetedHours}h
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => {
                                          if (e.key === "-" || e.key === "e") e.preventDefault();
                                        }}
                                        className="w-16 h-8 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                        value={emp.bufferPercent}
                                        onChange={(e) => handleEmployeeFieldChange(emp.id, "bufferPercent", e.target.value)}
                                      />
                                      <span className="text-xs text-slate-400 font-medium">%</span>
                                    </div>
                                    <span className="text-[11px] text-emerald-600 block mt-0.5 font-medium">
                                      +${bufferAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 align-middle text-slate-700 font-medium">
                                    ${emp.baseWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    <div className="relative w-28">
                                      <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-semibold">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        onKeyDown={(e) => {
                                          if (e.key === "-" || e.key === "e") e.preventDefault();
                                        }}
                                        className="w-full h-8 rounded-lg border border-slate-300 bg-slate-50/50 pl-6 pr-2 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                        value={emp.grossWages}
                                        onChange={(e) => handleEmployeeFieldChange(emp.id, "grossWages", e.target.value)}
                                      />
                                    </div>
                                    {emp.isCustomGrossWages && (
                                      <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                                        Manual override
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3.5 align-middle text-center">
                                    <button
                                      onClick={() => handleRemoveEmployee(emp.id)}
                                      title="Exclude from current invoice calculation"
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50/80 font-semibold text-slate-800 border-t border-[#e8e4dc]">
                            <tr>
                              <td colSpan={5} className="px-5 py-3.5 text-right text-xs text-slate-600">
                                Total Gross Wages ({activeEmployees.length} Active Employees):
                              </td>
                              <td className="px-4 py-3.5 text-xs text-slate-700">
                                ${totalBaseWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3.5 text-emerald-600 font-bold text-sm">
                                ${totalGrossWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>

                    {/* Excluded Employees Banner (Section 9) */}
                    {excludedEmployees.length > 0 && (
                      <div className="p-4 bg-amber-50/60 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <strong>{excludedEmployees.length}</strong> employee(s) excluded from this invoice
                            (practice profile remains untouched):
                          </span>
                          <div className="flex flex-wrap gap-1.5 ml-2">
                            {excludedEmployees.map((e) => (
                              <button
                                key={e.id}
                                onClick={() => handleRestoreEmployee(e.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-300 rounded-md text-amber-900 hover:bg-amber-100 transition-colors text-[11px]"
                              >
                                {e.name}
                                <RotateCcw className="w-3 h-3 text-amber-700" />
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={handleRestoreAllEmployees}
                          className="font-semibold text-amber-900 hover:underline shrink-0"
                        >
                          Restore All
                        </button>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="px-6 py-4 bg-slate-50 border-t border-[#e8e4dc] flex items-center justify-between">
                        <button
                          onClick={() => setStep(1)}
                          className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back to Setup
                        </button>
                        <button
                          onClick={() => setStep(3)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#4f63ea] hover:bg-[#3d4ecf] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                        >
                          Continue to Prefunding Rates
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 3: PREFUNDING RATES (Sections 8.2 Step 6, 10 & 11) */}
                {/* ======================================================== */}
                {step >= 3 && (
                  <div className="bg-white rounded-xl border border-[#e8e4dc] shadow-xs overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-slate-50/70 px-6 py-4 border-b border-[#e8e4dc] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4f63ea] text-white text-xs font-bold">
                          3
                        </span>
                        <div>
                          <h2 className="text-[15px] font-semibold text-slate-800">
                            Prefunding Rates & Line Items
                          </h2>
                          <p className="text-xs text-slate-500">
                            Applied practice rates, manual additions (Option 1 template / Option 2 one-time), and line item edits
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAddLineItemModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4f63ea] hover:bg-[#3d4ecf] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Line Item
                        </button>
                        {step > 3 && (
                          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-200">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {calculatedRates.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-medium text-slate-700">No applicable rates for this calculation</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Click "+ Add Line Item" above to add template or one-time line items
                          </p>
                        </div>
                      ) : (
                        <table className="w-full text-[13px] text-left">
                          <thead className="bg-[#fbfaf8] text-slate-500 font-semibold text-xs border-b border-[#ece8e1]">
                            <tr>
                              <th className="w-8 px-2 py-3 text-center"></th>
                              <th className="px-5 py-3">Rate / Line Item</th>
                              <th className="px-5 py-3">Basis</th>
                              <th className="px-5 py-3">Pricing Model</th>
                              <th className="px-5 py-3">Rate</th>
                              <th className="px-5 py-3">Calculated Amount</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-3 py-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ece8e1]">
                            {checkedRates.map((rate) => {
                              const isDragging = draggedCheckedRateId === rate.id;
                              const isDragOver = dragOverCheckedRateId === rate.id;

                              return (
                                <tr
                                  key={rate.id}
                                  draggable
                                  onDragStart={(e) => {
                                    setDraggedCheckedRateId(rate.id);
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    if (dragOverCheckedRateId !== rate.id) {
                                      setDragOverCheckedRateId(rate.id);
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverCheckedRateId === rate.id) {
                                      setDragOverCheckedRateId(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleDropCheckedRate(rate.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedCheckedRateId(null);
                                    setDragOverCheckedRateId(null);
                                  }}
                                  className={`transition-colors ${
                                    isDragging ? "opacity-40 bg-indigo-50/50" : isDragOver ? "border-t-2 border-[#4f63ea] bg-indigo-50/30" : "hover:bg-slate-50/50"
                                  }`}
                                >
                                  {/* Drag Handle */}
                                  <td className="w-8 px-2 py-4 align-middle text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                                    <div className="flex items-center justify-center">
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 align-middle font-semibold text-slate-800">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{rate.name}</span>
                                    </div>
                                    {rate.notes && (
                                      <div className="text-[11px] text-slate-500 font-normal italic flex items-center gap-1 mt-0.5">
                                        <span className="text-slate-400 font-medium not-italic">Note:</span> {rate.notes}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-5 py-4 align-middle text-slate-700">
                                    <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                      {rate.basis}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 align-middle">
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getPricingModelColorClass(
                                        rate.pricingModel
                                      )}`}
                                    >
                                      {rate.pricingModel}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 align-middle text-slate-700 font-medium">
                                    {rate.pricingModel === "Percentage"
                                      ? `${rate.rate}%`
                                      : rate.pricingModel === "Multiplication"
                                      ? `x${rate.rate}`
                                      : rate.pricingModel === "Division"
                                      ? `/${rate.rate}`
                                      : `$${rate.rate}`}
                                  </td>
                                  <td className="px-5 py-4 align-middle font-bold text-slate-900">
                                    ${rate.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    {rate.customAmount !== undefined && rate.customAmount !== null && (
                                      <span className="text-[10px] text-amber-600 font-medium block">
                                        Custom override
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 align-middle">
                                    {rate.isOneTime ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-semibold">
                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                        One-Time
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold">
                                        <Layers className="w-3 h-3 text-blue-500" />
                                        Template
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-4 align-middle text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditLineItem(rate)}
                                        title="Edit line item values"
                                        className="p-1.5 text-slate-400 hover:text-[#4f63ea] hover:bg-[#f0f2fe] rounded-md transition-colors"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveLineItem(rate.id)}
                                        title="Remove from current invoice"
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-[#fbfaf8] font-semibold text-slate-800 border-t border-[#ece8e1]">
                            {/* GMS Projection (Gross Wages + Checked Adjustments) */}
                            <tr className="bg-slate-50/80 border-t border-[#ece8e1]">
                              <td colSpan={5} className="px-6 py-3.5 text-right text-xs text-slate-700 font-semibold">
                                GMS Projection:
                                <div className="text-[11px] text-slate-500 font-normal">
                                  Gross Wages (${totalGrossWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) + Adjustments (${checkedRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-indigo-700 font-bold text-sm">
                                ${prefundingSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td colSpan={2}></td>
                            </tr>

                            {/* Unchecked Line Items (shown after Total Prefunding Adjustments) */}
                            {uncheckedRates.map((rate) => {
                              const isDragging = draggedUncheckedRateId === rate.id;
                              const isDragOver = dragOverUncheckedRateId === rate.id;

                              return (
                                <tr
                                  key={rate.id}
                                  draggable
                                  onDragStart={(e) => {
                                    setDraggedUncheckedRateId(rate.id);
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    if (dragOverUncheckedRateId !== rate.id) {
                                      setDragOverUncheckedRateId(rate.id);
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverUncheckedRateId === rate.id) {
                                      setDragOverUncheckedRateId(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleDropUncheckedRate(rate.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedUncheckedRateId(null);
                                    setDragOverUncheckedRateId(null);
                                  }}
                                  className={`border-t border-[#ece8e1] bg-slate-50/30 text-[13px] font-normal transition-colors ${
                                    isDragging ? "opacity-40 bg-amber-50/50" : isDragOver ? "border-t-2 border-amber-500 bg-amber-50/30" : "hover:bg-slate-50/60"
                                  }`}
                                >
                                  {/* Drag Handle */}
                                  <td className="w-8 px-2 py-3.5 align-middle text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                                    <div className="flex items-center justify-center">
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 align-middle font-semibold text-slate-800">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{rate.name}</span>
                                    </div>
                                    {rate.notes && (
                                      <div className="text-[11px] text-slate-500 font-normal italic flex items-center gap-1 mt-0.5">
                                        <span className="text-slate-400 font-medium not-italic">Note:</span> {rate.notes}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 align-middle text-slate-700">
                                    <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                      {rate.basis}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 align-middle">
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getPricingModelColorClass(
                                        rate.pricingModel
                                      )}`}
                                    >
                                      {rate.pricingModel}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 align-middle text-slate-700 font-medium">
                                    {rate.pricingModel === "Percentage"
                                      ? `${rate.rate}%`
                                      : rate.pricingModel === "Multiplication"
                                      ? `x${rate.rate}`
                                      : rate.pricingModel === "Division"
                                      ? `/${rate.rate}`
                                      : `$${rate.rate}`}
                                  </td>
                                  <td className="px-5 py-3.5 align-middle font-bold text-slate-900">
                                    ${rate.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    {rate.customAmount !== undefined && rate.customAmount !== null && (
                                      <span className="text-[10px] text-amber-600 font-medium block">
                                        Custom override
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    {rate.isOneTime ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-semibold">
                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                        One-Time
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold">
                                        <Layers className="w-3 h-3 text-blue-500" />
                                        Template
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3.5 align-middle text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditLineItem(rate)}
                                        title="Edit line item values"
                                        className="p-1.5 text-slate-400 hover:text-[#4f63ea] hover:bg-[#f0f2fe] rounded-md transition-colors"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveLineItem(rate.id)}
                                        title="Remove from current invoice"
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Final Total Grand Total row */}
                            <tr className="border-t border-[#e2ded6] bg-white">
                              <td colSpan={5} className="px-6 py-4 text-right">
                                <div className="text-xs font-bold text-[#4f63ea] uppercase tracking-wide">
                                  Total Grand Total:
                                </div>
                                <div className="text-[11px] text-slate-500 font-normal">
                                  {uncheckedRates.length > 0 ? (
                                    <>
                                      GMS Projection (${prefundingSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) + Additional Line Items (${uncheckedRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                    </>
                                  ) : (
                                    <>
                                      GMS Projection (${prefundingSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-[#4f63ea] font-black text-base">
                                ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>

                    {/* Excluded Template Rates Notice (Section 11) */}
                    {excludedRates.length > 0 && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Info className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            Template rates excluded from this invoice:
                          </span>
                          <div className="flex flex-wrap gap-1.5 ml-2">
                            {excludedRates.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => handleRestoreLineItem(r.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-300 rounded-md text-slate-800 hover:bg-slate-100 transition-colors text-[11px]"
                              >
                                {r.name}
                                <RotateCcw className="w-3 h-3 text-[#4f63ea]" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="px-6 py-4 bg-slate-50 border-t border-[#e8e4dc] flex items-center justify-between">
                        <button
                          onClick={() => setStep(2)}
                          className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back to Employees
                        </button>
                        <button
                          onClick={() => setStep(4)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#4f63ea] hover:bg-[#3d4ecf] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                        >
                          Calculate Grand Total & Review
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 4: SUMMARY & GENERATE (Sections 8.2 Step 7) */}
                {/* ======================================================== */}
                {step === 4 && (
                  <div className="bg-white rounded-xl border border-[#4f63ea]/30 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-[#f0f2fe] px-6 py-5 border-b border-[#4f63ea]/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4f63ea] text-white text-xs font-bold">
                          4
                        </span>
                        <div>
                          <h2 className="text-[15px] font-semibold text-slate-800">
                            Summary & Generate Invoice
                          </h2>
                          <p className="text-xs text-slate-500">
                            Review employee gross wages, GMS Projection, and final grand total before posting
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={generateInvoice}
                        disabled={submitting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#4f63ea] hover:bg-[#3d4ecf] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                        {submitting ? (editingInvoiceId ? "Updating..." : "Generating...") : (editingInvoiceId ? "Update Invoice" : "Generate Invoice")}
                      </button>
                    </div>

                    <div className="p-8 space-y-6">
                      {/* Formula Visual Banner */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex flex-wrap items-center justify-around gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Employee Gross Wages</p>
                          <p className="text-lg font-bold text-slate-800 mt-0.5">
                            ${totalGrossWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-slate-400">+</span>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Checked Adjustments</p>
                          <p className="text-lg font-bold text-indigo-700 mt-0.5">
                            ${checkedRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-slate-400">=</span>
                        <div>
                          <p className="text-xs text-indigo-700 font-semibold">GMS Projection</p>
                          <p className="text-lg font-black text-indigo-900 mt-0.5">
                            ${prefundingSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        {uncheckedRates.length > 0 && (
                          <>
                            <span className="text-xl font-bold text-slate-400">+</span>
                            <div>
                              <p className="text-xs text-amber-600 font-medium">Additional Line Items</p>
                              <p className="text-lg font-bold text-amber-700 mt-0.5">
                                ${uncheckedRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </>
                        )}
                        <span className="text-xl font-bold text-slate-400">=</span>
                        <div>
                          <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Grand Total</p>
                          <p className="text-2xl font-black text-[#4f63ea] mt-0.5">
                            ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Invoice Itemization Table */}
                      <div className="border border-[#ece8e1] rounded-xl overflow-hidden">
                        <div className="bg-[#fbfaf8] px-5 py-3 border-b border-[#ece8e1] font-semibold text-xs text-slate-700">
                          Invoice Line Items Breakdown
                        </div>
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#fbfaf8] text-slate-500 border-b border-[#ece8e1]">
                            <tr>
                              <th className="px-5 py-2.5">Line Item</th>
                              <th className="px-5 py-2.5">Basis</th>
                              <th className="px-5 py-2.5">Pricing Model</th>
                              <th className="px-5 py-2.5">Rate</th>
                              <th className="px-5 py-2.5 text-right">Amount</th>
                              <th className="px-3 py-2.5 text-center">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ece8e1]">
                            <tr className="bg-emerald-50/20 font-medium">
                              <td className="px-5 py-3 text-slate-900 font-semibold flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
                                Gross Wages ({activeEmployees.length} Employee{activeEmployees.length === 1 ? "" : "s"})
                              </td>
                              <td className="px-5 py-3 text-slate-600">Gross Wages</td>
                              <td className="px-5 py-3">Addition</td>
                              <td className="px-5 py-3">-</td>
                              <td className="px-5 py-3 text-right font-bold text-slate-900">
                                ${totalGrossWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                                  Wages
                                </span>
                              </td>
                            </tr>
                            {checkedRates.map((rate) => (
                              <tr key={rate.id} className="hover:bg-slate-50/50">
                                <td className="px-5 py-3 text-slate-800 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    {rate.name}
                                  </div>
                                  {rate.notes && (
                                    <div className="text-[11px] text-slate-500 font-normal italic mt-0.5">
                                      <span className="text-slate-400 not-italic">Note:</span> {rate.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-slate-500">{rate.basis}</td>
                                <td className="px-5 py-3 text-slate-500">{rate.pricingModel}</td>
                                <td className="px-5 py-3 text-slate-500">
                                  {rate.pricingModel === "Percentage"
                                    ? `${rate.rate}%`
                                    : rate.pricingModel === "Multiplication"
                                    ? `x${rate.rate}`
                                    : rate.pricingModel === "Division"
                                    ? `/${rate.rate}`
                                    : `$${rate.rate}`}
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-slate-800">
                                  ${rate.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {rate.isOneTime ? (
                                    <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold">
                                      One-Time
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                                      Template
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-[#fbfaf8] border-t border-[#ece8e1] font-bold">
                            {/* GMS Projection (Gross Wages + Checked Adjustments) */}
                            <tr className="bg-slate-50/80 border-t border-[#ece8e1]">
                              <td colSpan={4} className="px-5 py-3 text-right text-xs text-slate-700 font-semibold">
                                GMS Projection:
                                <div className="text-[11px] text-slate-500 font-normal">
                                  Gross Wages (${totalGrossWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) + Adjustments (${checkedRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-sm text-indigo-700">
                                ${prefundingSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td></td>
                            </tr>

                            {/* Unchecked Line Items */}
                            {uncheckedRates.map((rate) => (
                              <tr key={rate.id} className="border-t border-[#ece8e1] bg-slate-50/30 text-xs font-normal">
                                <td className="px-5 py-3 text-slate-800 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    {rate.name}
                                  </div>
                                  {rate.notes && (
                                    <div className="text-[11px] text-slate-500 font-normal italic mt-0.5">
                                      <span className="text-slate-400 not-italic">Note:</span> {rate.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-slate-500">{rate.basis}</td>
                                <td className="px-5 py-3 text-slate-500">{rate.pricingModel}</td>
                                <td className="px-5 py-3 text-slate-500">
                                  {rate.pricingModel === "Percentage"
                                    ? `${rate.rate}%`
                                    : rate.pricingModel === "Multiplication"
                                    ? `x${rate.rate}`
                                    : rate.pricingModel === "Division"
                                    ? `/${rate.rate}`
                                    : `$${rate.rate}`}
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-slate-800">
                                  ${rate.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {rate.isOneTime ? (
                                    <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold">
                                      One-Time
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                                      Template
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {/* Total Grand Total */}
                            <tr className="border-t border-[#e2ded6] bg-white">
                              <td colSpan={4} className="px-5 py-3 text-right">
                                <div className="text-xs font-bold text-[#4f63ea] uppercase tracking-wide">
                                  Total Grand Total:
                                </div>
                                <div className="text-[11px] text-slate-500 font-normal">
                                  {uncheckedRates.length > 0 ? (
                                    <>
                                      GMS Projection (${prefundingSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) + Additional Line Items (${uncheckedRatesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                    </>
                                  ) : (
                                    <>
                                      GMS Projection (${prefundingSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right text-base text-[#4f63ea] font-black">
                                ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <button
                          onClick={() => setStep(3)}
                          className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back to Rates
                        </button>
                        <button
                          onClick={generateInvoice}
                          disabled={submitting}
                          className="flex items-center gap-2 px-6 py-2.5 bg-[#4f63ea] hover:bg-[#3d4ecf] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                          {submitting
                            ? (editingInvoiceId ? "Updating..." : "Finalizing...")
                            : (editingInvoiceId ? "Finalize & Update Invoice" : "Finalize & Generate Invoice")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD LINE ITEM (Section 10.2 & 10.3) */}
      {/* ======================================================== */}
      <ConfirmModal
        isOpen={showAddLineItemModal}
        onClose={() => {
          setShowAddLineItemModal(false);
          setLineItemModalErrors({});
        }}
        onConfirm={handleCreateAdditionalLineItem}
        closeOnConfirm={false}
        title="Add Prefunding Line Item"
        confirmLabel={isSavingLineItem ? "Adding..." : "Add Line Item"}
        cancelLabel="Cancel"
        isConfirming={isSavingLineItem}
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Line Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Worker Comp Surcharge, Medical Staff Fee"
              className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 ${
                lineItemModalErrors.name
                  ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              value={newLineItemName}
              onChange={(e) => {
                setNewLineItemName(e.target.value);
                if (lineItemModalErrors.name) {
                  setLineItemModalErrors((prev) => ({ ...prev, name: "" }));
                }
              }}
            />
            {lineItemModalErrors.name && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{lineItemModalErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Basis <span className="text-red-500">*</span>
            </label>
            <Select
              options={dynamicBasisOptions}
              value={newLineItemBasis}
              onChange={(val) => {
                setNewLineItemBasis(val);
                if (lineItemModalErrors.basis) {
                  setLineItemModalErrors((prev) => ({ ...prev, basis: "" }));
                }
              }}
              placeholder="Select calculation basis..."
              className={lineItemModalErrors.basis ? "!border-red-400" : ""}
            />
            {lineItemModalErrors.basis && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{lineItemModalErrors.basis}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Select Gross Wages, Grand Total, Prefunding Adjustments, Total Employees, Flat Fee, or an existing line item to calculate on
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Pricing Model</label>
              <Select
                options={PRICING_MODELS}
                value={newLineItemPricingModel}
                onChange={setNewLineItemPricingModel}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Rate Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 ${
                  lineItemModalErrors.rate
                    ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                value={newLineItemRate}
                onChange={(e) => {
                  setNewLineItemRate(e.target.value);
                  if (lineItemModalErrors.rate) {
                    setLineItemModalErrors((prev) => ({ ...prev, rate: "" }));
                  }
                }}
              />
              {lineItemModalErrors.rate && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{lineItemModalErrors.rate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Notes / Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Mandatory administrative service charge"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={newLineItemNotes}
              onChange={(e) => setNewLineItemNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="newLineItemIncludeInGrandTotal"
              checked={newLineItemIncludeInGrandTotal}
              onChange={(e) => setNewLineItemIncludeInGrandTotal(e.target.checked)}
              className="rounded border-slate-300 text-[#4f63ea] focus:ring-[#4f63ea]"
            />
            <label htmlFor="newLineItemIncludeInGrandTotal" className="text-xs text-slate-700 font-medium cursor-pointer">
              Include in GMS Projection subtotal (Uncheck to place in Additional Line Items)
            </label>
          </div>

          {/* Scope Selection */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-800 mb-2">Scope & Template Storage</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setNewLineItemStorageOption("template")}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  newLineItemStorageOption === "template"
                    ? "border-[#4f63ea] bg-[#f0f2fe]/60 ring-1 ring-[#4f63ea]"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    checked={newLineItemStorageOption === "template"}
                    onChange={() => setNewLineItemStorageOption("template")}
                    className="text-[#4f63ea]"
                  />
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#4f63ea]" /> Option 1: Template
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Save to practice template. Appears on this invoice AND all future cycles.
                </p>
              </label>

              <label
                onClick={() => setNewLineItemStorageOption("onetime")}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  newLineItemStorageOption === "onetime"
                    ? "border-[#4f63ea] bg-[#f0f2fe]/60 ring-1 ring-[#4f63ea]"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    checked={newLineItemStorageOption === "onetime"}
                    onChange={() => setNewLineItemStorageOption("onetime")}
                    className="text-[#4f63ea]"
                  />
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Option 2: One-Time
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Applies to this invoice only. Does not alter the template for future cycles.
                </p>
              </label>
            </div>
          </div>
        </div>
      </ConfirmModal>

      {/* ======================================================== */}
      {/* MODAL 2: EDIT LINE ITEM (Section 10.1) */}
      {/* ======================================================== */}
      <ConfirmModal
        isOpen={showEditLineItemModal}
        onClose={() => setShowEditLineItemModal(false)}
        onConfirm={handleSaveEditedLineItem}
        title="Edit Prefunding Line Item"
        confirmLabel="Save Changes"
        cancelLabel="Cancel"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">Line Item Name</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={editLineItemName}
              onChange={(e) => setEditLineItemName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Basis</label>
            <Select
              options={dynamicBasisOptions}
              value={editLineItemBasis}
              onChange={setEditLineItemBasis}
              placeholder="Select basis..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Pricing Model</label>
              <Select
                options={PRICING_MODELS}
                value={editLineItemPricingModel}
                onChange={setEditLineItemPricingModel}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Rate Value</label>
              <input
                type="number"
                step="0.01"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={editLineItemRate}
                onChange={(e) => setEditLineItemRate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Custom Amount Override ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e") e.preventDefault();
              }}
              placeholder="Leave blank to use auto-calculated amount"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={editLineItemAmount}
              onChange={(e) => setEditLineItemAmount(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Optionally force a custom dollar amount for this invoice before finalization
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Notes / Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Special adjustment, custom override reasoning..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={editLineItemNotes}
              onChange={(e) => setEditLineItemNotes(e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-[#4f63ea] focus:ring-[#4f63ea] mt-0.5"
                checked={editLineItemIncludeInGrandTotal}
                onChange={(e) => setEditLineItemIncludeInGrandTotal(e.target.checked)}
              />
              <div>
                <span className="font-semibold text-slate-800 block text-xs">
                  Include in GMS Projection subtotal (Checked section)
                </span>
                <span className="text-[11px] text-slate-500 leading-normal block">
                  Checked items are included in the GMS Projection (Wages + Taxes) subtotal. Unchecked items appear after the subtotal and add to the Total Grand Total.
                </span>
              </div>
            </label>
          </div>
        </div>
      </ConfirmModal>

      {/* ======================================================== */}
      {/* MODAL 3: ADD AD-HOC EMPLOYEE (Section 9) */}
      {/* ======================================================== */}
      <ConfirmModal
        isOpen={showAddEmployeeModal}
        onClose={() => {
          setShowAddEmployeeModal(false);
          setEmployeeModalErrors({});
        }}
        onConfirm={handleAddCustomEmployee}
        closeOnConfirm={false}
        title="Add Employee to Calculation"
        confirmLabel="Add Employee"
        cancelLabel="Cancel"
      >
        <div className="space-y-3.5 text-xs text-slate-700">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Employee Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Jane Doe"
              className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 ${
                employeeModalErrors.name
                  ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              value={newEmployeeName}
              onChange={(e) => {
                setNewEmployeeName(e.target.value);
                if (employeeModalErrors.name) {
                  setEmployeeModalErrors((prev) => ({ ...prev, name: "" }));
                }
              }}
            />
            {employeeModalErrors.name && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{employeeModalErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Job Category</label>
              <Select
                value={newEmployeeJobCategory}
                onChange={(val) => setNewEmployeeJobCategory(val)}
                options={JOB_CATEGORY_OPTIONS}
                placeholder="Select Category"
                className="w-full !text-xs !py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Work Location</label>
              <input
                type="text"
                placeholder="Location"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={newEmployeeLocation}
                onChange={(e) => setNewEmployeeLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">State</label>
              <Select
                value={newEmployeeState}
                onChange={(val) => setNewEmployeeState(val)}
                options={US_STATES_OPTIONS}
                placeholder="Select State"
                className="w-full !text-xs !py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Date of Joining</label>
              <DatePicker
                value={newEmployeeDateOfJoining}
                onChange={(val) => setNewEmployeeDateOfJoining(val)}
                placeholder="Select Date"
                className="w-full !text-xs !py-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Pay Type</label>
              <Select
                options={EMPLOYEE_PAY_TYPE_OPTIONS}
                value={newEmployeePayType}
                onChange={(val) => setNewEmployeePayType(val as "Hourly" | "Salary")}
                placeholder="Select Pay Type"
                className="w-full !text-xs !py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Pay Rate ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                placeholder="0.00"
                className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 ${
                  employeeModalErrors.payRate
                    ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                value={newEmployeePayRate}
                onChange={(e) => {
                  setNewEmployeePayRate(e.target.value);
                  if (employeeModalErrors.payRate) {
                    setEmployeeModalErrors((prev) => ({ ...prev, payRate: "" }));
                  }
                }}
              />
              {employeeModalErrors.payRate && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{employeeModalErrors.payRate}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Working Period (Hrs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                placeholder="0"
                className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 ${
                  employeeModalErrors.budgetedHours
                    ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                value={newEmployeeBudgetedHours}
                onChange={(e) => {
                  setNewEmployeeBudgetedHours(e.target.value);
                  if (employeeModalErrors.budgetedHours) {
                    setEmployeeModalErrors((prev) => ({ ...prev, budgetedHours: "" }));
                  }
                }}
              />
              {employeeModalErrors.budgetedHours && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{employeeModalErrors.budgetedHours}</p>
              )}
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Buffer % (Default 10%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                placeholder="0.0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={newEmployeeBufferPercent}
                onChange={(e) => setNewEmployeeBufferPercent(e.target.value)}
              />
            </div>
          </div>
        </div>
      </ConfirmModal>

      {/* ======================================================== */}
      {/* MODAL 4: INVOICE GENERATED SUCCESS MODAL */}
      {/* ======================================================== */}
      {showGeneratedModal && generatedInvoice && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs animate-in fade-in" />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center border-b border-slate-100 bg-white">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {editingInvoiceId ? "Prefunding Invoice Updated!" : "Prefunding Invoice Generated!"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Number:</span>
                  <span className="font-bold text-slate-800">{generatedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Practice:</span>
                  <span className="font-semibold text-slate-800">{selectedPracticeObj?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Prefunding Cycle:</span>
                  <span className="font-semibold text-slate-800">{generatedInvoice.cycle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Due Date:</span>
                  <span className="font-semibold text-slate-800">{generatedInvoice.dueDate}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                  <span className="text-slate-700">Total Invoice Amount:</span>
                  <span className="text-[#4f63ea]">
                    ${generatedInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openPrefundingInvoicePdf(generatedInvoice.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#4f63ea]" />
                  Preview PDF
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/prefunding/invoices")}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4f63ea] hover:bg-[#3d4ecf] text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  View All Invoices
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={resetCalculationWizard}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                >
                  Calculate Another Cycle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}