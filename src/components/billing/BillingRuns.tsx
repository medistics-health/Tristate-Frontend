import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  Circle,
  Coins,
  LoaderCircle,
  LayoutList,
  Play,
  Plus,
  Receipt,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import type { Practice } from "../practices/types";
import type { Service } from "../services/types";
import {
  getAgreementsByPractice,
  getAgreementServiceTerms,
  type Agreement,
  type AgreementServiceTerm,
} from "../../services/operations/agreements";
import {
  computeTermPreview,
  buildSnapshotsFromInputs,
  modelNeedsInput,
  getModelInputLabel,
  getModelLabel,
  roundMoneyClient,
  type TermInputValues,
} from "./billingPreview";
import AppLayout from "../layout/AppLayout";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import {
  getAllInvoices,
  type Invoice,
} from "../../services/operations/invoices";
import { getAllPractices } from "../../services/operations/practices";
import { getAllServices } from "../../services/operations/services";
import { getCredentialingRequestsView } from "../../services/operations/credentialing";
import {
  approveBillingRunApi,
  billingRunStatusOptions,
  calculateBillingRunApi,
  createBillingRunApi,
  getBillingReadiness,
  getBillingRun,
  getBillingRunsView,
  postBillingRunApi,
  deleteBillingRunApi,
  recordPaymentApi,
  type BillingReadinessResponse,
  type BillingRunDetail,
  type BillingRunRow,
  type BillingRunStatus,
  type BillingSnapshotInput,
  getBillingRunProcessingSummary,
} from "../../services/operations/billings";
import {
  canFinanceWrite,
  canOperationsAndFinanceWrite,
  readStoredUser,
} from "../../utils/auth";
import { billingEndpoints } from "../../services/apis";
import {
  getSystemSettingsApi,
  type SystemSettings,
} from "../../services/operations/users";
import { formatDateLabel } from "../credentialing/credentialingStore";
import type { CredentialingRecord } from "../credentialing/types";
import {
  buildGeneralSettingsTotals,
  buildPracticeLabelSettings,
  buildPracticeDefaultProcessingFeeSettings,
  buildProcessingFeeSettings,
  buildResolvedProcessingFeeSettings,
  getAllocationPercent,
  roundToPrecision,
  type ProcessingFeeSettings,
} from "../../utils/processingFeeConfig";

const statusStyles: Record<BillingRunStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  RUNNING: "bg-sky-100 text-sky-700",
  CALCULATED: "bg-emerald-100 text-emerald-700",
  REVIEW_REQUIRED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-indigo-100 text-indigo-700",
  POSTED: "bg-violet-100 text-violet-700",
  FAILED: "bg-red-100 text-red-700",
  CLOSED: "bg-zinc-100 text-zinc-600",
};

type CreateRunFormState = {
  practiceId: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod: "ACH" | "CREDIT_CARD" | "";
  processingFeeConfig: ProcessingFeeSettings;
  notes: string;
  autoCalculate: boolean;
  agreementIds: string[];
  termInputs: Record<string, TermInputValues>;
  selectedCredentialingRequestIds: string[];
  credentialingChargeAmounts: Record<string, string>;
};

type CredentialingChargePreview = {
  request: CredentialingRecord;
  amount: number;
  description: string;
};

const credentialingChargeEligibleStatuses = new Set([
  "Contracted - Direct",
  "CONTRACTED_DIRECT",
  "Contracted - IPA/Delegated",
  "CONTRACTED_IPA_DELEGATED",
]);

function isCredentialingChargeEligible(status?: string | null) {
  return credentialingChargeEligibleStatuses.has(String(status || "").trim());
}

type PaymentAllocationRow = {
  invoiceId: string;
  allocatedAmount: string;
};

type PaymentFormState = {
  practiceId: string;
  amount: string;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  externalReference: string;
  allocations: PaymentAllocationRow[];
};

const initialCreateRunForm: CreateRunFormState = {
  practiceId: "",
  periodStart: "",
  periodEnd: "",
  paymentMethod: "",
  processingFeeConfig: buildProcessingFeeSettings(),
  notes: "",
  autoCalculate: true,
  agreementIds: [],
  termInputs: {},
  selectedCredentialingRequestIds: [],
  credentialingChargeAmounts: {},
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateConfiguredFee(
  baseAmount: number,
  paymentMethod: "ACH" | "CREDIT_CARD",
  feeBearer: "CLIENT" | "COMPANY",
  settings: ProcessingFeeSettings,
) {
  const normalizedBase = roundMoney(Math.max(0, baseAmount));
  if (paymentMethod === "CREDIT_CARD") {
    const rule = settings.creditCard[feeBearer];
    return roundMoney(
      normalizedBase * (rule.ratePercent / 100) + rule.fixedFee,
    );
  }

  const rule = settings.ach[feeBearer];
  return roundMoney(
    Math.min(
      roundMoney(normalizedBase * (rule.ratePercent / 100)),
      Math.max(0, rule.capAmount),
    ),
  );
}

function calculateProcessingAmounts(params: {
  baseAmount: number;
  paymentMethod: "ACH" | "CREDIT_CARD";
  settings: ProcessingFeeSettings;
  totalsSource?: SystemSettings;
}) {
  const baseAmount = roundMoney(Math.max(0, params.baseAmount));
  const resolvedSettings = buildResolvedProcessingFeeSettings(
    params.settings,
    params.totalsSource,
  );
  const clientFeeAmount = calculateConfiguredFee(
    baseAmount,
    params.paymentMethod,
    "CLIENT",
    resolvedSettings,
  );
  const maxCompanyFeeAmount = calculateConfiguredFee(
    baseAmount,
    params.paymentMethod,
    "COMPANY",
    resolvedSettings,
  );

  return {
    clientFeeAmount,
    companyFeeAmount: maxCompanyFeeAmount,
    maxCompanyFeeAmount,
    grossInvoiceAmount: roundMoney(baseAmount + clientFeeAmount),
  };
}

function getPaymentMethodLabel(paymentMethod: "ACH" | "CREDIT_CARD") {
  return paymentMethod === "CREDIT_CARD" ? "Credit Card" : "ACH";
}

const initialPaymentForm: PaymentFormState = {
  practiceId: "",
  amount: "",
  currency: "USD",
  paymentDate: "",
  paymentMethod: "check",
  externalReference: "",
  allocations: [{ invoiceId: "", allocatedAmount: "" }],
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatMoney(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "-";
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(numericValue);
}

function formatPercentValue(value: number) {
  return `${Number(value).toFixed(2).replace(/\.00$/, "")}%`;
}

function formatCurrencyValue(value: number) {
  return formatMoney(value);
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "-";
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function BillingRunsPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canRunWrite = canOperationsAndFinanceWrite(currentRole);
  const canFinanceActions = canFinanceWrite(currentRole);
  const [searchParams] = useSearchParams();
  const profilePracticeId = searchParams.get("practiceId") || "";
  const profileAction = searchParams.get("action") || "";
  const profileRunId = searchParams.get("runId") || "";
  const [rows, setRows] = useState<BillingRunRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<BillingRunDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({});
  const [createForm, setCreateForm] =
    useState<CreateRunFormState>(initialCreateRunForm);
  const [paymentForm, setPaymentForm] =
    useState<PaymentFormState>(initialPaymentForm);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ practiceId: "", status: "" });
  const [profileCreateHandled, setProfileCreateHandled] = useState(false);
  const [profileRunHandled, setProfileRunHandled] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readiness, setReadiness] = useState<BillingReadinessResponse | null>(
    null,
  );
  const [isReadinessLoading, setIsReadinessLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<
    "calculate" | "approve" | "post" | null
  >(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [practiceAgreements, setPracticeAgreements] = useState<Agreement[]>([]);
  const [loadedTerms, setLoadedTerms] = useState<AgreementServiceTerm[]>([]);
  const [practiceCredentialingRequests, setPracticeCredentialingRequests] =
    useState<CredentialingRecord[]>([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [isLoadingCredentialingRequests, setIsLoadingCredentialingRequests] =
    useState(false);
  const canPreviewBillingRun = selectedRun
    ? ["CALCULATED", "REVIEW_REQUIRED", "APPROVED"].includes(selectedRun.status)
    : false;
  const selectedPractice = useMemo(
    () =>
      practices.find((practice) => practice.id === createForm.practiceId) ||
      null,
    [practices, createForm.practiceId],
  );

  const activePricingTerms = useMemo(() => {
    if (
      !createForm.periodStart ||
      !createForm.periodEnd ||
      createForm.agreementIds.length === 0
    )
      return [];
    const periodStart = new Date(createForm.periodStart);
    const periodEnd = new Date(createForm.periodEnd);
    return loadedTerms.filter((term) => {
      if (term.isActive === false) return false;
      if (!createForm.agreementIds.includes(term.agreementId)) return false;
      const termStart = term.effectiveDate
        ? new Date(term.effectiveDate)
        : new Date("1900-01-01");
      const termEnd = term.endDate
        ? new Date(term.endDate)
        : new Date("9999-12-31");
      return termStart <= periodEnd && termEnd >= periodStart;
    });
  }, [
    loadedTerms,
    createForm.agreementIds,
    createForm.periodStart,
    createForm.periodEnd,
  ]);

  useEffect(() => {
    if (!createForm.practiceId) {
      return;
    }

    const nextPaymentMethod =
      selectedPractice?.billingPaymentMethod === "CREDIT_CARD"
        ? "CREDIT_CARD"
        : "ACH";
    const nextSettings = buildProcessingFeeSettings(
      selectedPractice?.processingFeeConfig || systemSettings,
    );

    setCreateForm((prev) => {
      if (
        prev.paymentMethod === nextPaymentMethod &&
        JSON.stringify(prev.processingFeeConfig) ===
          JSON.stringify(nextSettings)
      ) {
        return prev;
      }

      return {
        ...prev,
        paymentMethod: nextPaymentMethod,
        processingFeeConfig: nextSettings,
      };
    });
  }, [
    createForm.practiceId,
    selectedPractice?.billingPaymentMethod,
    selectedPractice?.processingFeeConfig,
    systemSettings,
  ]);

  const detailTotals = useMemo(() => {
    if (!selectedRun || !selectedRun.items || selectedRun.items.length === 0) {
      return null;
    }
    const summary = getBillingRunProcessingSummary({
      paymentMethod:
        selectedRun.paymentMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "ACH",
      processingFeeConfig: selectedRun.processingFeeConfig || {},
      items: selectedRun.items.map((item) => ({
        clientAmount: String(item.clientAmount || 0),
        vendorAmount:
          item.vendorAmount !== undefined && item.vendorAmount !== null
            ? String(item.vendorAmount)
            : null,
        marginAmount:
          item.marginAmount !== undefined && item.marginAmount !== null
            ? String(item.marginAmount)
            : null,
      })),
    });
    return {
      netServicesTotal: summary.netServices,
      paymentMethod:
        selectedRun.paymentMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "ACH",
      processingFeeAmount: summary.processingFee,
      companyFeeAmount: summary.companyAbsorbed,
      grossInvoiceTotal: summary.grossInvoiceTotal,
      vendorPayable: summary.vendorPayable,
      margin: summary.totalMargin,
    };
  }, [selectedRun]);

  const effectiveCredentialingChargeAmount = useMemo(() => {
    return Number(selectedPractice?.credentialingChargeAmount || 0);
  }, [selectedPractice?.credentialingChargeAmount]);

  const credentialingChargePreviewItems = useMemo<
    CredentialingChargePreview[]
  >(() => {
    if (practiceCredentialingRequests.length === 0) {
      return [];
    }

    return practiceCredentialingRequests
      .filter(
        (request) =>
          request.practiceId === createForm.practiceId &&
          !request.credentialingChargeBilledAt &&
          isCredentialingChargeEligible(request.status),
      )
      .map((request) => ({
        request,
        amount: roundMoney(
          Number(
            createForm.credentialingChargeAmounts[request.id] ||
              selectedPractice?.credentialingChargeAmount ||
              0,
          ),
        ),
        description: `Credentialing Fee (${request.credentialingId})`,
      }));
  }, [
    createForm.practiceId,
    createForm.credentialingChargeAmounts,
    practiceCredentialingRequests,
    selectedPractice?.credentialingChargeAmount,
  ]);

  const selectedCredentialingChargePreviewItems = useMemo(
    () =>
      credentialingChargePreviewItems.filter((item) =>
        createForm.selectedCredentialingRequestIds.includes(item.request.id),
      ),
    [
      credentialingChargePreviewItems,
      createForm.selectedCredentialingRequestIds,
    ],
  );

  const alreadyApprovedCredentialingRequests = useMemo(
    () =>
      practiceCredentialingRequests.filter(
        (request) =>
          Boolean(request.credentialingChargeBilledAt) &&
          !request.credentialingChargeInvoiceLineItemId &&
          isCredentialingChargeEligible(request.status),
      ),
    [practiceCredentialingRequests],
  );

  const credentialingChargePreviewTotal = useMemo(
    () =>
      roundMoney(
        selectedCredentialingChargePreviewItems.reduce(
          (sum, item) => sum + item.amount,
          0,
        ),
      ),
    [selectedCredentialingChargePreviewItems],
  );

  const previewTotals = useMemo(() => {
    let invoiceTotal = 0;
    let vendorTotal = 0;
    let marginTotal = 0;
    for (const term of activePricingTerms) {
      const preview = computeTermPreview(
        term,
        createForm.termInputs[term.id] || {},
      );
      invoiceTotal += preview.clientAmount;
      if (preview.vendorAmount !== null) vendorTotal += preview.vendorAmount;
      if (preview.marginAmount !== null) marginTotal += preview.marginAmount;
    }
    return {
      invoiceTotal: roundMoneyClient(invoiceTotal),
      credentialingTotal: roundMoneyClient(credentialingChargePreviewTotal),
      vendorTotal: roundMoneyClient(vendorTotal),
      marginTotal: roundMoneyClient(
        marginTotal + credentialingChargePreviewTotal,
      ),
    };
  }, [
    activePricingTerms,
    createForm.termInputs,
    credentialingChargePreviewTotal,
  ]);

  const selectedAgreementNames = useMemo(() => {
    return practiceAgreements
      .filter((a) => createForm.agreementIds.includes(a.id))
      .map((a) => a.type || a.name || a.id);
  }, [practiceAgreements, createForm.agreementIds]);

  const runProviderNames = useMemo(() => {
    return Array.from(
      new Set(
        (selectedRun?.items || [])
          .map(
            (i: any) => i.provider?.name || i.provider || i.practitioner?.name,
          )
          .filter(Boolean),
      ),
    );
  }, [selectedRun]);

  const runPlanNames = useMemo(() => {
    return Array.from(
      new Set(
        (selectedRun?.items || [])
          .map(
            (i: any) =>
              i.agreementServiceTerm?.agreement?.type ||
              i.agreementServiceTerm?.agreement?.name,
          )
          .filter(Boolean),
      ),
    );
  }, [selectedRun]);

  const processingFeePreview = useMemo(() => {
    if (!createForm.paymentMethod) {
      return {
        clientFeeAmount: 0,
        companyFeeAmount: 0,
        maxCompanyFeeAmount: 0,
        grossInvoiceAmount: previewTotals.invoiceTotal,
      };
    }

    return calculateProcessingAmounts({
      baseAmount: previewTotals.invoiceTotal + previewTotals.credentialingTotal,
      paymentMethod: createForm.paymentMethod,
      settings: createForm.processingFeeConfig,
      totalsSource: systemSettings,
    });
  }, [
    createForm.paymentMethod,
    createForm.processingFeeConfig,
    previewTotals.credentialingTotal,
    previewTotals.invoiceTotal,
    systemSettings,
  ]);

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCredentialingPreview() {
      if (!createForm.practiceId) {
        setPracticeCredentialingRequests([]);
        return;
      }

      setIsLoadingCredentialingRequests(true);
      try {
        const response = await getCredentialingRequestsView({
          practice: selectedPractice?.name || undefined,
          limit: 5000,
          sortBy: "updatedAt",
          sortOrder: "desc",
        });
        if (!cancelled) {
          const practiceRequests = response.credentialingRequests.filter(
            (request) =>
              request.practiceId === createForm.practiceId &&
              isCredentialingChargeEligible(request.status),
          );

          const eligibleRequests = practiceRequests.filter(
            (request) => !request.credentialingChargeBilledAt,
          );

          setPracticeCredentialingRequests(practiceRequests);
          setCreateForm((prev) => ({
            ...prev,
            selectedCredentialingRequestIds: eligibleRequests.map(
              (request) => request.id,
            ),
            credentialingChargeAmounts: Object.fromEntries(
              eligibleRequests.map((request) => [
                request.id,
                prev.credentialingChargeAmounts[request.id] ||
                  String(
                    Number(
                      selectedPractice?.credentialingChargeAmount || 0,
                    ).toFixed(2),
                  ),
              ]),
            ),
          }));
        }
      } catch {
        if (!cancelled) {
          setPracticeCredentialingRequests([]);
          setCreateForm((prev) => ({
            ...prev,
            selectedCredentialingRequestIds: [],
            credentialingChargeAmounts: {},
          }));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCredentialingRequests(false);
        }
      }
    }

    void loadCredentialingPreview();

    return () => {
      cancelled = true;
    };
  }, [
    createForm.practiceId,
    selectedPractice?.name,
    selectedPractice?.credentialingChargeAmount,
  ]);

  const feeTotals = useMemo(
    () => buildGeneralSettingsTotals(systemSettings),
    [systemSettings],
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          !paymentForm.practiceId ||
          invoice.practiceId === paymentForm.practiceId,
      ),
    [invoices, paymentForm.practiceId],
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "practiceName",
          accessorFn: (row: BillingRunRow) => row.values.practiceName,
          header: () => "Practice",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            row.original.values.practiceName,
        },
        {
          id: "status",
          accessorFn: (row: BillingRunRow) => row.values.status,
          header: () => "Status",
          cell: ({ row }: { row: { original: BillingRunRow } }) => {
            const status = row.original.values.status;
            return (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
              >
                {formatStatusLabel(status)}
              </span>
            );
          },
        },
        {
          id: "period",
          accessorFn: (row: BillingRunRow) => row.values.period,
          header: () => "Period",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            row.original.values.period,
        },
        {
          id: "netServices",
          accessorFn: (row: BillingRunRow) => row.values.netServices,
          header: () => "Net Services",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            formatMoney(row.original.values.netServices),
        },
        {
          id: "grossInvoiceTotal",
          accessorFn: (row: BillingRunRow) => row.values.grossInvoiceTotal,
          header: () => "Gross Invoice Total",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            formatMoney(row.original.values.grossInvoiceTotal),
        },
        {
          id: "processingFee",
          accessorFn: (row: BillingRunRow) => row.values.processingFee,
          header: () => "Processing Fee",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            formatMoney(row.original.values.processingFee),
        },
        {
          id: "companyAbsorbed",
          accessorFn: (row: BillingRunRow) => row.values.companyAbsorbed,
          header: () => "Company Absorbed",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            formatMoney(row.original.values.companyAbsorbed),
        },
        {
          id: "vendorPayable",
          accessorFn: (row: BillingRunRow) => row.values.vendorPayable,
          header: () => "Vendor Payable Amount",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            formatMoney(row.original.values.vendorPayable),
        },
        {
          id: "totalMargin",
          accessorFn: (row: BillingRunRow) => row.values.totalMargin,
          header: () => "Total Margin",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            formatMoney(row.original.values.totalMargin),
        },
        {
          id: "paymentMethod",
          accessorFn: (row: BillingRunRow) => row.values.paymentMethod,
          header: () => "Payment Method",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            row.original.values.paymentMethod,
        },
        {
          id: "itemCount",
          accessorFn: (row: BillingRunRow) => row.values.itemCount,
          header: () => "Items",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            String(row.original.values.itemCount),
        },
        {
          id: "createdAt",
          accessorFn: (row: BillingRunRow) => row.values.createdAt,
          header: () => "Created",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            row.original.values.createdAt,
        },
      ] as ColumnDef<BillingRunRow>[],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    async function loadRuns() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getBillingRunsView({
          page: pagination.page,
          limit: pagination.limit,
          practiceId: filters.practiceId || profilePracticeId || undefined,
          status: filters.status || undefined,
        });
        setRows(data.rows);
        setPagination(data.pagination);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load billing runs";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadRuns();
  }, [
    pagination.page,
    pagination.limit,
    filters.practiceId,
    filters.status,
    profilePracticeId,
  ]);

  useEffect(() => {
    if (
      (showCreateForm || showPaymentForm || showDetailPanel) &&
      practices.length === 0
    ) {
      Promise.all([
        getAllPractices(),
        getAllInvoices(),
        getAllServices(),
        getSystemSettingsApi(),
      ])
        .then(([practiceList, invoiceList, serviceList, settings]) => {
          setPractices(practiceList);
          setInvoices(invoiceList);
          setServices(serviceList);
          setSystemSettings(settings);
        })
        .catch((err) => {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load billing options";
          toast.error(message);
        });
    }
  }, [showCreateForm, showPaymentForm, showDetailPanel, practices.length]);

  // Load agreements when practice changes in create form
  useEffect(() => {
    if (!showCreateForm || !createForm.practiceId) {
      setPracticeAgreements([]);
      setLoadedTerms([]);
      return;
    }
    setIsLoadingAgreements(true);
    getAgreementsByPractice(createForm.practiceId)
      .then((agreements) => {
        const active = agreements.filter((a) => a.status === "ACTIVE");
        setPracticeAgreements(active);
        setCreateForm((prev) => ({
          ...prev,
          agreementIds: active.map((a) => a.id),
          termInputs: {},
        }));
      })
      .catch(() => {
        setPracticeAgreements([]);
      })
      .finally(() => setIsLoadingAgreements(false));
  }, [showCreateForm, createForm.practiceId]);

  // Load pricing terms when selected agreements change
  const agreementIdsKey = createForm.agreementIds.join(",");
  useEffect(() => {
    if (!agreementIdsKey) {
      setLoadedTerms([]);
      return;
    }
    const ids = agreementIdsKey.split(",").filter(Boolean);
    if (ids.length === 0) {
      setLoadedTerms([]);
      return;
    }
    setIsLoadingTerms(true);
    Promise.all(
      ids.map((id) => {
        const agreement = practiceAgreements.find((a) => a.id === id);
        const currentVersion = agreement?.versions?.find((v) => v.isCurrent);
        return getAgreementServiceTerms({
          agreementId: id,
          agreementVersionId: currentVersion?.id,
          limit: 200,
        }).then((res) => res.terms);
      }),
    )
      .then((results) => setLoadedTerms(results.flat()))
      .catch(() => setLoadedTerms([]))
      .finally(() => setIsLoadingTerms(false));
  }, [agreementIdsKey, practiceAgreements]);
  useEffect(() => {
    const practiceId = profilePracticeId;
    const action = profileAction;

    if (!practiceId) return;

    setFilters((current) =>
      current.practiceId === practiceId ? current : { ...current, practiceId },
    );

    if (profileCreateHandled || action !== "create") return;

    setProfileCreateHandled(true);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setShowPaymentForm(false);
    setSelectedRowId(null);
    setSelectedRun(null);
    setCreateForm({
      ...initialCreateRunForm,
      practiceId,
      processingFeeConfig:
        buildPracticeDefaultProcessingFeeSettings(systemSettings),
    });
    setReadiness(null);

    if (practices.length === 0) {
      Promise.all([
        getAllPractices(),
        getAllInvoices(),
        getAllServices(),
        getSystemSettingsApi(),
      ])
        .then(([practiceList, invoiceList, serviceList, settings]) => {
          setPractices(practiceList);
          setInvoices(invoiceList);
          setServices(serviceList);
          setSystemSettings(settings);
        })
        .catch((err) => {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load billing options";
          toast.error(message);
        });
    }
  }, [
    practices.length,
    profileAction,
    profileCreateHandled,
    profilePracticeId,
  ]);

  useEffect(() => {
    if (!profileRunId || profileRunHandled) return;

    setProfileRunHandled(true);
    void handleRowClick(profileRunId);
  }, [profileRunHandled, profileRunId]);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getBillingRunsView({
      page: targetPage,
      limit: pagination.limit,
      practiceId: filters.practiceId || profilePracticeId || undefined,
      status: filters.status || undefined,
    });
    setRows(data.rows);
    setPagination(data.pagination);
  }

  async function handleRowClick(id: string) {
    setSelectedRowId(id);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setShowPaymentForm(false);
    setIsDetailLoading(true);

    try {
      const run = await getBillingRun(id);
      setSelectedRun(run);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch billing run";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function resetCreateForm() {
    setCreateForm({
      ...initialCreateRunForm,
      processingFeeConfig:
        buildPracticeDefaultProcessingFeeSettings(systemSettings),
    });
    setReadiness(null);
    setPracticeAgreements([]);
    setLoadedTerms([]);
    setShowCreateForm(false);
  }

  function resetPaymentForm() {
    setPaymentForm(initialPaymentForm);
    setShowPaymentForm(false);
  }

  function openCreateForm() {
    if (!canRunWrite) {
      toast.error("You do not have permission to create billing runs.");
      return;
    }
    const preselectedPracticeId = filters.practiceId || profilePracticeId || "";
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setShowPaymentForm(false);
    setSelectedRowId(null);
    setSelectedRun(null);
    setCreateForm({
      ...initialCreateRunForm,
      practiceId: preselectedPracticeId,
      processingFeeConfig:
        buildPracticeDefaultProcessingFeeSettings(systemSettings),
    });
    setReadiness(null);
    setPracticeAgreements([]);
    setLoadedTerms([]);
  }

  function openPaymentForm() {
    if (!canFinanceActions) {
      toast.error("Only finance/admin can record payments.");
      return;
    }
    setShowPaymentForm(true);
    setShowCreateForm(false);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedRun(null);
    setPaymentForm(initialPaymentForm);
  }

  async function handleCreateRun(event: React.FormEvent) {
    event.preventDefault();
    if (!canRunWrite) {
      toast.error("You do not have permission to create billing runs.");
      return;
    }
    if (
      !createForm.practiceId ||
      !createForm.periodStart ||
      !createForm.periodEnd ||
      !createForm.paymentMethod
    ) {
      toast.error("Practice and billing period are required");
      return;
    }

    if (readiness && !readiness.isReady) {
      toast.error("Practice is not billing-ready for the selected period");
      return;
    }

    if (createForm.agreementIds.length === 0) {
      toast.error("At least one agreement must be selected");
      return;
    }

    setIsSubmitting(true);
    try {
      const snapshots = buildSnapshotsFromInputs(
        activePricingTerms,
        createForm.termInputs,
      );
      const run = await createBillingRunApi({
        practiceId: createForm.practiceId,
        periodStart: createForm.periodStart,
        periodEnd: createForm.periodEnd,
        notes: createForm.notes || undefined,
        autoCalculate: createForm.autoCalculate,
        snapshots,
        agreementIds: createForm.agreementIds,
        selectedCredentialingRequestIds:
          createForm.selectedCredentialingRequestIds,
        credentialingChargeAmounts: createForm.credentialingChargeAmounts,
      });
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      resetCreateForm();
      toast.success("Billing run created successfully");
      await handleRowClick(run.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create billing run";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function checkReadiness() {
    if (
      !createForm.practiceId ||
      !createForm.periodStart ||
      !createForm.periodEnd
    ) {
      toast.error(
        "Practice and billing period are required to check readiness",
      );
      return;
    }

    setIsReadinessLoading(true);
    try {
      const result = await getBillingReadiness({
        practiceId: createForm.practiceId,
        periodStart: createForm.periodStart,
        periodEnd: createForm.periodEnd,
        agreementIds: createForm.agreementIds,
      });
      setReadiness(result);
      if (result.isReady) {
        toast.success("Practice is billing-ready");
      } else {
        toast.error("Practice has billing readiness blockers");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check readiness";
      toast.error(message);
      setReadiness(null);
    } finally {
      setIsReadinessLoading(false);
    }
  }

  useEffect(() => {
    if (!showCreateForm) {
      return;
    }

    if (
      !createForm.practiceId ||
      !createForm.periodStart ||
      !createForm.periodEnd
    ) {
      setReadiness(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void checkReadiness();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    showCreateForm,
    createForm.practiceId,
    createForm.periodStart,
    createForm.periodEnd,
    createForm.agreementIds,
  ]);

  async function reloadSelectedRun() {
    if (!selectedRun) return;
    const run = await getBillingRun(selectedRun.id);
    setSelectedRun(run);
    await refreshRows();
  }

  async function handleRunAction(action: "calculate" | "approve" | "post") {
    if (!selectedRun) return;
    if (action === "calculate" && !canRunWrite) {
      toast.error("You do not have permission to calculate billing runs.");
      return;
    }
    if ((action === "approve" || action === "post") && !canFinanceActions) {
      toast.error("Only finance/admin can approve or post billing runs.");
      return;
    }
    setIsActionLoading(action);
    try {
      if (action === "calculate") {
        await calculateBillingRunApi(selectedRun.id);
        toast.success("Billing run calculated");
      }
      if (action === "approve") {
        await approveBillingRunApi(selectedRun.id);
        toast.success("Billing run approved");
      }
      if (action === "post") {
        const result = await postBillingRunApi(selectedRun.id);
        toast.success(
          `Billing run posted. ${result.invoices.length} invoice(s) created.`,
        );
      }
      await reloadSelectedRun();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${action} billing run`;
      toast.error(message);
    } finally {
      setIsActionLoading(null);
    }
  }

  async function handleDeleteRun() {
    if (!selectedRun) return;
    if (!canFinanceActions) {
      toast.error("Only finance/admin can delete billing runs.");
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to delete this billing run? All associated items and snapshots will be removed. This cannot be undone.",
      )
    )
      return;

    setIsActionLoading("calculate"); // Reuse loading state
    try {
      await deleteBillingRunApi(selectedRun.id);
      toast.success("Billing run deleted successfully");
      setShowDetailPanel(false);
      setSelectedRowId(null);
      setSelectedRun(null);
      await refreshRows();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete billing run";
      toast.error(message);
    } finally {
      setIsActionLoading(null);
    }
  }

  async function handleRecordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!canFinanceActions) {
      toast.error("Only finance/admin can record payments.");
      return;
    }
    if (!paymentForm.practiceId || !paymentForm.amount) {
      toast.error("Practice and payment amount are required");
      return;
    }

    setIsRecordingPayment(true);
    try {
      await recordPaymentApi({
        practiceId: paymentForm.practiceId,
        amount: Number(paymentForm.amount),
        currency: paymentForm.currency || "USD",
        paymentDate: paymentForm.paymentDate || undefined,
        paymentMethod: paymentForm.paymentMethod || undefined,
        externalReference: paymentForm.externalReference || undefined,
        allocations: paymentForm.allocations
          .filter(
            (allocation) => allocation.invoiceId && allocation.allocatedAmount,
          )
          .map((allocation) => ({
            invoiceId: allocation.invoiceId,
            allocatedAmount: Number(allocation.allocatedAmount),
          })),
      });
      resetPaymentForm();
      toast.success("Payment recorded successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to record payment";
      toast.error(message);
    } finally {
      setIsRecordingPayment(false);
    }
  }

  function renderPracticeFeeSetupReadonly() {
    if (!createForm.paymentMethod) {
      return (
        <div className="rounded-lg border border-dashed border-[#ece7df] px-4 py-3 text-[12px] text-slate-500">
          Select a practice to load the payment method and processing fee setup.
        </div>
      );
    }

    const companyLabel = buildPracticeLabelSettings(
      createForm.processingFeeConfig,
      createForm.paymentMethod,
      "COMPANY",
      systemSettings,
    );
    const clientLabel = buildPracticeLabelSettings(
      createForm.processingFeeConfig,
      createForm.paymentMethod,
      "CLIENT",
      systemSettings,
    );

    const companyPrimary =
      createForm.paymentMethod === "CREDIT_CARD"
        ? createForm.processingFeeConfig.creditCard.COMPANY.ratePercent
        : createForm.processingFeeConfig.ach.COMPANY.ratePercent;
    const companySecondary =
      createForm.paymentMethod === "CREDIT_CARD"
        ? createForm.processingFeeConfig.creditCard.COMPANY.fixedFee
        : createForm.processingFeeConfig.ach.COMPANY.capAmount;
    const clientPrimary =
      createForm.paymentMethod === "CREDIT_CARD"
        ? createForm.processingFeeConfig.creditCard.CLIENT.ratePercent
        : createForm.processingFeeConfig.ach.CLIENT.ratePercent;
    const clientSecondary =
      createForm.paymentMethod === "CREDIT_CARD"
        ? createForm.processingFeeConfig.creditCard.CLIENT.fixedFee
        : createForm.processingFeeConfig.ach.CLIENT.capAmount;

    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Payment Method
          </label>
          <div className="app-control w-full rounded-md px-3 py-2 text-[13px] text-slate-700 bg-slate-50">
            {getPaymentMethodLabel(createForm.paymentMethod)}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Processing Fee Setup
          </label>
          <div className="overflow-hidden rounded-lg border border-[#ece7df] bg-[#faf9f7] text-[12px] text-slate-600">
            <div className="grid grid-cols-[35%_38%_30%] items-center">
              <div className="border-b border-[#ece7df] bg-[#fcfbf9] px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Bearer
              </div>
              <div className="border-b border-[#ece7df] bg-[#fcfbf9] px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {createForm.paymentMethod === "CREDIT_CARD"
                  ? `Percentage Fee (${roundToPrecision(feeTotals.creditCard.ratePercent, 2)}%)`
                  : `Percentage Fee (${roundToPrecision(feeTotals.ach.ratePercent, 2)}%)`}
              </div>
              <div className="border-b border-[#ece7df] bg-[#fcfbf9] px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {createForm.paymentMethod === "CREDIT_CARD"
                  ? `Fixed Fee ($${roundToPrecision(feeTotals.creditCard.fixedFee, 2)})`
                  : `Cap Amount ($${roundToPrecision(feeTotals.ach.capAmount, 2)})`}
              </div>

              <div className="border-b border-[#ece7df] px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                {createForm.paymentMethod === "CREDIT_CARD"
                  ? `Company (${roundToPrecision(companyLabel.primary, 2)}%+$${roundToPrecision(companyLabel.secondary, 2)})`
                  : `Company (${roundToPrecision(companyLabel.primary, 2)}% or $${roundToPrecision(companyLabel.secondary, 2)} max)`}
              </div>
              <div className="border-b border-[#ece7df] px-4 py-3">
                <span className="inline-flex min-w-[78px] items-center justify-end rounded-md border border-[#ddd6cc] bg-white px-3 py-2 text-[12px] font-medium text-slate-700">
                  {roundToPrecision(
                    getAllocationPercent(
                      companyPrimary,
                      createForm.paymentMethod === "CREDIT_CARD"
                        ? feeTotals.creditCard.ratePercent
                        : feeTotals.ach.ratePercent,
                    ),
                    2,
                  )}
                  <span className="ml-1 text-[11px] text-slate-400">%</span>
                </span>
              </div>
              <div className="border-b border-[#ece7df] px-4 py-3">
                <span className="inline-flex min-w-[78px] items-center justify-end rounded-md border border-[#ddd6cc] bg-white px-3 py-2 text-[12px] font-medium text-slate-700">
                  {roundToPrecision(
                    getAllocationPercent(
                      companySecondary,
                      createForm.paymentMethod === "CREDIT_CARD"
                        ? feeTotals.creditCard.fixedFee
                        : feeTotals.ach.capAmount,
                    ),
                    2,
                  )}
                  <span className="ml-1 text-[11px] text-slate-400">%</span>
                </span>
              </div>

              <div className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                {createForm.paymentMethod === "CREDIT_CARD"
                  ? `Client (${roundToPrecision(clientLabel.primary, 2)}%+$${roundToPrecision(clientLabel.secondary, 2)})`
                  : `Client (${roundToPrecision(clientLabel.primary, 2)}% or $${roundToPrecision(clientLabel.secondary, 2)} max)`}
              </div>
              <div className="px-4 py-3">
                <span className="inline-flex min-w-[78px] items-center justify-end rounded-md border border-[#ddd6cc] bg-white px-3 py-2 text-[12px] font-medium text-slate-700">
                  {roundToPrecision(
                    getAllocationPercent(
                      clientPrimary,
                      createForm.paymentMethod === "CREDIT_CARD"
                        ? feeTotals.creditCard.ratePercent
                        : feeTotals.ach.ratePercent,
                    ),
                    2,
                  )}
                  <span className="ml-1 text-[11px] text-slate-400">%</span>
                </span>
              </div>
              <div className="px-4 py-3">
                <span className="inline-flex min-w-[78px] items-center justify-end rounded-md border border-[#ddd6cc] bg-white px-3 py-2 text-[12px] font-medium text-slate-700">
                  {roundToPrecision(
                    getAllocationPercent(
                      clientSecondary,
                      createForm.paymentMethod === "CREDIT_CARD"
                        ? feeTotals.creditCard.fixedFee
                        : feeTotals.ach.capAmount,
                    ),
                    2,
                  )}
                  <span className="ml-1 text-[11px] text-slate-400">%</span>
                </span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            This setup is read from the selected practice. To change please
            update the practice's payment method and processing fee
            configuration in the practice settings.
          </p>
        </div>
      </div>
    );
  }

  const navbarActions = [
    ...(canFinanceActions
      ? [
          {
            label: "Record payment",
            icon: <Coins className="h-4 w-4" />,
            onClick: openPaymentForm,
          },
        ]
      : []),
    ...(canRunWrite
      ? [
          {
            label: "New run",
            icon: <Plus className="h-4 w-4" />,
            onClick: openCreateForm,
          },
        ]
      : []),
  ];

  const detailPanel = (
    <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button
          type="button"
          onClick={() => {
            setShowDetailPanel(false);
            setSelectedRowId(null);
            setSelectedRun(null);
          }}
          className="text-slate-400 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Circle className="h-4 w-4 text-slate-300" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
          {selectedRun?.practice?.name || "Billing Run"}
        </span>
      </div>

      {isDetailLoading || !selectedRun ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading billing run...
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-[#f0ece6] px-4 py-3">
            <button
              type="button"
              disabled={
                isActionLoading !== null ||
                [
                  "CALCULATED",
                  "REVIEW_REQUIRED",
                  "APPROVED",
                  "POSTED",
                  "CLOSED",
                  "RUNNING",
                ].includes(selectedRun.status)
              }
              onClick={() => handleRunAction("calculate")}
              className="app-control inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {isActionLoading === "calculate"
                ? "Calculating..."
                : ["CALCULATED", "REVIEW_REQUIRED"].includes(selectedRun.status)
                  ? "Calculated"
                  : "Calculate"}
            </button>
            {canFinanceActions && (
              <button
                type="button"
                disabled={
                  isActionLoading !== null ||
                  !["CALCULATED", "REVIEW_REQUIRED"].includes(
                    selectedRun.status,
                  )
                }
                onClick={() => handleRunAction("approve")}
                className="inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {isActionLoading === "approve" ? "Approving..." : "Approve"}
              </button>
            )}
            {canFinanceActions && (
              <button
                type="button"
                disabled={
                  isActionLoading !== null || selectedRun.status !== "APPROVED"
                }
                onClick={() => handleRunAction("post")}
                className="inline-flex items-center gap-2 rounded-md bg-[#1f7a5b] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {isActionLoading === "post" ? "Posting..." : "Post"}
              </button>
            )}
            {canFinanceActions && (
              <button
                type="button"
                disabled={
                  isActionLoading !== null ||
                  ["APPROVED", "POSTED", "CLOSED", "RUNNING"].includes(
                    selectedRun.status,
                  )
                }
                onClick={handleDeleteRun}
                className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-200 px-3 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50 hover:border-red-100 disabled:opacity-50"
                title="Delete Billing Run"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isActionLoading === "calculate" &&
                selectedRun.status !== "PENDING"
                  ? "Deleting..."
                  : "Delete"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            <DetailCard
              title={selectedRun?.practice?.name || "Billing Run"}
              badge={
                selectedRun?.status
                  ? {
                      label: formatStatusLabel(selectedRun.status),
                      className: statusStyles[selectedRun.status],
                    }
                  : null
              }
              infoRows={[
                {
                  label: "Period",
                  value: `${formatDateTime(selectedRun.periodStart).split(",")[0]} - ${formatDateTime(selectedRun.periodEnd).split(",")[0]}`,
                },
                ...(selectedRun.approvedAt
                  ? [
                      {
                        label: "Approved At",
                        value: formatDateTime(selectedRun.approvedAt),
                      },
                    ]
                  : []),
              ]}
            />

            {detailTotals && (
              <div className="mb-5 rounded-2xl border border-[#eadfcd] bg-gradient-to-br from-[#f9f4ec] via-white to-[#f4f7fb] p-4 text-[13px] space-y-3 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-[14px] border-b border-[#eadfcd]/40 pb-2">
                  Billing Run Summary
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Net Services
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatMoney(detailTotals.netServicesTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Processing Fee
                  </span>
                  <span className="font-bold text-slate-700">
                    {formatMoney(detailTotals.processingFeeAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Company Absorbed
                  </span>
                  <span className="font-bold text-slate-700">
                    {formatMoney(
                      detailTotals.netServicesTotal === 0
                        ? 0
                        : detailTotals.companyFeeAmount,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Total Margin
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatMoney(detailTotals.margin)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Vendor Payable Amount
                  </span>
                  <span className="font-bold text-slate-700">
                    {formatMoney(detailTotals.vendorPayable)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Payment Method
                  </span>
                  <span className="font-bold text-slate-700">
                    {getPaymentMethodLabel(detailTotals.paymentMethod)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[#eadfcd]/40 pt-2.5">
                  <span className="text-slate-500 font-medium">
                    Gross Invoice Total
                  </span>
                  <span
                    className={`font-extrabold text-[14px] ${detailTotals.margin < 0 ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {formatMoney(detailTotals.grossInvoiceTotal)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-5 text-[13px]">
              <div>
                <h3 className="mb-2 font-medium text-slate-700">
                  Calculated Items
                </h3>
                <div className="space-y-2">
                  {(selectedRun.items || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-slate-400">
                      No billing items yet. Run Calculate to apply pricing
                      terms.
                    </div>
                  ) : (
                    selectedRun.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3.5 transition-all duration-200 hover:border-indigo-100 hover:shadow-[0_4px_16px_rgba(0,0,0,0.035)]"
                      >
                        {/* Premium left accent indicator on hover */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/80 opacity-0 transition-opacity group-hover:opacity-100" />

                        {/* Top Row: Service details & Client charge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-800 text-[14px] leading-tight truncate">
                              {item.service?.name || item.serviceId}
                            </h4>

                            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                              <span className="text-slate-400">Vendor</span>
                              <span className="font-medium text-slate-700 truncate">
                                {item.vendor?.name || "—"}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              Agreement dates{" "}
                              {formatDateRange(
                                item.agreementServiceTerm?.agreementVersion
                                  ?.effectiveDate ??
                                  item.agreementServiceTerm?.agreement
                                    ?.effectiveDate,
                                item.agreementServiceTerm?.agreementVersion
                                  ?.endDate ??
                                  item.agreementServiceTerm?.agreement
                                    ?.terminationDate ??
                                  item.agreementServiceTerm?.agreement
                                    ?.renewalDate,
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Service term dates{" "}
                              {formatDateRange(
                                item.agreementServiceTerm?.effectiveDate,
                                item.agreementServiceTerm?.endDate,
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex rounded-lg bg-slate-50 px-2.5 py-1 text-[13.5px] font-bold text-slate-800 border border-slate-100">
                              {formatMoney(item.clientAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Mid Row: Pricing details from formula */}
                        <div className="mt-2.5 space-y-2 border-t border-slate-50 pt-2.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {item.agreementServiceTermId && (
                              <span className="inline-flex items-center gap-1 rounded bg-indigo-50/80 px-2 py-0.5 font-medium text-indigo-700 border border-indigo-100/40">
                                <span className="h-1 w-1 rounded-full bg-indigo-500 animate-pulse" />
                                Rate linked
                              </span>
                            )}

                            {/* Minimum Fee */}
                            {(item as any).formulaSnapshot &&
                              typeof (item as any).formulaSnapshot ===
                                "object" &&
                              (item as any).formulaSnapshot.minimumFee !=
                                null && (
                                <span className="inline-flex items-center rounded bg-slate-50 px-2 py-0.5 text-slate-600 border border-slate-100">
                                  <span className="text-slate-400 mr-1">
                                    Minimum Fee:
                                  </span>
                                  <span className="font-semibold text-slate-700">
                                    {formatMoney(
                                      (item as any).formulaSnapshot.minimumFee,
                                    )}
                                  </span>
                                </span>
                              )}

                            {/* Maximum Fee */}
                            {(item as any).formulaSnapshot &&
                              typeof (item as any).formulaSnapshot ===
                                "object" &&
                              (item as any).formulaSnapshot.maximumFee !=
                                null && (
                                <span className="inline-flex items-center rounded bg-slate-50 px-2 py-0.5 text-slate-600 border border-slate-100">
                                  <span className="text-slate-400 mr-1">
                                    Maximum Fee:
                                  </span>
                                  <span className="font-semibold text-slate-700">
                                    {formatMoney(
                                      (item as any).formulaSnapshot.maximumFee,
                                    )}
                                  </span>
                                </span>
                              )}

                            {/* Pricing Model */}
                            {(item as any).formulaSnapshot &&
                              typeof (item as any).formulaSnapshot ===
                                "object" &&
                              (item as any).formulaSnapshot.pricingModel && (
                                <span className="inline-flex items-center rounded bg-violet-50 px-2 py-0.5 font-medium text-violet-700 border border-violet-100/50">
                                  {String(
                                    (item as any).formulaSnapshot.pricingModel,
                                  ).replace(/_/g, " ")}
                                </span>
                              )}
                          </div>

                          {/* Hybrid Components details for saved run items */}
                          {(item as any).formulaSnapshot &&
                            (item as any).formulaSnapshot.pricingModel ===
                              "HYBRID" && (
                              <div className="w-full mt-1.5 space-y-1 bg-slate-50 p-2 rounded border border-slate-100/60 text-[10.5px]">
                                <div className="font-semibold text-slate-500 text-[9.5px] uppercase tracking-wider">
                                  Hybrid Components
                                </div>
                                {(Array.isArray(
                                  (item as any).formulaSnapshot.components,
                                )
                                  ? (item as any).formulaSnapshot.components
                                  : []
                                ).map((comp: any, cIdx: number) => {
                                  const isPercent =
                                    comp.type === "% Collections";
                                  const clientVal = parseFloat(comp.value) || 0;
                                  const vendorComp = (item as any)
                                    .formulaSnapshot.vendorPricing
                                    ?.components?.[cIdx];
                                  const vendorVal = vendorComp
                                    ? parseFloat(vendorComp.value) || 0
                                    : 0;

                                  const formatCompVal = (val: number) => {
                                    if (isPercent) return `${val.toFixed(2)}%`;
                                    return `$${val.toFixed(2)}`;
                                  };

                                  return (
                                    <div
                                      key={cIdx}
                                      className="flex justify-between items-center text-slate-500"
                                    >
                                      <span>{comp.type}</span>
                                      <span className="font-medium text-slate-700">
                                        Client: {formatCompVal(clientVal)}
                                        {(item as any).formulaSnapshot
                                          .vendorPricing && (
                                          <>
                                            {" "}
                                            | Vendor: {formatCompVal(vendorVal)}
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                        </div>

                        {/* Captured Inputs Section */}
                        {(() => {
                          const matchingSnapshots =
                            selectedRun.inputSnapshots?.filter(
                              (snap) =>
                                snap.serviceId === item.serviceId &&
                                (!snap.sourceReference ||
                                  snap.sourceReference ===
                                    item.agreementServiceTermId),
                            ) || [];
                          if (matchingSnapshots.length === 0) return null;
                          return (
                            <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/40 p-2.5 text-[11px] space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Captured Inputs
                              </span>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {matchingSnapshots.map((snap) => {
                                  const isCollections = [
                                    "collections",
                                    "revenue",
                                    "profit",
                                    "total_collections",
                                    "total_revenue",
                                    "total_profit",
                                  ].some((k) =>
                                    String(snap.metricKey)
                                      .toLowerCase()
                                      .includes(k),
                                  );
                                  const rawVal = Number(snap.metricValue || 0);
                                  const formattedVal = isCollections
                                    ? formatMoney(rawVal)
                                    : snap.metricValue;
                                  return (
                                    <div
                                      key={snap.id}
                                      className="flex justify-between items-center text-slate-600 font-medium"
                                    >
                                      <span className="capitalize text-slate-500">
                                        {String(snap.metricKey).replace(
                                          /_/g,
                                          " ",
                                        )}
                                        :
                                      </span>
                                      <span className="font-semibold text-slate-800">
                                        {formattedVal}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Bottom Row: Cost and Margin summary */}
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-slate-50/50 p-2 border border-slate-100/40 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Vendor Cost</span>
                            <span className="font-semibold text-slate-700">
                              {formatMoney(item.vendorAmount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Margin</span>
                            {(() => {
                              const margin = Number(item.marginAmount || 0);
                              const isNegative = margin < 0;
                              return (
                                <span
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-bold text-[10.5px] ${
                                    isNegative
                                      ? "bg-rose-50 text-rose-700 border border-rose-100/50"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-100/50"
                                  }`}
                                >
                                  {formatMoney(item.marginAmount)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Exceptions list if any exist */}
                        {item.exceptionFlags &&
                          item.exceptionFlags.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {item.exceptionFlags.map((flag: any) => (
                                <span
                                  key={flag}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100/50"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-medium text-slate-700">Invoices</h3>
                <div className="space-y-2">
                  {(() => {
                    const canPreviewInvoice =
                      selectedRun.status !== "POSTED" &&
                      selectedRun.status !== "CLOSED" &&
                      selectedRun.status !== "PENDING";
                    const linkedInvoices = Array.from(
                      new Map(
                        (selectedRun.items || [])
                          .flatMap((item: any) => item.invoiceLineItems || [])
                          .map((line) => line.invoice)
                          .filter(
                            (inv): inv is NonNullable<typeof inv> => !!inv,
                          )
                          .map((inv) => [inv.id, inv]),
                      ).values(),
                    );
                    if (linkedInvoices.length === 0) {
                      return canPreviewInvoice ? (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              billingEndpoints.INVOICE_PREVIEW(selectedRun!.id),
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="w-full rounded-lg border border-[#c7d2fe] bg-indigo-50 px-3 py-3 text-left text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                          <div className="text-[13px] font-semibold">
                            Preview Invoice PDF
                          </div>
                          <div className="text-[11px] text-indigo-500">
                            Generated from calculated items before posting.
                          </div>
                        </button>
                      ) : (
                        <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-slate-400">
                          No invoices created yet.
                        </div>
                      );
                    }
                    return linkedInvoices.map((invoice) => {
                      const canViewInvoicePdf =
                        invoice.status === "SENT" || invoice.status === "PAID";
                      const pdfUrl =
                        invoice.status === "PAID"
                          ? invoice.receiptPdfBlobUrl
                          : invoice.invoicePdfBlobUrl;
                      return (
                        <div
                          key={invoice.id}
                          className="rounded-lg border border-[#f0ece6] px-3 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-700">
                              {invoice.invoiceNumber ||
                                invoice.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-slate-700">
                              {formatMoney(invoice.totalAmount)}
                            </span>
                          </div>
                          <div className="mt-1 text-[12px] text-slate-400">
                            {invoice.status}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            <div>
                              Provider:{" "}
                              <span className="font-medium text-slate-700">
                                {runProviderNames.length > 0
                                  ? runProviderNames.join(", ")
                                  : invoice.providerName ||
                                    selectedRun.practice?.name ||
                                    "-"}
                              </span>
                            </div>
                            {invoice.paidAt && (
                              <div>
                                Payment:{" "}
                                <span className="font-medium text-slate-700">
                                  {formatDateTime(invoice.paidAt)}
                                </span>
                              </div>
                            )}
                            {invoice.payerEmail && (
                              <div>
                                Payer Email:{" "}
                                <span className="font-medium text-slate-700">
                                  {invoice.payerEmail}
                                </span>
                              </div>
                            )}
                            {pdfUrl && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      pdfUrl,
                                      "_blank",
                                      "noopener,noreferrer",
                                    )
                                  }
                                  className="rounded-md border border-[#e2e8f0] px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  View PDF
                                </button>
                              </div>
                            )}
                          </div>
                          {/* {canViewInvoicePdf && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  pdfUrl ||
                                    billingEndpoints.INVOICE_PREVIEW(selectedRun.id),
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                              className="rounded-md border border-[#e2e8f0] px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View PDF
                            </button>
                          </div>
                        )} */}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-medium text-slate-700">
                  Vendor Payables
                </h3>
                <div className="space-y-2">
                  {(selectedRun.vendorPayables || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-slate-400">
                      No vendor payables created yet.
                    </div>
                  ) : (
                    selectedRun.vendorPayables?.map((payable) => (
                      <div
                        key={payable.id}
                        className="rounded-lg border border-[#f0ece6] px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">
                            {payable.vendor?.name ||
                              payable.payableNumber ||
                              payable.id}
                          </span>
                          <span className="text-slate-700">
                            {formatMoney(payable.totalAmount)}
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-400">
                          {payable.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );

  const createPanel = (
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[480px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">
          Create Billing Run
        </h2>
        <button
          type="button"
          onClick={resetCreateForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleCreateRun} className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Practice <span className="text-red-500">*</span>
            </label>
            <select
              value={createForm.practiceId}
              onChange={(event) => {
                setCreateForm((prev) => ({
                  ...prev,
                  practiceId: event.target.value,
                  agreementIds: [],
                  termInputs: {},
                }));
              }}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            >
              <option value="">Select Practice</option>
              {practices.map((practice) => (
                <option key={practice.id} value={practice.id}>
                  {practice.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={createForm.periodStart}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    periodStart: event.target.value,
                  }))
                }
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-700">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={createForm.periodEnd}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    periodEnd: event.target.value,
                  }))
                }
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                required
              />
            </div>
          </div>

          {renderPracticeFeeSetupReadonly()}

          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input
              type="checkbox"
              checked={createForm.autoCalculate}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  autoCalculate: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border border-[#d8d2ca]"
            />
            Auto calculate after creation
          </label>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={createForm.notes}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              rows={3}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          {/* Agreements Selection */}
          {createForm.practiceId && (
            <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
              <h3 className="mb-2 text-[13px] font-medium text-slate-700">
                Agreements
              </h3>
              {isLoadingAgreements ? (
                <div className="flex items-center gap-2 py-3 text-[12px] text-slate-400">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Loading agreements...
                </div>
              ) : practiceAgreements.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-[12px] text-slate-400">
                  No active agreements found for this practice.
                </div>
              ) : (
                <div className="space-y-2">
                  {practiceAgreements.map((agreement) => (
                    <label
                      key={agreement.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-[12px] transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
                    >
                      <input
                        type="checkbox"
                        checked={createForm.agreementIds.includes(agreement.id)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setCreateForm((prev) => ({
                            ...prev,
                            agreementIds: checked
                              ? [...prev.agreementIds, agreement.id]
                              : prev.agreementIds.filter(
                                  (id) => id !== agreement.id,
                                ),
                          }));
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      <span className="flex-1 font-medium text-slate-700">
                        {agreement.type}
                      </span>
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        {agreement.status}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Billing Readiness */}
          <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-medium text-slate-700">
                  Billing Readiness
                </h3>
                <p className="mt-1 text-[12px] text-slate-400">
                  Checks whether the agreement, version, and service terms are
                  ready for billing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void checkReadiness()}
                disabled={isReadinessLoading}
                className="app-control inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium disabled:opacity-50"
              >
                {isReadinessLoading ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Check
              </button>
            </div>

            {!createForm.practiceId ||
            !createForm.periodStart ||
            !createForm.periodEnd ? (
              <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-[12px] text-slate-400">
                Select a practice and billing period to run readiness checks.
              </div>
            ) : readiness ? (
              <div className="space-y-3">
                <div
                  className={`rounded-lg px-3 py-3 text-[12px] ${
                    readiness.isReady
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {readiness.isReady
                    ? "Practice is billing-ready for the selected period."
                    : "Practice is not billing-ready for the selected period."}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-slate-600">
                    Active Agreements: {readiness.summary.activeAgreementCount}
                  </div>
                  <div className="rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-slate-600">
                    Current Versions: {readiness.summary.currentVersionCount}
                  </div>
                  <div className="rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-slate-600">
                    Active Terms: {readiness.summary.activeServiceTermCount}
                  </div>
                  <div className="rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-slate-600">
                    Billable Terms: {readiness.summary.billableServiceTermCount}
                  </div>
                </div>

                <div className="space-y-2">
                  {readiness.issues.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-[12px] text-slate-400">
                      No readiness issues found.
                    </div>
                  ) : (
                    readiness.issues.map((issue, index) => (
                      <div
                        key={`${issue.code}-${index}`}
                        className={`rounded-lg px-3 py-2 text-[12px] ${
                          issue.severity === "ERROR"
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : "border border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        <div className="font-medium">{issue.code}</div>
                        <div className="mt-1">{issue.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-[12px] text-slate-400">
                Readiness has not been checked yet.
              </div>
            )}
          </div>

          {/* Pricing Terms */}
          {createForm.agreementIds.length > 0 && (
            <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-slate-700">
                  Pricing Terms{" "}
                  {activePricingTerms.length > 0 && (
                    <span className="ml-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      {activePricingTerms.length}
                    </span>
                  )}
                </h3>
              </div>
              {isLoadingTerms ? (
                <div className="flex items-center gap-2 py-3 text-[12px] text-slate-400">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Loading pricing terms...
                </div>
              ) : activePricingTerms.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-[12px] text-slate-400">
                  No active pricing terms for the selected agreements and
                  period.
                </div>
              ) : (
                <div className="space-y-3">
                  {activePricingTerms.map((term) => {
                    const preview = computeTermPreview(
                      term,
                      createForm.termInputs[term.id] || {},
                    );
                    const needsInput = modelNeedsInput(term.pricingModel);
                    const config = (term.pricingConfig || {}) as Record<
                      string,
                      any
                    >;

                    return (
                      <div
                        key={term.id}
                        className="overflow-hidden rounded-lg border border-[#ece7df] bg-white"
                      >
                        {/* Term Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-50 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[12px] font-semibold text-slate-800">
                                {term.service?.name || term.serviceId}
                              </span>
                              <span className="inline-flex shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                {getModelLabel(term.pricingModel)}
                              </span>
                            </div>
                            {term.vendor && (
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                Vendor: {term.vendor.name}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rate Info */}
                        <div className="border-b border-slate-50 px-3 py-2">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                            {!needsInput && (
                              <span className="text-slate-500">
                                Fixed amount:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(
                                    parseFloat(config.amount) ||
                                      parseFloat(config.rate) ||
                                      0,
                                  )}
                                </span>
                              </span>
                            )}
                            {[
                              "PER_UNIT",
                              "PER_ENCOUNTER",
                              "PER_PATIENT",
                              "PER_PROVIDER",
                              "PER_SITE",
                            ].includes(term.pricingModel) && (
                              <span className="text-slate-500">
                                Rate:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(
                                    parseFloat(config.rate) ||
                                      parseFloat(config.unitRate) ||
                                      0,
                                  )}
                                </span>
                                /unit
                              </span>
                            )}
                            {[
                              "PERCENT_COLLECTIONS",
                              "PERCENT_REVENUE",
                              "PERCENT_PROFIT",
                              "SUCCESS_FEE",
                            ].includes(term.pricingModel) && (
                              <span className="text-slate-500">
                                Rate:{" "}
                                <span className="font-semibold text-slate-700">
                                  {parseFloat(config.percentage) ||
                                    parseFloat(config.ratePercent) ||
                                    parseFloat(config.rate) ||
                                    0}
                                  %
                                </span>
                              </span>
                            )}
                            {term.pricingModel === "TIERED_VOLUME" && (
                              <span className="text-slate-500">
                                Rate:{" "}
                                <span className="font-semibold text-slate-700">
                                  {config.amount !== undefined &&
                                  config.amount !== "" &&
                                  config.amount !== null
                                    ? `${formatMoney(parseFloat(config.amount))}/unit`
                                    : config.rate !== undefined &&
                                        config.rate !== "" &&
                                        config.rate !== null
                                      ? `${formatMoney(parseFloat(config.rate))}/unit`
                                      : config.unitRate !== undefined &&
                                          config.unitRate !== "" &&
                                          config.unitRate !== null
                                        ? `${formatMoney(parseFloat(config.unitRate))}/unit`
                                        : "Tiers configured"}
                                </span>
                              </span>
                            )}
                            {term.pricingModel ===
                              "CUSTOM_ATTACHMENT_DEFINED" && (
                              <span className="text-slate-500">
                                Rate:{" "}
                                <span className="font-semibold text-slate-700">
                                  {config.amount !== undefined &&
                                  config.amount !== "" &&
                                  config.amount !== null
                                    ? `${formatMoney(parseFloat(config.amount))}`
                                    : config.rate !== undefined &&
                                        config.rate !== "" &&
                                        config.rate !== null
                                      ? `${formatMoney(parseFloat(config.rate))}`
                                      : config.unitRate !== undefined &&
                                          config.unitRate !== "" &&
                                          config.unitRate !== null
                                        ? `${formatMoney(parseFloat(config.unitRate))}`
                                        : "—"}
                                </span>
                              </span>
                            )}
                            {config.vendorRate && (
                              <span className="text-slate-500">
                                Vendor rate:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(parseFloat(config.vendorRate))}
                                </span>
                              </span>
                            )}
                            {config.vendorFlatAmount && (
                              <span className="text-slate-500">
                                Vendor flat:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(
                                    parseFloat(config.vendorFlatAmount),
                                  )}
                                </span>
                              </span>
                            )}
                            {config.vendorPercentOfClient && (
                              <span className="text-slate-500">
                                Vendor %:{" "}
                                <span className="font-semibold text-slate-700">
                                  {config.vendorPercentOfClient}%
                                </span>
                              </span>
                            )}
                            {config.vendorPricing?.percentage !== undefined &&
                              config.vendorPricing?.percentage !== "" && (
                                <span className="text-slate-500">
                                  Vendor %:{" "}
                                  <span className="font-semibold text-slate-700">
                                    {config.vendorPricing.percentage}%
                                  </span>
                                </span>
                              )}
                            {config.vendorPricing?.unitRate !== undefined &&
                              config.vendorPricing?.unitRate !== "" && (
                                <span className="text-slate-500">
                                  Vendor Rate:{" "}
                                  <span className="font-semibold text-slate-700">
                                    {formatMoney(
                                      parseFloat(config.vendorPricing.unitRate),
                                    )}
                                  </span>
                                  /unit
                                </span>
                              )}
                            {config.vendorPricing?.amount !== undefined &&
                              config.vendorPricing?.amount !== "" && (
                                <span className="text-slate-500">
                                  Vendor flat:{" "}
                                  <span className="font-semibold text-slate-700">
                                    {formatMoney(
                                      parseFloat(config.vendorPricing.amount),
                                    )}
                                  </span>
                                </span>
                              )}
                            {config.minimumFee && (
                              <span className="text-slate-500">
                                Min fee:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(Number(config.minimumFee))}
                                </span>
                              </span>
                            )}
                            {config.maximumFee && (
                              <span className="text-slate-500">
                                Max fee:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(Number(config.maximumFee))}
                                </span>
                              </span>
                            )}

                            {config.vendorPricing?.minimumFee && (
                              <span className="text-slate-500">
                                Vendor min fee:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(
                                    Number(config.vendorPricing.minimumFee),
                                  )}
                                </span>
                              </span>
                            )}
                            {config.vendorPricing?.maximumFee && (
                              <span className="text-slate-500">
                                Vendor max fee:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(
                                    Number(config.vendorPricing.maximumFee),
                                  )}
                                </span>
                              </span>
                            )}
                          </div>

                          {term.pricingModel === "HYBRID" && (
                            <div className="w-full mt-1.5 space-y-1 bg-slate-50 p-2 rounded border border-slate-100/60 text-[10.5px]">
                              <div className="font-semibold text-slate-500 text-[9.5px] uppercase tracking-wider">
                                Hybrid Components
                              </div>
                              {(Array.isArray(config.components)
                                ? config.components
                                : []
                              ).map((comp: any, cIdx: number) => {
                                const isPercent = comp.type === "% Collections";
                                const clientVal = parseFloat(comp.value) || 0;
                                const vendorComp =
                                  config.vendorPricing?.components?.[cIdx];
                                const vendorVal = vendorComp
                                  ? parseFloat(vendorComp.value) || 0
                                  : 0;

                                const formatCompVal = (val: number) => {
                                  if (isPercent) return `${val.toFixed(2)}%`;
                                  return `$${val.toFixed(2)}`;
                                };

                                return (
                                  <div
                                    key={cIdx}
                                    className="flex justify-between items-center text-slate-500"
                                  >
                                    <span>{comp.type}</span>
                                    <span className="font-medium text-slate-700">
                                      Client: {formatCompVal(clientVal)}
                                      {config.vendorPricing && (
                                        <>
                                          {" "}
                                          | Vendor: {formatCompVal(vendorVal)}
                                        </>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Dynamic Input */}
                        {needsInput && (
                          <div className="border-b border-slate-50 px-3 py-2.5">
                            {term.pricingModel === "HYBRID" ? (
                              <div className="space-y-3">
                                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                                  Hybrid Component Metrics
                                </span>
                                {(Array.isArray(config.components)
                                  ? config.components
                                  : []
                                ).map((comp: any, idx: number) => {
                                  const type = comp.type;
                                  if (type === "% Collections") {
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <label className="block text-[11px] font-medium text-slate-500">
                                          Total Collections ($) for %
                                          Collections
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={
                                            createForm.termInputs[term.id]
                                              ?.collectionsBase || ""
                                          }
                                          onChange={(event) =>
                                            setCreateForm((prev) => ({
                                              ...prev,
                                              termInputs: {
                                                ...prev.termInputs,
                                                [term.id]: {
                                                  ...prev.termInputs[term.id],
                                                  collectionsBase:
                                                    event.target.value,
                                                },
                                              },
                                            }))
                                          }
                                          placeholder="0.00"
                                          title="Auto-fills from the other line items, but you can override it."
                                          className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                                        />
                                      </div>
                                    );
                                  }
                                  if (type === "Per Encounter") {
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <label className="block text-[11px] font-medium text-slate-500">
                                          Encounters for Per Encounter
                                        </label>
                                        <input
                                          type="number"
                                          step="1"
                                          min="0"
                                          value={
                                            createForm.termInputs[term.id]
                                              ?.encountersQty || ""
                                          }
                                          onChange={(event) =>
                                            setCreateForm((prev) => ({
                                              ...prev,
                                              termInputs: {
                                                ...prev.termInputs,
                                                [term.id]: {
                                                  ...prev.termInputs[term.id],
                                                  encountersQty:
                                                    event.target.value,
                                                },
                                              },
                                            }))
                                          }
                                          placeholder="0"
                                          className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                                        />
                                      </div>
                                    );
                                  }
                                  if (type === "Per Patient") {
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <label className="block text-[11px] font-medium text-slate-500">
                                          Patients for Per Patient
                                        </label>
                                        <input
                                          type="number"
                                          step="1"
                                          min="0"
                                          value={
                                            createForm.termInputs[term.id]
                                              ?.patientsQty || ""
                                          }
                                          onChange={(event) =>
                                            setCreateForm((prev) => ({
                                              ...prev,
                                              termInputs: {
                                                ...prev.termInputs,
                                                [term.id]: {
                                                  ...prev.termInputs[term.id],
                                                  patientsQty:
                                                    event.target.value,
                                                },
                                              },
                                            }))
                                          }
                                          placeholder="0"
                                          className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                                        />
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            ) : term.pricingModel === "PER_CPT_CODE" ? (
                              <div className="space-y-2">
                                <span className="text-[11px] font-medium text-slate-500">
                                  CPT Code Quantities
                                </span>
                                {(Array.isArray(config.cptCodes)
                                  ? config.cptCodes
                                  : []
                                ).map((cpt: any) => {
                                  const code = String(cpt?.code || "").trim();
                                  if (!code) return null;
                                  return (
                                    <div
                                      key={code}
                                      className="flex items-center gap-2"
                                    >
                                      <span className="min-w-0 flex-1 text-[11px] text-slate-600">
                                        <span className="font-mono font-semibold">
                                          {code}
                                        </span>
                                        {cpt.description && (
                                          <span className="ml-1 text-slate-400">
                                            {cpt.description}
                                          </span>
                                        )}
                                        <span className="ml-1 text-slate-400">
                                          @{" "}
                                          {formatMoney(
                                            parseFloat(cpt.rate || "0"),
                                          )}
                                        </span>
                                      </span>
                                      <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={
                                          createForm.termInputs[term.id]
                                            ?.cptQuantities?.[code] || ""
                                        }
                                        onChange={(event) =>
                                          setCreateForm((prev) => ({
                                            ...prev,
                                            termInputs: {
                                              ...prev.termInputs,
                                              [term.id]: {
                                                ...prev.termInputs[term.id],
                                                cptQuantities: {
                                                  ...(prev.termInputs[term.id]
                                                    ?.cptQuantities || {}),
                                                  [code]: event.target.value,
                                                },
                                              },
                                            },
                                          }))
                                        }
                                        placeholder="Qty"
                                        className="app-control w-20 rounded-md px-2 py-1.5 text-[12px] text-right"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : [
                                "PERCENT_COLLECTIONS",
                                "PERCENT_REVENUE",
                                "PERCENT_PROFIT",
                                "SUCCESS_FEE",
                              ].includes(term.pricingModel) ? (
                              <div>
                                {(() => {
                                  const isPercentCollections =
                                    term.pricingModel === "PERCENT_COLLECTIONS";
                                  if (isPercentCollections) {
                                    const currentLines = createForm.termInputs[
                                      term.id
                                    ]?.collectionsLines || [
                                      {
                                        id: "1",
                                        label: "Collections",
                                        amount:
                                          createForm.termInputs[term.id]
                                            ?.baseAmount || "",
                                      },
                                    ];

                                    const updateLines = (
                                      newLines: typeof currentLines,
                                    ) => {
                                      const total = newLines.reduce(
                                        (sum, line) =>
                                          sum + (parseFloat(line.amount) || 0),
                                        0,
                                      );
                                      setCreateForm((prev) => ({
                                        ...prev,
                                        termInputs: {
                                          ...prev.termInputs,
                                          [term.id]: {
                                            ...prev.termInputs[term.id],
                                            collectionsLines: newLines,
                                            baseAmount:
                                              total > 0 ? String(total) : "",
                                          },
                                        },
                                      }));
                                    };

                                    return (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-[11px] font-medium text-slate-500 block">
                                            Collections Name{" "}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nextId = String(Date.now());
                                              const newLines = [
                                                ...currentLines,
                                                {
                                                  id: nextId,
                                                  label: `Collections ${currentLines.length + 1}`,
                                                  amount: "",
                                                },
                                              ];
                                              updateLines(newLines);
                                            }}
                                            className="text-[10px] text-indigo-600 font-semibold hover:underline"
                                          >
                                            + Add Collections
                                          </button>
                                        </div>
                                        {currentLines.map((line, idx) => (
                                          <div
                                            key={line.id}
                                            className="flex gap-2 items-center"
                                          >
                                            <input
                                              type="text"
                                              value={line.label}
                                              onChange={(e) => {
                                                const newLines =
                                                  currentLines.map((l) =>
                                                    l.id === line.id
                                                      ? {
                                                          ...l,
                                                          label: e.target.value,
                                                        }
                                                      : l,
                                                  );
                                                updateLines(newLines);
                                              }}
                                              placeholder="Description"
                                              className="app-control flex-1 rounded-md px-2 py-1 text-[12px]"
                                            />
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              value={line.amount}
                                              onChange={(e) => {
                                                const newLines =
                                                  currentLines.map((l) =>
                                                    l.id === line.id
                                                      ? {
                                                          ...l,
                                                          amount:
                                                            e.target.value,
                                                        }
                                                      : l,
                                                  );
                                                updateLines(newLines);
                                              }}
                                              placeholder="0.00"
                                              className="app-control w-24 rounded-md px-2 py-1 text-[12px] text-right"
                                            />
                                            {currentLines.length > 1 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newLines =
                                                    currentLines.filter(
                                                      (l) => l.id !== line.id,
                                                    );
                                                  updateLines(newLines);
                                                }}
                                                className="text-red-500 text-[12px] font-bold px-1 hover:text-red-700"
                                              >
                                                ×
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div>
                                      <label className="mb-1 block text-[11px] font-medium text-slate-500">
                                        {getModelInputLabel(term.pricingModel)}
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={
                                          createForm.termInputs[term.id]
                                            ?.baseAmount || ""
                                        }
                                        onChange={(event) =>
                                          setCreateForm((prev) => ({
                                            ...prev,
                                            termInputs: {
                                              ...prev.termInputs,
                                              [term.id]: {
                                                ...prev.termInputs[term.id],
                                                baseAmount: event.target.value,
                                              },
                                            },
                                          }))
                                        }
                                        placeholder="0.00"
                                        title="Auto-fills from the other line items, but you can override it."
                                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                                      />
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                                  {getModelInputLabel(term.pricingModel)}
                                </label>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={
                                    createForm.termInputs[term.id]?.quantity ||
                                    ""
                                  }
                                  onChange={(event) =>
                                    setCreateForm((prev) => ({
                                      ...prev,
                                      termInputs: {
                                        ...prev.termInputs,
                                        [term.id]: {
                                          ...prev.termInputs[term.id],
                                          quantity: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  placeholder="0"
                                  className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Preview Amounts */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Client</span>
                            <span className="font-bold text-slate-800">
                              {formatMoney(preview.clientAmount)}
                            </span>
                          </div>
                          {preview.vendorAmount !== null && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Vendor</span>
                              <span className="font-semibold text-slate-600">
                                {formatMoney(preview.vendorAmount)}
                              </span>
                            </div>
                          )}
                          {preview.marginAmount !== null && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Margin</span>
                              <span
                                className={`font-bold ${
                                  preview.marginAmount >= 0
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {formatMoney(preview.marginAmount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {createForm.practiceId && (
            <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-medium text-slate-700">
                    Credentialing{" "}
                    <span className="ml-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      {selectedCredentialingChargePreviewItems.length}/
                      {credentialingChargePreviewItems.length}
                    </span>
                  </h3>
                  <p className="mt-1 text-[12px] text-slate-400">
                    Select the requests to include on the invoice line.
                    Unchecked requests stay out of the run.
                  </p>
                </div>
              </div>
              {alreadyApprovedCredentialingRequests.length > 0 && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[12px] font-semibold text-slate-800">
                        Previously approved credentialing requests{" "}
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          {alreadyApprovedCredentialingRequests.length} Pending
                        </span>
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        These items were approved in an earlier billing run and
                        are pending invoice posting. They will not be included
                        again in this new run.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {alreadyApprovedCredentialingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-800">
                            {request.credentialingId || request.provider}
                            <div className="text-[11px] text-slate-500">
                              Provider:{" "}
                              <span className="font-medium text-slate-700">
                                {request.provider || "-"}
                              </span>
                            </div>
                          </div>
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Approved
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 sm:grid-cols-1">
                          <div>
                            <div className="uppercase tracking-wide text-slate-400">
                              Credentialing Type
                            </div>
                            <div className="mt-0.5 font-medium text-slate-700">
                              {request.credentialingType || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="uppercase tracking-wide text-slate-400">
                              Insurance Plan
                            </div>
                            <div className="mt-0.5 font-medium text-slate-700">
                              {request.insuranceCompany || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="uppercase tracking-wide text-slate-400">
                              Status
                            </div>
                            <div className="mt-0.5 font-medium text-slate-700">
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                                {request.status}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="uppercase tracking-wide text-slate-400">
                              Approved At
                            </div>
                            <div className="mt-0.5 font-medium text-slate-700">
                              {formatDateLabel(
                                request.credentialingChargeBilledAt,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {credentialingChargePreviewItems.length > 0 ? (
                  credentialingChargePreviewItems.map(
                    ({ request, amount, description }) => {
                      const isSelected =
                        createForm.selectedCredentialingRequestIds.includes(
                          request.id,
                        );

                      return (
                        <label
                          key={request.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                            isSelected
                              ? "border-[#ece7df] bg-white"
                              : "border-dashed border-slate-200 bg-slate-50/70 opacity-70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(event) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                selectedCredentialingRequestIds: event.target
                                  .checked
                                  ? Array.from(
                                      new Set([
                                        ...prev.selectedCredentialingRequestIds,
                                        request.id,
                                      ]),
                                    )
                                  : prev.selectedCredentialingRequestIds.filter(
                                      (id) => id !== request.id,
                                    ),
                              }))
                            }
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold text-slate-800">
                              {description}
                            </div>

                            <div className="mt-1 text-[11px] text-slate-500">
                              <span className="mr-3">
                                Provider:{" "}
                                <span className="font-medium text-slate-700">
                                  {request.provider || "-"}
                                </span>
                              </span>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 sm:grid-cols-1">
                              <div>
                                <div className="uppercase tracking-wide text-slate-400">
                                  Credentialing Type
                                </div>
                                <div className="mt-0.5 font-medium text-slate-700">
                                  {request.credentialingType || "-"}
                                </div>
                              </div>
                              <div>
                                <div className="uppercase tracking-wide text-slate-400">
                                  Insurance Plan
                                </div>
                                <div className="mt-0.5 font-medium text-slate-700">
                                  {request.insuranceCompany || "-"}
                                </div>
                              </div>
                              <div>
                                <div className="uppercase tracking-wide text-slate-400">
                                  Status
                                </div>
                                <div className="mt-0.5 font-medium text-slate-700">
                                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
                                    {request.status}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="uppercase tracking-wide text-slate-400">
                                  Last Updated
                                </div>
                                <div className="mt-0.5 font-medium text-slate-700">
                                  {formatDateLabel(request.updatedAt)}
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                              {!isSelected && (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                                  Excluded
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Amount
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                createForm.credentialingChargeAmounts[
                                  request.id
                                ] || amount.toFixed(2)
                              }
                              disabled={!isSelected}
                              onChange={(event) =>
                                setCreateForm((prev) => ({
                                  ...prev,
                                  credentialingChargeAmounts: {
                                    ...prev.credentialingChargeAmounts,
                                    [request.id]: event.target.value,
                                  },
                                }))
                              }
                              className="app-control w-28 rounded-md px-2 py-1 text-right text-[13px] font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>
                        </label>
                      );
                    },
                  )
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-[12px] text-slate-500">
                    No credentialing requests found for this practice.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Run Summary - Invoice & Vendor Payable Totals */}
          {activePricingTerms.length > 0 && (
            <div className="rounded-lg border border-indigo-200/60 bg-gradient-to-br from-indigo-50/40 to-violet-50/30 p-3">
              <h3 className="mb-2 text-sm font-semibold text-indigo-900">
                Run Summary
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-white/80 p-2 text-center shadow-sm">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Net Services
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    {formatMoney(
                      previewTotals.invoiceTotal +
                        credentialingChargePreviewTotal,
                    )}
                  </div>
                </div>

                <div className="rounded-md bg-white/80 p-2 text-center shadow-sm">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Processing Fee
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    {formatMoney(processingFeePreview.clientFeeAmount)}
                  </div>
                </div>

                <div className="rounded-md bg-white/80 p-2 text-center shadow-sm">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Company Absorbed
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    {(() => {
                      const runNetServices =
                        previewTotals.invoiceTotal +
                        credentialingChargePreviewTotal;
                      return formatMoney(
                        runNetServices === 0
                          ? 0
                          : processingFeePreview.companyFeeAmount,
                      );
                    })()}
                  </div>
                </div>

                <div className="rounded-md bg-white/80 p-2 text-center shadow-sm">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Vendor Payable
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-600">
                    {formatMoney(previewTotals.vendorTotal)}
                  </div>
                </div>

                <div className="rounded-md bg-white/80 p-2 text-center shadow-sm col-span-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Gross Invoice
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    {formatMoney(processingFeePreview.grossInvoiceAmount)}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/70 px-3 py-2 text-xs text-slate-600">
                <span>
                  Payment:{" "}
                  {createForm.paymentMethod
                    ? getPaymentMethodLabel(createForm.paymentMethod)
                    : "-"}
                </span>

                <span>Margin: {formatMoney(previewTotals.marginTotal)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
          <button
            type="button"
            onClick={resetCreateForm}
            className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              isReadinessLoading ||
              (Boolean(effectiveCredentialingChargeAmount > 0) &&
                isLoadingCredentialingRequests) ||
              (readiness !== null && !readiness.isReady)
            }
            className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Run"}
          </button>
        </div>
      </form>
    </aside>
  );

  const paymentPanel = (
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">
          Record Payment
        </h2>
        <button
          type="button"
          onClick={resetPaymentForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleRecordPayment} className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Practice <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentForm.practiceId}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  practiceId: event.target.value,
                  allocations: [{ invoiceId: "", allocatedAmount: "" }],
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            >
              <option value="">Select Practice</option>
              {practices.map((practice) => (
                <option key={practice.id} value={practice.id}>
                  {practice.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  amount: event.target.value,
                }))
              }
              placeholder="Amount"
              className="app-control rounded-md px-3 py-2 text-[13px]"
              required
            />
            <input
              type="text"
              value={paymentForm.currency}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  currency: event.target.value,
                }))
              }
              className="app-control rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={paymentForm.paymentDate}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  paymentDate: event.target.value,
                }))
              }
              className="app-control rounded-md px-3 py-2 text-[13px]"
            />
            <input
              type="text"
              value={paymentForm.paymentMethod}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value,
                }))
              }
              placeholder="Payment method"
              className="app-control rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          <input
            type="text"
            value={paymentForm.externalReference}
            onChange={(event) =>
              setPaymentForm((prev) => ({
                ...prev,
                externalReference: event.target.value,
              }))
            }
            placeholder="Reference number"
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />

          <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-slate-700">
                Allocations
              </h3>
              <button
                type="button"
                onClick={() =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    allocations: [
                      ...prev.allocations,
                      { invoiceId: "", allocatedAmount: "" },
                    ],
                  }))
                }
                className="text-[12px] text-[#4f63ea]"
              >
                Add allocation
              </button>
            </div>

            <div className="space-y-3">
              {paymentForm.allocations.map((allocation, index) => (
                <div key={index} className="grid grid-cols-[1fr_120px] gap-3">
                  <select
                    value={allocation.invoiceId}
                    onChange={(event) =>
                      setPaymentForm((prev) => {
                        const next = [...prev.allocations];
                        next[index] = {
                          ...next[index],
                          invoiceId: event.target.value,
                        };
                        return { ...prev, allocations: next };
                      })
                    }
                    className="app-control rounded-md px-3 py-2 text-[13px]"
                  >
                    <option value="">Select Invoice</option>
                    {filteredInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {(invoice.invoiceNumber ||
                          invoice.id.slice(0, 8).toUpperCase()) +
                          " · " +
                          formatMoney(invoice.totalAmount)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={allocation.allocatedAmount}
                    onChange={(event) =>
                      setPaymentForm((prev) => {
                        const next = [...prev.allocations];
                        next[index] = {
                          ...next[index],
                          allocatedAmount: event.target.value,
                        };
                        return { ...prev, allocations: next };
                      })
                    }
                    placeholder="Amount"
                    className="app-control rounded-md px-3 py-2 text-[13px]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
          <button
            type="button"
            onClick={resetPaymentForm}
            className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isRecordingPayment}
            className="app-control rounded-md bg-[#1f7a5b] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {isRecordingPayment ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </aside>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Billing Runs"
        activeModule="Billing"
        activeSubItem="Billing Runs"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading billing runs...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Billing Runs"
        activeModule="Billing"
        activeSubItem="Billing Runs"
      >
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-red-500">{error}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="app-control rounded-md px-4 py-2 text-[14px] font-medium"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Billing Runs"
      activeModule="Billing"
      activeSubItem="Billing Runs"
      navbarIcon={<Receipt className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-split">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>All Billing Runs</span>
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel((current) => !current)}
              >
                Filters
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              <select
                value={filters.practiceId}
                onChange={(event) => {
                  setFilters((prev) => ({
                    ...prev,
                    practiceId: event.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Practices</option>
                {practices.map((practice) => (
                  <option key={practice.id} value={practice.id}>
                    {practice.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(event) => {
                  setFilters((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Statuses</option>
                {billingRunStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFilters({ practiceId: "", status: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.practiceId && !filters.status}
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="relative flex min-h-[400px] items-center justify-center">
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    No billing runs found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Create a billing run to start the billing workflow
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Billing Run
                  </button>
                </div>
              </div>
            ) : (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400 last:border-r-0"
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              onClick={
                                header.column.getCanSort()
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                              className="flex w-full items-center gap-2"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => {
                    const isSelected = row.original.id === selectedRowId;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => handleRowClick(row.original.id)}
                        className={`cursor-pointer ${isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600 last:border-r-0"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-2.5">
              <span className="text-[13px] text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from(
                  { length: pagination.totalPages },
                  (_, index) => index + 1,
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`rounded px-2 py-1 text-[13px] ${
                      pagination.page === page
                        ? "bg-[#4f63ea] text-white"
                        : "text-slate-500 hover:bg-[#f0ece6]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
        {showPaymentForm && paymentPanel}
      </div>
    </AppLayout>
  );
}

export default BillingRunsPage;
