import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  Briefcase,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Target,
  Zap,
  Loader2,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { getAllInvoices } from "../../services/operations/invoices";
import { getAllPractices } from "../../services/operations/practices";
import { getAllAgreements } from "../../services/operations/agreements";
import { getServicesView } from "../../services/operations/services";
import { getAuditsView } from "../../services/operations/audits";
import { getAllDeals } from "../../services/operations/deals";
import { getSyncSummary, type SyncSummary } from "../../services/operations/quickbooks";

type DashboardRole = "executive" | "sales" | "operations" | "finance";

type TaskItem = {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  relatedTo: string;
  type: "followup" | "onboarding" | "contract" | "billing" | "proposal";
};

type DealItem = {
  id: string;
  name: string;
  value: number;
  stage: string;
  daysInStage: number;
  closeDate: string;
};

type ContractItem = {
  id: string;
  name: string;
  status: "sent" | "signed" | "pending";
  sentDate: string;
  value: number;
};

type ClientItem = {
  id: string;
  name: string;
  status: string;
  servicesCount: number;
  lastActivity: string;
  revenue: number;
};

type ServiceRevenue = {
  name: string;
  revenue: number;
  clients: number;
};

type InvoiceItem = {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: "pending" | "overdue" | "paid";
};

type AuditItem = {
  id: string;
  client: string;
  status: string;
  recommendations: number;
  completed: boolean;
};

type PartnerItem = {
  id: string;
  name: string;
  leads: number;
  revenue: number;
  deals: number;
};

// Mock data removed as we are using real API data

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getPriorityColor(priority: TaskItem["priority"]) {
  switch (priority) {
    case "high":
      return "bg-red-50 text-red-600";
    case "medium":
      return "bg-amber-50 text-amber-600";
    case "low":
      return "bg-slate-50 text-slate-500";
  }
}

function getStageColor(stage: string) {
  switch (stage) {
    case "Lead":
      return "bg-blue-50 text-blue-600";
    case "Proposal":
      return "bg-purple-50 text-purple-600";
    case "Contract":
      return "bg-amber-50 text-amber-600";
    case "Negotiation":
      return "bg-orange-50 text-orange-600";
    case "Closed Won":
      return "bg-green-50 text-green-600";
    default:
      return "bg-slate-50 text-slate-500";
  }
}

function getContractStatusColor(status: ContractItem["status"]) {
  switch (status) {
    case "signed":
      return "bg-green-50 text-green-600";
    case "sent":
      return "bg-blue-50 text-blue-600";
    case "pending":
      return "bg-amber-50 text-amber-600";
  }
}

function getInvoiceStatusColor(status: InvoiceItem["status"]) {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-600";
    case "pending":
      return "bg-blue-50 text-blue-600";
    case "overdue":
      return "bg-red-50 text-red-600";
  }
}

function getClientStatusColor(status: string) {
  switch (status) {
    case "Active":
      return "bg-green-50 text-green-600";
    case "At Risk":
      return "bg-red-50 text-red-600";
    case "Inactive":
      return "bg-slate-50 text-slate-500";
    default:
      return "bg-blue-50 text-blue-600";
  }
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

function SectionCard({
  title,
  icon,
  children,
  action,
  className = "",
}: SectionCardProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border border-[#e8e3db] bg-white ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#eeebe5] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <span className="text-[14px] font-semibold text-slate-700">
            {title}
          </span>
        </div>
        {action}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg?: string;
}

function StatCard({
  label,
  value,
  change,
  icon,
  iconBg = "bg-blue-50",
}: StatCardProps) {
  const isPositive = change && change > 0;

  return (
    <div className="flex items-center justify-between rounded-lg border border-[#ece8e1] bg-white p-4">
      <div>
        <p className="text-[12px] text-slate-500">{label}</p>
        <p className="mt-1 text-[20px] font-semibold text-slate-700">{value}</p>
        {change !== undefined && (
          <div className="mt-1 flex items-center gap-1">
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
            <span
              className={`text-[12px] ${isPositive ? "text-green-600" : "text-red-600"}`}
            >
              {Math.abs(change)}%
            </span>
            <span className="text-[12px] text-slate-400 ml-1">vs last month</span>
          </div>
        )}
      </div>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
    </div>
  );
}

// TaskRow removed as we use real data components

interface DealRowProps {
  deal: DealItem;
}

function DealRow({ deal }: DealRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#f1ede8] p-3 hover:bg-[#faf9f7]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-700 truncate">
          {deal.name}
        </p>
        <p className="text-[12px] text-slate-400">
          {deal.stage} • {deal.daysInStage}d
        </p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-slate-700">
          {formatCurrency(deal.value)}
        </p>
      </div>
    </div>
  );
}

interface ContractRowProps {
  contract: ContractItem;
}

function ContractRow({ contract }: ContractRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#f1ede8] p-3 hover:bg-[#faf9f7]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-700 truncate">
          {contract.name}
        </p>
        <p className="text-[12px] text-slate-400">Sent: {contract.sentDate}</p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-slate-700">
          {formatCurrency(contract.value)}
        </p>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${getContractStatusColor(contract.status)}`}
        >
          {contract.status}
        </span>
      </div>
    </div>
  );
}

interface ClientRowProps {
  client: ClientItem;
}

function ClientRow({ client }: ClientRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#f1ede8] p-3 hover:bg-[#faf9f7]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-700 truncate">
          {client.name}
        </p>
        <p className="text-[12px] text-slate-400">
          {client.servicesCount} services
        </p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-slate-700">
          {formatCurrency(client.revenue)}/mo
        </p>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${getClientStatusColor(client.status)}`}
        >
          {client.status}
        </span>
      </div>
    </div>
  );
}

interface InvoiceRowProps {
  invoice: InvoiceItem;
}

function InvoiceRow({ invoice }: InvoiceRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#f1ede8] p-3 hover:bg-[#faf9f7]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-700 truncate">
          {invoice.client}
        </p>
        <p className="text-[12px] text-slate-400">Due: {invoice.dueDate}</p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-slate-700">
          {formatCurrency(invoice.amount)}
        </p>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${getInvoiceStatusColor(invoice.status)}`}
        >
          {invoice.status}
        </span>
      </div>
    </div>
  );
}

interface AuditRowProps {
  audit: AuditItem;
}

function AuditRow({ audit }: AuditRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-50 p-3 hover:bg-slate-50/50 transition-all group">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
          {audit.client}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400 font-medium uppercase tracking-tighter">{audit.status}</p>
      </div>
      <div className="text-right">
        {/*<p className="text-[13px] font-semibold text-slate-700">
          {audit.recommendations} recs
        </p>*/}
        <span
          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${audit.completed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
        >
          {audit.completed ? "Done" : "Pending"}
        </span>
      </div>
    </div>
  );
}

// PartnerRow removed as we use real data components

interface ServiceRevenueRowProps {
  service: ServiceRevenue;
}

function ServiceRevenueRow({ service }: ServiceRevenueRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#f1ede8] p-3 hover:bg-[#faf9f7]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-700">{service.name}</p>
        <p className="text-[12px] text-slate-400">{service.clients} clients</p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-slate-700">
          {formatCurrency(service.revenue)}
        </p>
      </div>
    </div>
  );
}

const roleLabels: Record<DashboardRole, string> = {
  executive: "Executive",
  sales: "Sales",
  operations: "Operations",
  finance: "Finance",
};

export default function CRMDashboardPage() {
  const [selectedRole, setSelectedRole] = useState<DashboardRole>("executive");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [practices, setPractices] = useState<ClientItem[]>([]);
  const [agreements, setAgreements] = useState<ContractItem[]>([]);
  const [services, setServices] = useState<ServiceRevenue[]>([]);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [
          invoicesData,
          practicesData,
          agreementsData,
          servicesData,
          auditsData,
          dealsData,
        ] = await Promise.all([
          getAllInvoices().catch(() => []),
          getAllPractices().catch(() => []),
          getAllAgreements().catch(() => []),
          getServicesView({ limit: 100 }).catch(() => ({ rows: [] })),
          getAuditsView({ limit: 100 }).catch(() => ({ rows: [] })),
          getAllDeals().catch(() => []),
          getSyncSummary().catch(() => null),
        ]);

        setInvoices(
          invoicesData.slice(0, 10).map((inv: any) => ({
            id: inv.id,
            client: inv.practice?.name || "Unknown",
            amount: parseFloat(inv.totalAmount) || 0,
            dueDate: inv.dueDate || "N/A",
            status:
              inv.status === "PAID"
                ? ("paid" as const)
                : inv.status === "OVERDUE"
                  ? ("overdue" as const)
                  : ("pending" as const),
          })),
        );

        setPractices(
          practicesData.slice(0, 10).map((prac: any) => ({
            id: prac.id,
            name: prac.name,
            status: prac.status || "Active",
            servicesCount: prac._count?.deals || 0,
            lastActivity: prac.updatedAt || "Today",
            revenue: 0,
          })),
        );

        setAgreements(
          agreementsData.slice(0, 10).map((agr: any) => ({
            id: agr.id,
            name: agr.practice?.name || "Unknown",
            status:
              agr.status === "SIGNED"
                ? ("signed" as const)
                : agr.status === "PENDING"
                  ? ("pending" as const)
                  : ("sent" as const),
            sentDate: agr.createdAt || "N/A",
            value: agr.value || 0,
          })),
        );

        setServices(
          (servicesData as any)?.rows?.slice(0, 10).map((srv: any) => ({
            name: srv.values?.name || "Unknown",
            revenue: 0,
            clients: 0,
          })) || [],
        );

        setAudits(
          (auditsData as any)?.rows?.slice(0, 10).map((aud: any) => ({
            id: aud.id,
            client: aud.values?.practiceName || "Unknown",
            status: aud.values?.status || "Scheduled",
            recommendations: aud.values?.recommendations || 0,
            completed: aud.values?.status === "Completed",
          })) || [],
        );

        setDeals(
          dealsData.slice(0, 10).map((deal: any) => ({
            id: deal.id,
            name: deal.practice?.name || "Unknown",
            value: deal.value || 0,
            stage: deal.stage || "LEAD",
            daysInStage: 0,
            closeDate: deal.expectedCloseDate || "N/A",
          })),
        );
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalPipeline = deals.reduce(
      (sum, deal) => sum + (deal.value || 0),
      0,
    );
    const dealsClosingThisMonth = deals.filter((d) => {
      if (!d.closeDate) return false;
      const closeDate = new Date(d.closeDate);
      const now = new Date();
      return (
        closeDate.getMonth() === now.getMonth() &&
        closeDate.getFullYear() === now.getFullYear()
      );
    }).length;
    const contractsPending = agreements.filter(
      (c) => c.status !== "signed",
    ).length;
    const activeClients = practices.filter((c) => c.status === "Active").length;
    const clientsAtRisk = practices.filter(
      (c) => c.status === "At Risk",
    ).length;
    const totalRevenue = services.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const invoicesDue = invoices.filter((i) => i.status === "pending").length;
    const overdueInvoices = invoices.filter(
      (i) => i.status === "overdue",
    ).length;
    const totalInvoices = invoices.reduce((sum, i) => sum + i.amount, 0);
    const auditsOpen = audits.filter((a) => !a.completed).length;

    return {
      totalPipeline,
      dealsClosingThisMonth,
      contractsPending,
      activeClients,
      clientsAtRisk,
      totalRevenue,
      invoicesDue,
      overdueInvoices,
      totalInvoices,
      auditsOpen,
      totalPartnerRevenue: 0,
      tasksOverdue: 0,
      totalTasks: 0,
      totalDeals: deals.length,
      totalContracts: agreements.length,
      totalClients: practices.length,
      totalPartners: 0,
    };
  }, [deals, agreements, practices, services, invoices, audits]);

  const renderTasksSection = () => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : (
        <p className="text-[13px] text-slate-400">No tasks available</p>
      )}
    </div>
  );

  const renderPipelineSection = () => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : deals.length > 0 ? (
        deals.map((deal) => <DealRow key={deal.id} deal={deal} />)
      ) : (
        <p className="text-[13px] text-slate-400">No deals available</p>
      )}
    </div>
  );

  const renderContractsSection = () => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : agreements.length > 0 ? (
        agreements.map((contract) => (
          <ContractRow key={contract.id} contract={contract} />
        ))
      ) : (
        <p className="text-[13px] text-slate-400">No contracts available</p>
      )}
    </div>
  );

  const renderClientsSection = () => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : practices.length > 0 ? (
        practices.map((client) => <ClientRow key={client.id} client={client} />)
      ) : (
        <p className="text-[13px] text-slate-400">No clients available</p>
      )}
    </div>
  );

  const renderServicesSection = () => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : services.length > 0 ? (
        services.map((service, idx) => (
          <ServiceRevenueRow key={idx} service={service} />
        ))
      ) : (
        <p className="text-[13px] text-slate-400">No services available</p>
      )}
    </div>
  );

  const renderBillingSection = () => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : invoices.length > 0 ? (
        invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} />
        ))
      ) : (
        <p className="text-[13px] text-slate-400">No invoices available</p>
      )}
    </div>
  );

  const renderAuditsSection = () => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : audits.length > 0 ? (
        audits.map((audit) => <AuditRow key={audit.id} audit={audit} />)
      ) : (
        <p className="text-[13px] text-slate-400">No audits available</p>
      )}
    </div>
  );

  const renderPartnersSection = () => (
    <div className="space-y-2">
      <p className="text-[13px] text-slate-400">No partners available</p>
    </div>
  );

  const renderAlertsSection = () => {
    const overdueInvoices = invoices.filter((i) => i.status === "overdue");
    const atRiskClients = practices.filter((c) => c.status === "At Risk");
    const unsignedContracts = agreements.filter((c) => c.status === "sent");

    const alerts: Array<{
      type: "billing" | "client" | "contract";
      message: string;
      severity: "high" | "medium";
    }> = [];

    for (const i of overdueInvoices) {
      alerts.push({
        type: "billing",
        message: `Overdue invoice: ${i.client}`,
        severity: "high",
      });
    }
    for (const c of atRiskClients) {
      alerts.push({
        type: "client",
        message: `Client at risk: ${c.name}`,
        severity: "high",
      });
    }
    for (const c of unsignedContracts) {
      alerts.push({
        type: "contract",
        message: `Contract unsigned: ${c.name}`,
        severity: "medium",
      });
    }

    if (alerts.length === 0) {
      return <p className="text-[13px] text-slate-400">No active alerts</p>;
    }

    return (
      <div className="space-y-2">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 rounded-lg border p-3 ${alert.severity === "high"
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
              }`}
          >
            <AlertTriangle
              className={`h-4 w-4 ${alert.severity === "high" ? "text-red-500" : "text-amber-500"}`}
            />
            <span
              className={`text-[13px] ${alert.severity === "high" ? "text-red-700" : "text-amber-700"}`}
            >
              {alert.message}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderSyncSection = () => (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : syncSummary ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Synced</p>
              <p className="mt-1 text-xl font-black text-emerald-700">{syncSummary.COMPLETED}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Failed</p>
              <p className="mt-1 text-xl font-black text-red-700">{syncSummary.FAILED}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#ece8e1] bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-500">Sync Success Rate</span>
              <span className="text-[12px] font-bold text-slate-700">
                {syncSummary.total > 0 ? Math.round((syncSummary.COMPLETED / syncSummary.total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${syncSummary.total > 0 ? (syncSummary.COMPLETED / syncSummary.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-center text-slate-400 italic">Data from last 30 days</p>
        </>
      ) : (
        <p className="text-[13px] text-slate-400">Sync data unavailable</p>
      )}
    </div>
  );

  // const navbarActions = [
  //   {
  //     label: "New Task",
  //     icon: <Plus className="h-4 w-4" />,
  //     onClick: () => {},
  //   },
  // ];

  return (
    <AppLayout
      title="CRM Dashboard"
      activeModule="Dashboards"
      navbarIcon={<BarChart3 className="h-4 w-4 text-slate-500" />}
    // navbarActions={""}
    >
      <div className="flex flex-col gap-4 font-app-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(
              ["executive", "sales", "operations", "finance"] as DashboardRole[]
            ).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${selectedRole === role
                  ? "bg-[#4f63ea] text-white shadow-sm"
                  : "bg-white border border-[#e8e3db] text-slate-600 hover:bg-[#f7f5f1]"
                  }`}
              >
                {roleLabels[role]}
              </button>
            ))}
          </div>
        </div>

        {(selectedRole === "executive" || selectedRole === "sales") && (
          <div className="grid grid-cols-1 gap-4.sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Pipeline"
              value={formatCurrency(stats.totalPipeline)}
              change={12}
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
              iconBg="bg-blue-50"
            />
            <StatCard
              label="Deals Closing This Month"
              value={stats.dealsClosingThisMonth}
              icon={<Target className="h-5 w-5 text-purple-500" />}
              iconBg="bg-purple-50"
            />
            <StatCard
              label="Active Clients"
              value={stats.activeClients}
              icon={<Users className="h-5 w-5 text-green-500" />}
              iconBg="bg-green-50"
            />
            <StatCard
              label="Contracts Pending"
              value={stats.contractsPending}
              icon={<FileText className="h-5 w-5 text-amber-500" />}
              iconBg="bg-amber-50"
            />
          </div>
        )}

        {selectedRole === "executive" && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionCard
                title="My Tasks & Action Items"
                icon={<Clock className="h-4 w-4" />}
              >
                {renderTasksSection()}
              </SectionCard>

              <SectionCard
                title="Pipeline Snapshot"
                icon={<TrendingUp className="h-4 w-4" />}
              >
                {renderPipelineSection()}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SectionCard
                title="QuickBooks Sync Health"
                icon={<RefreshCw className="h-4 w-4" />}
              >
                {renderSyncSection()}
              </SectionCard>

              <SectionCard
                title="Active Clients"
                icon={<Users className="h-4 w-4" />}
              >
                {renderClientsSection()}
              </SectionCard>

              <SectionCard
                title="Revenue by Service"
                icon={<DollarSign className="h-4 w-4" />}
              >
                {renderServicesSection()}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Contracts & Onboarding"
                icon={<FileText className="h-4 w-4" />}
              >
                {renderContractsSection()}
              </SectionCard>

              <SectionCard
                title="Alerts & Risks"
                icon={<AlertTriangle className="h-4 w-4" />}
              >
                {renderAlertsSection()}
              </SectionCard>
            </div>
          </>
        )}

        {selectedRole === "sales" && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="My Tasks & Action Items"
                icon={<Clock className="h-4 w-4" />}
              >
                {renderTasksSection()}
              </SectionCard>

              <SectionCard
                title="Pipeline Snapshot"
                icon={<TrendingUp className="h-4 w-4" />}
              >
                {renderPipelineSection()}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Contracts Pending"
                icon={<FileText className="h-4 w-4" />}
              >
                {renderContractsSection()}
              </SectionCard>

              <SectionCard
                title="Channel Partners"
                icon={<Zap className="h-4 w-4" />}
              >
                {renderPartnersSection()}
              </SectionCard>
            </div>
          </>
        )}

        {selectedRole === "operations" && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="My Tasks & Action Items"
                icon={<Clock className="h-4 w-4" />}
              >
                {renderTasksSection()}
              </SectionCard>

              <SectionCard
                title="Active Clients"
                icon={<Users className="h-4 w-4" />}
              >
                {renderClientsSection()}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Onboarding Status"
                icon={<Activity className="h-4 w-4" />}
              >
                {renderContractsSection()}
              </SectionCard>

              <SectionCard
                title="Audits & Recommendations"
                icon={<Shield className="h-4 w-4" />}
              >
                {renderAuditsSection()}
              </SectionCard>
            </div>
          </>
        )}

        {selectedRole === "finance" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                label="Revenue (Monthly)"
                value={formatCurrency(stats.totalRevenue)}
                change={8}
                icon={<DollarSign className="h-5 w-5 text-green-500" />}
                iconBg="bg-green-50"
              />
              <StatCard
                label="Invoices Due"
                value={stats.invoicesDue}
                icon={<FileText className="h-5 w-5 text-blue-500" />}
                iconBg="bg-blue-50"
              />
              <StatCard
                label="Overdue Invoices"
                value={stats.overdueInvoices}
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                iconBg="bg-red-50"
              />
              <StatCard
                label="Total A/R"
                value={formatCurrency(stats.totalInvoices)}
                icon={<Briefcase className="h-5 w-5 text-amber-500" />}
                iconBg="bg-amber-50"
              />
              <StatCard
                label="Sync Health"
                value={syncSummary ? `${Math.round((syncSummary.COMPLETED / (syncSummary.total || 1)) * 100)}%` : "0%"}
                icon={<RefreshCw className={`h-5 w-5 ${syncSummary && syncSummary.FAILED > 0 ? "text-amber-500" : "text-emerald-500"}`} />}
                iconBg={syncSummary && syncSummary.FAILED > 0 ? "bg-amber-50" : "bg-emerald-50"}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Billing & Invoices"
                icon={<DollarSign className="h-4 w-4" />}
              >
                {renderBillingSection()}
              </SectionCard>

              <SectionCard
                title="QuickBooks Sync Health"
                icon={<RefreshCw className="h-4 w-4" />}
              >
                {renderSyncSection()}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Revenue by Service"
                icon={<TrendingUp className="h-4 w-4" />}
              >
                {renderServicesSection()}
              </SectionCard>
              <SectionCard
                title="Financial Alerts"
                icon={<AlertTriangle className="h-4 w-4" />}
              >
                {renderAlertsSection()}
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
