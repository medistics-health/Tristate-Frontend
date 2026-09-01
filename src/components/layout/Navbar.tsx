import {
  LogOut,
  Menu,
  ChevronDown,
  MoreHorizontal,
  Search,
  X,
  Target,
  Users,
  Building2,
  Share2,
  Stethoscope,
  FileSignature,
  ClipboardCheck,
  Briefcase,
  Calculator,
  Receipt,
  FileText,
  ListOrdered,
  ShoppingCart,
  Truck,
  Zap,
  BarChart3,
  ListChecks,
  Shield,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../services/operations/auth";
import toast from "react-hot-toast";

type NavRouteItem = {
  section: string;
  subSection: string;
  to: string;
  icon: ReactNode;
};

const ALL_NAV_ROUTES: NavRouteItem[] = [
  { section: "CRM", subSection: "Lead", to: "/lead/create", icon: <Target className="h-4 w-4" /> },
  { section: "CRM", subSection: "Deal", to: "/deal/all-deals", icon: <Target className="h-4 w-4" /> },
  { section: "CRM", subSection: "People", to: "/people/all-peoples", icon: <Users className="h-4 w-4" /> },
  { section: "CRM", subSection: "Company", to: "/company/all-companies", icon: <Building2 className="h-4 w-4" /> },
  { section: "CRM", subSection: "Communication", to: "/communication/all-emails", icon: <Share2 className="h-4 w-4" /> },

  { section: "Practices", subSection: "All Practices", to: "/practice/all-practices", icon: <Stethoscope className="h-4 w-4" /> },
  { section: "Practices", subSection: "Pipeline Board", to: "/practice/pipeline", icon: <Stethoscope className="h-4 w-4" /> },
  { section: "Practices", subSection: "Active Practices", to: "/practice/active-practice", icon: <Stethoscope className="h-4 w-4" /> },
  { section: "Practices", subSection: "Prospects", to: "/practice/prospects", icon: <Stethoscope className="h-4 w-4" /> },
  { section: "Practices", subSection: "Reminders Due", to: "/practice/reminder-dues", icon: <Stethoscope className="h-4 w-4" /> },

  { section: "Agreements", subSection: "All Agreements", to: "/agreements/all-agreements", icon: <FileSignature className="h-4 w-4" /> },
  { section: "Agreements", subSection: "Agreement Pipeline", to: "/agreements/pipeline", icon: <FileSignature className="h-4 w-4" /> },
  { section: "Agreements", subSection: "Pending Approval", to: "/agreements/pending-approval", icon: <FileSignature className="h-4 w-4" /> },
  { section: "Agreements", subSection: "Pending Submission Changes", to: "/agreements/pending-submission-changes", icon: <FileSignature className="h-4 w-4" /> },
  { section: "Agreements", subSection: "Pending Signatures", to: "/agreements/pending-signatures", icon: <FileSignature className="h-4 w-4" /> },

  { section: "Onboarding", subSection: "New Onboarding", to: "/onboarding/scope", icon: <ClipboardCheck className="h-4 w-4" /> },
  { section: "Onboarding", subSection: "Completed Submissions", to: "/onboarding/review", icon: <ClipboardCheck className="h-4 w-4" /> },
  { section: "Onboarding", subSection: "Pending Submissions", to: "/onboarding/scope-list", icon: <ClipboardCheck className="h-4 w-4" /> },

  { section: "Services", subSection: "All Services", to: "/service/all-services", icon: <Briefcase className="h-4 w-4" /> },

  { section: "Pricing Engine", subSection: "Pricing Engine", to: "/pricing/rate-finalization", icon: <Calculator className="h-4 w-4" /> },

  { section: "Billing", subSection: "Billing Runs", to: "/billing/runs", icon: <Receipt className="h-4 w-4" /> },
  { section: "Billing", subSection: "Billing Status Board", to: "/billing/status-board", icon: <Receipt className="h-4 w-4" /> },

  { section: "Invoices", subSection: "All Invoices", to: "/invoice/all-invoices", icon: <FileText className="h-4 w-4" /> },
  { section: "Invoices", subSection: "Overdue Invoices", to: "/invoice/overdue", icon: <FileText className="h-4 w-4" /> },

  { section: "Invoice Line Items", subSection: "Client Invoice Line Items", to: "/invoice/client-invoice-line-items", icon: <ListOrdered className="h-4 w-4" /> },
  { section: "Invoice Line Items", subSection: "Tristate Invoice Line Items", to: "/invoice/tristate-invoice-line-items", icon: <ListOrdered className="h-4 w-4" /> },

  { section: "Purchase Orders", subSection: "All Purchase Orders", to: "/purchase-orders/all", icon: <ShoppingCart className="h-4 w-4" /> },
  { section: "Purchase Orders", subSection: "PO Status Board", to: "/purchase-orders/status-board", icon: <ShoppingCart className="h-4 w-4" /> },
  { section: "Purchase Orders", subSection: "Pending Approval", to: "/purchase-orders/pending-approval", icon: <ShoppingCart className="h-4 w-4" /> },
  { section: "Purchase Orders", subSection: "Unpaid POs", to: "/purchase-orders/unpaid-pos", icon: <ShoppingCart className="h-4 w-4" /> },

  { section: "Vendors", subSection: "All Vendors", to: "/vendors/all-vendors", icon: <Truck className="h-4 w-4" /> },
  { section: "Vendors", subSection: "Vendor Payables", to: "/vendors/payables", icon: <Truck className="h-4 w-4" /> },

  { section: "Integrations", subSection: "Accounting Sync", to: "/integrations/accounting-sync", icon: <Zap className="h-4 w-4" /> },
  { section: "Integrations", subSection: "Mercury Banking", to: "/integrations/mercury-banking", icon: <Zap className="h-4 w-4" /> },

  { section: "Channel Partners", subSection: "All Channel Partners", to: "/partner/all-channel-partners", icon: <Share2 className="h-4 w-4" /> },
  { section: "Channel Partners", subSection: "All Partners", to: "/partner/all-partners", icon: <Share2 className="h-4 w-4" /> },

  { section: "Monthly Reports", subSection: "Dashboard", to: "/monthly-reporting/dashboard", icon: <BarChart3 className="h-4 w-4" /> },
  { section: "Monthly Reports", subSection: "Submit Report", to: "/monthly-reporting/submit", icon: <BarChart3 className="h-4 w-4" /> },

  { section: "Assessments", subSection: "All Assessments", to: "/assessment/all-assessments", icon: <ListChecks className="h-4 w-4" /> },
  { section: "Assessments", subSection: "Assessments Progress", to: "/assessment/progress", icon: <ListChecks className="h-4 w-4" /> },

  { section: "Audits", subSection: "All Practice Audits", to: "/audit/all-practice-audits", icon: <Shield className="h-4 w-4" /> },
  { section: "Audits", subSection: "Audit Status Board", to: "/audit/status-board", icon: <Shield className="h-4 w-4" /> },

  { section: "Credentialing", subSection: "Dashboard", to: "/credentialing/dashboard", icon: <Stethoscope className="h-4 w-4" /> },
  { section: "Credentialing", subSection: "All Credentialing", to: "/credentialing/list", icon: <Stethoscope className="h-4 w-4" /> },

  { section: "Project Management", subSection: "Projects Overview", to: "/project-management/projects", icon: <ClipboardCheck className="h-4 w-4" /> },
  { section: "Project Management", subSection: "Workstreams", to: "/project-management/workstreams", icon: <ClipboardCheck className="h-4 w-4" /> },
  { section: "Project Management", subSection: "Tasks Tracker", to: "/project-management/tasks", icon: <ClipboardCheck className="h-4 w-4" /> },
  { section: "Project Management", subSection: "Milestones", to: "/project-management/milestones", icon: <ClipboardCheck className="h-4 w-4" /> },
  { section: "Project Management", subSection: "Risks & Issues", to: "/project-management/risks", icon: <ClipboardCheck className="h-4 w-4" /> },
  { section: "Project Management", subSection: "Action Items", to: "/project-management/action-items", icon: <ClipboardCheck className="h-4 w-4" /> },
  { section: "Project Management", subSection: "Task Templates", to: "/project-management/templates", icon: <ClipboardCheck className="h-4 w-4" /> },

  { section: "Settings", subSection: "General Settings", to: "/settings/general", icon: <SettingsIcon className="h-4 w-4" /> },
  { section: "Settings", subSection: "API & Integrations", to: "/settings/integrations", icon: <SettingsIcon className="h-4 w-4" /> },
  { section: "Settings", subSection: "Team Management", to: "/settings/team", icon: <SettingsIcon className="h-4 w-4" /> },
  { section: "Settings", subSection: "Security & Access", to: "/settings/security", icon: <SettingsIcon className="h-4 w-4" /> },
];

export type NavbarAction = {
  label: string;
  muted?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
};

type NavbarProps = {
  title?: string;
  icon?: ReactNode;
  actions?: NavbarAction[];
  onMenuClick?: () => void;
};

function DefaultDocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-500" fill="none">
      <path
        d="M5.2 3.8H11L14.8 7.6V16.2H5.2V3.8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11 3.8V7.6H14.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

async function handleLogout() {
  const loadingToast = toast.loading("Logging you out...");
  try {
    const response = await logout();
    localStorage.clear();
    sessionStorage.clear();
    toast.success("Logged Out Successfully.", {
      id: loadingToast,
    });
    window.location.href = "/login";
  } catch (error) {
    localStorage.clear();
    sessionStorage.clear();
    const message =
      error instanceof Error ? error.message : "Unable to sign you out.";
    toast.error(message, { id: loadingToast });
    window.location.href = "/login";
  }
}

export const LOGOUT_ACTION: NavbarAction = {
  icon: <LogOut className="h-4 w-4 mr-2" />,
  label: "Logout",
  onClick: handleLogout,
};

function Navbar({
  title = "",
  icon = <DefaultDocumentIcon />,
  actions = [],
  onMenuClick,
}: NavbarProps) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_NAV_ROUTES.slice(0, 8);
    return ALL_NAV_ROUTES.filter(
      (item) =>
        item.section.toLowerCase().includes(q) ||
        item.subSection.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUserData(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, []);

  const getInitials = () => {
    if (!userData) return "U";
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
    }
    return userData.name ? userData.name.substring(0, 2).toUpperCase() : "U";
  };

  const fullName = userData
    ? userData.firstName && userData.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : userData.name
    : "Loading...";

  return (
    <header className="flex h-14 items-center border-b border-[#ece8e1] bg-white px-3 sm:px-5 font-app-sans w-full z-20 min-w-0 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-1 min-w-0 items-center gap-2 sm:gap-3 text-[15px] font-medium text-slate-800">
        {onMenuClick && (
          <button
            type="button"
            className="lg:hidden h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-[#e4e0d8] bg-white text-slate-600 shadow-sm"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search & navigate to any module..."
              className="w-full rounded-xl border border-[#ece8e1] bg-slate-50/60 py-1.5 pl-9 pr-8 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[#4f63ea] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4f63ea]/10 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isSearchOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsSearchOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-full min-w-[280px] sm:min-w-[340px] max-h-80 overflow-y-auto custom-scrollbar rounded-xl border border-[#ece8e1] bg-white p-1.5 shadow-xl z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                {searchResults.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-slate-400">
                    No matching modules found
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery("");
                        navigate(item.to);
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-[#4f63ea]/10 group-hover:text-[#4f63ea] transition-colors">
                        {item.icon}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[13px] font-semibold text-slate-700 group-hover:text-[#4f63ea] truncate">
                          {item.subSection}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 truncate">
                          {item.section}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 group-hover:text-[#4f63ea] opacity-0 group-hover:opacity-100 transition-opacity">
                        Go &rarr;
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4 shrink-0">
        {actions.length > 0 && (
          <div className="hidden md:flex items-center gap-2 mr-2">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`rounded-md border border-[#e4e0d8] bg-white px-3 cursor-pointer flex items-center py-1.5 text-[13px] font-medium shadow-sm transition-all hover:bg-slate-50 active:scale-95 ${
                  action.muted ? "text-slate-500" : "text-slate-700"
                }`}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => {
                setIsActionsOpen((open) => !open);
                setIsProfileOpen(false);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-[#e4e0d8] bg-white text-slate-600 shadow-sm"
              aria-label="Page actions"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {isActionsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsActionsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#ece8e1] bg-white p-1.5 shadow-xl z-50">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        action.onClick?.();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors font-medium ${
                        action.muted
                          ? "text-slate-500 hover:bg-slate-50"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="h-6 w-px bg-[#ece8e1] hidden sm:block" />

        <div className="relative">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsActionsOpen(false);
            }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg border border-[#e4e0d8] bg-white hover:bg-slate-50 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-[12px] font-bold text-slate-700 leading-none mb-0.5">
                {fullName}
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                {userData?.role || "User"}
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[12px] font-bold shadow-md border-2 border-white">
              {getInitials()}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isProfileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#ece8e1] bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2.5 mb-1 border-b border-slate-50">
                  <p className="text-[14px] font-bold text-slate-800">
                    {fullName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {userData?.email}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
