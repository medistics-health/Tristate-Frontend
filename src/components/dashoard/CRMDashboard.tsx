import { useMemo, useState } from "react";
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
  Plus,
} from "lucide-react";
import AppLayout from "../layout/AppLayout";

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

const mockTasks: TaskItem[] = [
  {
    id: "1",
    title: "Follow up with Dr. Smith",
    dueDate: "Today",
    priority: "high",
    relatedTo: "Dr. Smith Medical",
    type: "proposal",
  },
  {
    id: "2",
    title: "Review onboarding form for ABC Practice",
    dueDate: "Today",
    priority: "high",
    relatedTo: "ABC Practice",
    type: "onboarding",
  },
  {
    id: "3",
    title: "Send contract reminder",
    dueDate: "Tomorrow",
    priority: "medium",
    relatedTo: "XYZ Healthcare",
    type: "contract",
  },
  {
    id: "4",
    title: "Fix billing issue for XYZ",
    dueDate: "In 2 days",
    priority: "high",
    relatedTo: "XYZ Clinic",
    type: "billing",
  },
  {
    id: "5",
    title: "Send proposal to New Client",
    dueDate: "In 3 days",
    priority: "medium",
    relatedTo: "New Hope Medical",
    type: "proposal",
  },
];

const mockDeals: DealItem[] = [
  {
    id: "1",
    name: "Dr. Smith Medical",
    value: 24000,
    stage: "Proposal",
    daysInStage: 5,
    closeDate: "Apr 30",
  },
  {
    id: "2",
    name: "ABC Practice",
    value: 18000,
    stage: "Contract",
    daysInStage: 12,
    closeDate: "Apr 25",
  },
  {
    id: "3",
    name: "XYZ Healthcare",
    value: 36000,
    stage: "Negotiation",
    daysInStage: 3,
    closeDate: "May 15",
  },
  {
    id: "4",
    name: "MedPlus Clinic",
    value: 15000,
    stage: "Lead",
    daysInStage: 2,
    closeDate: "May 30",
  },
  {
    id: "5",
    name: "City Medical",
    value: 42000,
    stage: "Proposal",
    daysInStage: 8,
    closeDate: "Apr 20",
  },
];

const mockContracts: ContractItem[] = [
  {
    id: "1",
    name: "ABC Practice",
    status: "sent",
    sentDate: "Apr 10",
    value: 18000,
  },
  {
    id: "2",
    name: "Dr. Smith Medical",
    status: "pending",
    sentDate: "Apr 12",
    value: 24000,
  },
  {
    id: "3",
    name: "XYZ Healthcare",
    status: "signed",
    sentDate: "Apr 5",
    value: 36000,
  },
  {
    id: "4",
    name: "MedPlus Clinic",
    status: "sent",
    sentDate: "Apr 11",
    value: 15000,
  },
];

const mockClients: ClientItem[] = [
  {
    id: "1",
    name: "ABC Practice",
    status: "Active",
    servicesCount: 3,
    lastActivity: "Today",
    revenue: 6000,
  },
  {
    id: "2",
    name: "XYZ Healthcare",
    status: "Active",
    servicesCount: 2,
    lastActivity: "Yesterday",
    revenue: 4500,
  },
  {
    id: "3",
    name: "MedPlus Clinic",
    status: "At Risk",
    servicesCount: 1,
    lastActivity: "30 days ago",
    revenue: 2000,
  },
  {
    id: "4",
    name: "City Medical",
    status: "Active",
    servicesCount: 4,
    lastActivity: "Today",
    revenue: 8000,
  },
];

const mockServiceRevenue: ServiceRevenue[] = [
  { name: "RCM", revenue: 120000, clients: 15 },
  { name: "Credentialing", revenue: 60000, clients: 12 },
  { name: "Marketing", revenue: 40000, clients: 8 },
  { name: "Billing", revenue: 35000, clients: 6 },
  { name: "Consulting", revenue: 25000, clients: 4 },
];

const mockInvoices: InvoiceItem[] = [
  {
    id: "1",
    client: "ABC Practice",
    amount: 6000,
    dueDate: "Apr 20",
    status: "pending",
  },
  {
    id: "2",
    client: "XYZ Healthcare",
    amount: 4500,
    dueDate: "Apr 15",
    status: "overdue",
  },
  {
    id: "3",
    client: "MedPlus Clinic",
    amount: 2000,
    dueDate: "Apr 18",
    status: "pending",
  },
  {
    id: "4",
    client: "City Medical",
    amount: 8000,
    dueDate: "Apr 10",
    status: "paid",
  },
];

const mockAudits: AuditItem[] = [
  {
    id: "1",
    client: "ABC Practice",
    status: "Completed",
    recommendations: 3,
    completed: true,
  },
  {
    id: "2",
    client: "XYZ Healthcare",
    status: "In Progress",
    recommendations: 5,
    completed: false,
  },
  {
    id: "3",
    client: "MedPlus Clinic",
    status: "Scheduled",
    recommendations: 0,
    completed: false,
  },
];

const mockPartners: PartnerItem[] = [
  { id: "1", name: "Partner A", leads: 12, revenue: 45000, deals: 3 },
  { id: "2", name: "Partner B", leads: 8, revenue: 32000, deals: 2 },
  { id: "3", name: "Partner C", leads: 5, revenue: 18000, deals: 1 },
];

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
      className={`app-panel flex flex-col overflow-hidden rounded-2xl border border-[#e8e3db] bg-white ${className}`}
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
      <div className="flex-1 overflow-auto p-4">{children}</div>
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
    <div className="flex items-center justify-between rounded-xl border border-[#ece8e1] bg-white p-4">
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
            <span className="text-[12px] text-slate-400">vs last month</span>
          </div>
        )}
      </div>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: TaskItem;
}

function TaskRow({ task }: TaskRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#f1ede8] p-3 hover:bg-[#faf9f7]">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full ${getPriorityColor(task.priority)}`}
      >
        <CheckCircle className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-700 truncate">
          {task.title}
        </p>
        <p className="text-[12px] text-slate-400">{task.relatedTo}</p>
      </div>
      <div className="flex flex-col items-end">
        <span
          className={`text-[12px] font-medium ${task.dueDate === "Today" ? "text-red-500" : "text-slate-500"}`}
        >
          {task.dueDate}
        </span>
        <span className="text-[11px] capitalize text-slate-400">
          {task.type}
        </span>
      </div>
    </div>
  );
}

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
          {deal.stage} • {deal.daysInStage} days
        </p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-slate-700">
          {formatCurrency(deal.value)}
        </p>
        <span
          className={`text-[11px] ${getStageColor(deal.stage)} px-2 py-0.5 rounded-full`}
        >
          {deal.stage}
        </span>
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
          {client.servicesCount} services • {client.lastActivity}
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
    <div className="flex items-center justify-between rounded-lg border border-[#f1ede8] p-3 hover:bg-[#faf9f7]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-700 truncate">
          {audit.client}
        </p>
        <p className="text-[12px] text-slate-400">{audit.status}</p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-slate-700">
          {audit.recommendations} recs
        </p>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${audit.completed ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}
        >
          {audit.completed ? "Completed" : "In Progress"}
        </span>
      </div>
    </div>
  );
}

interface PartnerRowProps {
  partner: PartnerItem;
}

function PartnerRow({ partner }: PartnerRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#f1ede8] p-3 hover:bg-[#faf9f7]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-700 truncate">
          {partner.name}
        </p>
        <p className="text-[12px] text-slate-400">
          {partner.leads} leads • {partner.deals} deals
        </p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-slate-700">
          {formatCurrency(partner.revenue)}
        </p>
      </div>
    </div>
  );
}

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

  const stats = useMemo(() => {
    const totalPipeline = mockDeals.reduce((sum, deal) => sum + deal.value, 0);
    const dealsClosingThisMonth = mockDeals.filter((d) =>
      d.closeDate.includes("Apr"),
    ).length;
    const contractsPending = mockContracts.filter(
      (c) => c.status !== "signed",
    ).length;
    const activeClients = mockClients.filter(
      (c) => c.status === "Active",
    ).length;
    const clientsAtRisk = mockClients.filter(
      (c) => c.status === "At Risk",
    ).length;
    const totalRevenue = mockServiceRevenue.reduce(
      (sum, s) => sum + s.revenue,
      0,
    );
    const invoicesDue = mockInvoices.filter(
      (i) => i.status === "pending",
    ).length;
    const overdueInvoices = mockInvoices.filter(
      (i) => i.status === "overdue",
    ).length;
    const totalInvoices = mockInvoices.reduce((sum, i) => sum + i.amount, 0);
    const auditsOpen = mockAudits.filter((a) => !a.completed).length;
    const totalPartnerRevenue = mockPartners.reduce(
      (sum, p) => sum + p.revenue,
      0,
    );
    const tasksOverdue = mockTasks.filter((t) => t.dueDate === "Today").length;

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
      totalPartnerRevenue,
      tasksOverdue,
      totalTasks: mockTasks.length,
      totalDeals: mockDeals.length,
      totalContracts: mockContracts.length,
      totalClients: mockClients.length,
      totalPartners: mockPartners.length,
    };
  }, []);

  const renderTasksSection = () => (
    <div className="space-y-2">
      {mockTasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );

  const renderPipelineSection = () => (
    <div className="space-y-2">
      {mockDeals.map((deal) => (
        <DealRow key={deal.id} deal={deal} />
      ))}
    </div>
  );

  const renderContractsSection = () => (
    <div className="space-y-2">
      {mockContracts.map((contract) => (
        <ContractRow key={contract.id} contract={contract} />
      ))}
    </div>
  );

  const renderClientsSection = () => (
    <div className="space-y-2">
      {mockClients.map((client) => (
        <ClientRow key={client.id} client={client} />
      ))}
    </div>
  );

  const renderServicesSection = () => (
    <div className="space-y-2">
      {mockServiceRevenue.map((service) => (
        <ServiceRevenueRow key={service.name} service={service} />
      ))}
    </div>
  );

  const renderBillingSection = () => (
    <div className="space-y-2">
      {mockInvoices.map((invoice) => (
        <InvoiceRow key={invoice.id} invoice={invoice} />
      ))}
    </div>
  );

  const renderAuditsSection = () => (
    <div className="space-y-2">
      {mockAudits.map((audit) => (
        <AuditRow key={audit.id} audit={audit} />
      ))}
    </div>
  );

  const renderPartnersSection = () => (
    <div className="space-y-2">
      {mockPartners.map((partner) => (
        <PartnerRow key={partner.id} partner={partner} />
      ))}
    </div>
  );

  const renderAlertsSection = () => {
    const overdueInvoices = mockInvoices.filter((i) => i.status === "overdue");
    const atRiskClients = mockClients.filter((c) => c.status === "At Risk");
    const unsignedContracts = mockContracts.filter((c) => c.status === "sent");

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
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              alert.severity === "high"
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
                className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                  selectedRole === role
                    ? "bg-[#4f63ea] text-white"
                    : "bg-white text-slate-600 hover:bg-[#f7f5f1]"
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SectionCard
                title="Contracts & Onboarding"
                icon={<FileText className="h-4 w-4" />}
              >
                {renderContractsSection()}
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
                title="Billing & Cash Flow"
                icon={<Briefcase className="h-4 w-4" />}
              >
                {renderBillingSection()}
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
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
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Billing & Invoices"
                icon={<DollarSign className="h-4 w-4" />}
              >
                {renderBillingSection()}
              </SectionCard>

              <SectionCard
                title="Revenue by Service"
                icon={<TrendingUp className="h-4 w-4" />}
              >
                {renderServicesSection()}
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
