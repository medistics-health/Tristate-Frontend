import {
  Backpack,
  User,
  Building2,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Shield,
  LayoutDashboard,
  Target,
  Users,
  ShoppingCart,
  ListOrdered,
  FileText,
  Briefcase,
  Share2,
  ClipboardCheck,
  BarChart3,
  Calculator,
  CreditCard,
  Receipt,
  FileSignature,
  Truck,
  Stethoscope,
  Zap,
  Settings2,
  Globe,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BUSINESS_WRITE_ROLES,
  hasAdminAccess,
  hasAnyRole,
  MODULE_ACCESS,
  readStoredUser,
  type UserRole,
} from "../../utils/auth";

type SidebarSectionItem = {
  label: string;
  to?: string;
  adminOnly?: boolean;
  requiredRoles?: UserRole[];
};

type SidebarItem = {
  label: string;
  to?: string;
  items?: SidebarSectionItem[];
  adminOnly?: boolean;
  requiredRoles?: UserRole[];
};

const sidebarSteps: SidebarItem[] = [
  {
    label: "Dashboards",
    to: "/dashboard",
    requiredRoles: [...MODULE_ACCESS.DASHBOARD],
  },
  // {
  //   label: "Client Portal",
  //   to: "/portal",
  //   requiredRoles: [...MODULE_ACCESS.DASHBOARD],
  // },
  {
    label: "Lead",
    to: "/lead/create",
    requiredRoles: [...BUSINESS_WRITE_ROLES],
  },
  {
    label: "Deal",
    to: "/deal/all-deals",
    requiredRoles: [...MODULE_ACCESS.CRM],
  },
  {
    label: "People",
    to: "/people/all-peoples",
    requiredRoles: [...MODULE_ACCESS.CRM],
  },
  {
    label: "Company",
    to: "/company/all-companies",
    requiredRoles: [...MODULE_ACCESS.CRM],
  },
  {
    label: "Communication",
    to: "/communication/all-emails",
    requiredRoles: [...MODULE_ACCESS.CRM],
  },
  {
    label: "Practices",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "All Practices", to: "/practice/all-practices" },
      // { label: "Pipeline Board", to: "/practice/pipeline" },
      { label: "Active Practices", to: "/practice/active-practice" },
      // { label: "Prospects", to: "/practice/prospects" },
      // { label: "Reminders Due", to: "/practice/reminder-dues" },
    ],
  },
  {
    label: "Agreements",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "All Agreements", to: "/agreements/all-agreements" },
      // { label: "Agreement Pipeline", to: "/agreements/pipeline" },
      {
        label: "Pending Approval",
        to: "/agreements/pending-approval",
        adminOnly: true,
      },
      {
        label: "Pending Submission Changes",
        to: "/agreements/pending-submission-changes",
        adminOnly: true,
      },
      { label: "Pending Signatures", to: "/agreements/pending-signatures" },
    ],
  },
  {
    label: "Onboarding",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "New Onboarding", to: "/onboarding/scope" },
      { label: "Completed Submissions", to: "/onboarding/review" },
      { label: "Pending Submissions", to: "/onboarding/scope-list" },
    ],
  },
  {
    label: "Services",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "All Services", to: "/service/all-services" },
    ],
  },
  {
    label: "Pricing Engine",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      {
        label: "Rate Finalization",
        to: "/pricing-engine/rate-finalization",
      },
    ],
  },
  {
    label: "Billing",
    requiredRoles: [...MODULE_ACCESS.OPERATIONS_AND_FINANCE],
    items: [
      { label: "Billing Runs", to: "/billing/runs" },
      { label: "Billing Status Board", to: "/billing/status-board" },
    ],
  },
  {
    label: "Invoices",
    requiredRoles: [...MODULE_ACCESS.OPERATIONS_AND_FINANCE],
    items: [
      { label: "All Invoices", to: "/invoice/all-invoices" },
      { label: "Overdue Invoices", to: "/invoice/overdue" },
      // { label: "Stripe Transfer Center", to: "/invoice/stripe-payouts" },
    ],
  },
  {
    label: "Invoice Line Items",
    requiredRoles: [...MODULE_ACCESS.OPERATIONS_AND_FINANCE],
    items: [
      {
        label: "Client Invoice Line Items",
        to: "/invoice/client-invoice-line-items",
      },
      {
        label: "Tristate Invoice Line Items",
        to: "/invoice/tristate-invoice-line-items",
      },
    ],
  },
  // {
  //   label: "Purchase Orders",
  //   requiredRoles: [...MODULE_ACCESS.OPERATIONS_AND_FINANCE],
  //   items: [
  //     { label: "All Purchase Orders", to: "/purchase-orders/all" },
  //     { label: "PO Status Board", to: "/purchase-orders/status-board" },
  //     {
  //       label: "Pending Approval",
  //       to: "/purchase-orders/pending-approval",
  //     },
  //     { label: "Unpaid POs", to: "/purchase-orders/unpaid-pos" },
  //   ],
  // },
  {
    label: "Vendors",
    requiredRoles: [...MODULE_ACCESS.OPERATIONS_AND_FINANCE],
    items: [
      { label: "All Vendors", to: "/vendors/all-vendors" },
      { label: "Vendor Payables", to: "/vendors/payables" },
    ],
  },
  {
    label: "Integrations",
    requiredRoles: [...MODULE_ACCESS.INTEGRATIONS],
    items: [
      { label: "Accounting Sync", to: "/integrations/accounting-sync" },
      { label: "Mercury Banking", to: "/integrations/mercury-banking" },
    ],
  },
  // {
  //   label: "Channel Partners",
  //   requiredRoles: [...MODULE_ACCESS.CRM],
  //   items: [
  //     {
  //       label: "All Channel Partners",
  //       to: "/partner/all-channel-partners",
  //     },
  //     { label: "All Partners", to: "/partner/all-partners" },
  //   ],
  // },
  {
    label: "Monthly Reports",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "Dashboard", to: "/monthly-reporting/dashboard" },
      {
        label: "Submit Report",
        to: "/monthly-reporting/submit",
        requiredRoles: [...BUSINESS_WRITE_ROLES],
      },
    ],
  },
  {
    label: "Assessments",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "All Assessments", to: "/assessment/all-assessments" },
      { label: "Assessments Progress", to: "/assessment/progress" },
    ],
  },
  {
    label: "Audits",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "All Practice Audits", to: "/audit/all-practice-audits" },
      { label: "Audit Status Board", to: "/audit/status-board" },
    ],
  },
  {
    label: "Credentialing",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "Dashboard", to: "/credentialing/dashboard" },
      { label: "All Credentialing", to: "/credentialing/list" },
    ],
  },
  {
    label: "Project Management",
    requiredRoles: [...MODULE_ACCESS.CRM],
    items: [
      { label: "Dashboard / Projects", to: "/project-management/projects" },
      { label: "Workstreams", to: "/project-management/workstreams" },
      { label: "Tasks Tracker", to: "/project-management/tasks" },
      { label: "Milestones", to: "/project-management/milestones" },
      { label: "Risk Register", to: "/project-management/risks" },
      { label: "Action Items", to: "/project-management/action-items" },
      { label: "Task Templates", to: "/project-management/templates" },
    ],
  },
  {
    label: "Settings",
    requiredRoles: [...MODULE_ACCESS.SETTINGS],
    items: [
      { label: "General Settings", to: "/settings/general" },
      { label: "API & Integrations", to: "/settings/integrations" },
      { label: "Team Management", to: "/settings/team" },
      { label: "Security & Access", to: "/settings/security" },
    ],
  },
];

function SidebarIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-4 w-4 items-center justify-center text-slate-500">
      {children}
    </span>
  );
}

function ListDocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <rect
        x="4.5"
        y="3.5"
        width="11"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M7.3 7.2H12.7M7.3 10H12.7M7.3 12.8H11.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SubmenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 7V10L12 12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarLeafItem({
  item,
  onNavigate,
}: {
  item: SidebarItem;
  onNavigate?: () => void;
}) {
  const baseClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px]";

  const IconToRender = (() => {
    const label = item.label.toLowerCase();
    if (label.includes("dashboard"))
      return <LayoutDashboard className="h-3.5 w-3.5 text-indigo-500" />;
    if (label.includes("portal"))
      return <Globe className="h-3.5 w-3.5 text-emerald-500" />;
    if (label.includes("lead"))
      return <Target className="h-3.5 w-3.5 text-rose-500" />;
    if (label.includes("deal"))
      return <Backpack className="h-3.5 w-3.5 text-rose-500" />;
    if (label.includes("people"))
      return <Users className="h-3.5 w-3.5 text-blue-500" />;
    if (label.includes("company"))
      return <Building2 className="h-3.5 w-3.5 text-amber-500" />;
    return <ListDocumentIcon />;
  })();

  return (
    <button type="button" className={`${baseClass} hover:bg-white/70`}>
      <SidebarIcon>{IconToRender}</SidebarIcon>
      {item.label}
    </button>
  );
}

function getIconForLabel(label: string) {
  const l = label.toLowerCase();
  if (l.includes("dashboard")) return <LayoutDashboard className="h-4 w-4" />;
  if (l.includes("lead")) return <Target className="h-4 w-4" />;
  if (l.includes("deal")) return <Briefcase className="h-4 w-4" />;
  if (l.includes("people")) return <Users className="h-4 w-4" />;
  if (l.includes("company")) return <Building2 className="h-4 w-4" />;
  if (l.includes("communication")) return <Globe className="h-4 w-4" />;
  if (l.includes("practice")) return <Stethoscope className="h-4 w-4" />;
  if (l.includes("credential")) return <ListChecks className="h-4 w-4" />;
  if (l.includes("onboarding")) return <FileText className="h-4 w-4" />;
  if (l.includes("service")) return <Briefcase className="h-4 w-4" />;
  if (l.includes("assessment")) return <BarChart3 className="h-4 w-4" />;
  if (l.includes("pricing")) return <Calculator className="h-4 w-4" />;
  if (l.includes("agreement")) return <FileSignature className="h-4 w-4" />;
  if (l.includes("monthly") || l.includes("report")) return <BarChart3 className="h-4 w-4" />;
  if (l.includes("invoice line")) return <ListOrdered className="h-4 w-4" />;
  if (l.includes("invoice") || l.includes("billing")) return <Receipt className="h-4 w-4" />;
  if (l.includes("purchase")) return <ShoppingCart className="h-4 w-4" />;
  if (l.includes("partner")) return <Share2 className="h-4 w-4" />;
  if (l.includes("vendor")) return <Truck className="h-4 w-4" />;
  if (l.includes("master")) return <Settings2 className="h-4 w-4" />;
  if (l.includes("integration")) return <Zap className="h-4 w-4" />;
  if (l.includes("audit")) return <ClipboardCheck className="h-4 w-4" />;
  if (l.includes("settings")) return <SettingsIcon className="h-4 w-4" />;
  return <ListDocumentIcon />;
}

type SidebarProps = {
  activeModule?: string;
  activeSubItem?: string;
  onNavigate?: () => void;
};

// Survives Sidebar remounts when each page wraps its own AppLayout.
let savedSidebarScrollTop = 0;

function Sidebar({ activeModule, activeSubItem, onNavigate }: SidebarProps) {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const userRole = readStoredUser()?.role as string | undefined;
  const isAdmin = hasAdminAccess(userRole);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  function canRenderItem(item: SidebarSectionItem | SidebarItem) {
    if (item.adminOnly && !isAdmin) return false;
    if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
    return hasAnyRole(userRole, item.requiredRoles);
  }

  function isItemActive(item: SidebarSectionItem) {
    return item.to === location.pathname;
  }

  useEffect(() => {
    const nextOpenMenus = Object.fromEntries(
      sidebarSteps
        .filter((step) => step.items)
        .map((step) => [
          step.label,
          step.label === activeModule ||
            (step.items || []).filter(canRenderItem).some(isItemActive),
        ]),
    );
    setOpenMenus((current) => ({ ...nextOpenMenus, ...current }));
  }, [activeModule, activeSubItem, location.pathname]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const handleScroll = () => {
      savedSidebarScrollTop = el.scrollTop;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.scrollTop = savedSidebarScrollTop;
  }, [location.pathname]);

  function toggleMenu(menuLabel: string) {
    if (isCollapsed) setIsCollapsed(false);
    setOpenMenus((current) => ({ ...current, [menuLabel]: !current[menuLabel] }));
  }

  return (
    <aside
      className={`relative h-full flex flex-col border-r border-[#ece8e1] bg-white transition-all duration-300 ease-in-out font-app-sans select-none z-30 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)] ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className={`flex h-16 items-center border-b border-[#ece8e1] px-3.5 transition-all ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-[#e8e4dc] text-slate-700 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
            title="Expand sidebar"
          >
            <img src="/tristate-metadata-logo.png" className="h-5 w-5 object-contain cursor-pointer" alt="Logo" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0 overflow-hidden cursor-pointer" onClick={toggleCollapse} title="Collapse sidebar">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-[#e8e4dc] cursor-pointer">
                <img src="/tristate-metadata-logo.png" className="h-5 w-5 object-contain cursor-pointer" alt="Logo" />
              </div>
              <div className="flex flex-col truncate cursor-pointer">
                <span className="text-[14.5px] font-semibold text-slate-800 tracking-tight leading-none cursor-pointer">
                  Tristate MSO
                </span>
                <span className="text-[11px] font-medium text-slate-400 mt-1 leading-none cursor-pointer">
                  CRM
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e0d8] bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4 cursor-pointer" />
            </button>
          </>
        )}
      </div>

      {/* Navigation Menu */}
      <div
        ref={navRef}
        className="mt-2 flex-1 overflow-y-auto px-3 pb-6 space-y-1 custom-scrollbar"
      >
        {sidebarSteps.filter(canRenderItem).map((step) => {
          const visibleItems = (step.items || []).filter(canRenderItem);
          const hasChildren = visibleItems.length > 0;
          const isOpen = Boolean(openMenus[step.label]);
          const isActiveMenu =
            step.label === activeModule ||
            (step.to && step.to === location.pathname) ||
            visibleItems.some(isItemActive);

          if (!hasChildren && step.to) {
            return (
              <NavLink
                key={step.label}
                to={step.to}
                onClick={onNavigate}
                onMouseDown={(event) => {
                  if (event.button === 0) event.preventDefault();
                }}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#f4f2ee] text-[#4f63ea] font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  } ${isCollapsed ? "justify-center px-0" : ""}`
                }
                title={isCollapsed ? step.label : undefined}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActiveMenu ? "text-[#4f63ea]" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                >
                  {getIconForLabel(step.label)}
                </span>
                {!isCollapsed && <span className="truncate">{step.label}</span>}
              </NavLink>
            );
          }

          return (
            <div key={step.label} className="mt-1">
              <button
                type="button"
                onClick={() => toggleMenu(step.label)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition-all cursor-pointer ${
                  isActiveMenu
                    ? "bg-[#f4f2ee] text-slate-900 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
                title={isCollapsed ? step.label : undefined}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActiveMenu ? "text-[#4f63ea]" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                >
                  {getIconForLabel(step.label)}
                </span>
                {!isCollapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate">{step.label}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-slate-600" : ""
                      }`}
                    />
                  </>
                )}
              </button>

              {isOpen && !isCollapsed && (
                <div className="mt-1 ml-4 pl-3 border-l border-[#e8e4dc] space-y-1">
                  {visibleItems.map((item) => {
                    if (!item.to) return null;
                    const isActive = isItemActive(item);
                    return (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        onClick={onNavigate}
                        onMouseDown={(event) => {
                          if (event.button === 0) event.preventDefault();
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[#f4f2ee] text-[#4f63ea] font-semibold"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            isActive ? "bg-[#4f63ea]" : "bg-slate-300"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;
