import {
  Backpack,
  User,
  Building2,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Shield,
  LayoutDashboard,
  Monitor,
  Target,
  Users,
  ShoppingCart,
  ListOrdered,
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
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

type SidebarSectionItem = {
  label: string;
  to?: string;
  icon?: ReactNode;
};

type SidebarMenu = {
  label: string;
  items?: SidebarSectionItem[];
};

type SidebarSection = {
  label?: string;
  items: SidebarSectionItem[];
  menus?: SidebarMenu[];
};

type SidebarProps = {
  activeModule?: string;
  activeSubItem?: string;
};

const sidebarSections: SidebarSection[] = [
  {
    label: "Workspace",

    items: [
      { label: "Dashboards", to: "/dashboard" },
      { label: "Client Portal", to: "/portal" },
      {
        label: "Deal",
        icon: <Backpack className="h-3 w-3" />,
        to: "/deal/all-deals",
      },
      {
        label: "Person",
        icon: <User className="h-3 w-3" />,
        to: "/person/all-persons",
      },
      {
        label: "Company",
        icon: <Building2 className="h-3 w-3" />,
        to: "/company/all-companies",
      },
      // { label: "Survey results" },
    ],
    menus: [
      {
        label: "Purchase Orders",
        items: [
          { label: "All Purchase Orders", to: "/purchase-orders/all" },
          { label: "PO Status Board", to: "/purchase-orders/status-board" },
          {
            label: "Pending Approval",
            to: "/purchase-orders/pending-approval",
          },
          { label: "Unpaid POs", to: "/purchase-orders/unpaid-pos" },
        ],
      },
      {
        label: "Invoice Line Items",
        items: [
          {
            label: "All Invoice Line Items",
            to: "/invoice/all-invoice-line-items",
          },
          { label: "All Line Items", to: "/invoice/all-line-items" },
        ],
      },
      {
        label: "Services",
        items: [
          { label: "All Services", to: "/service/all-services" },
          { label: "Service Catalog", to: "/service/service-catalogs" },
          { label: "Active Services", to: "/service/active-services" },
        ],
      },
      {
        label: "Channel Partners",
        items: [
          {
            label: "All Channel Partners",
            to: "/partner/all-channel-partners",
          },
          { label: "All Partners", to: "/partner/all-partners" },
        ],
      },
      {
        label: "Audits",
        items: [
          { label: "All Practice Audits", to: "/audit/all-practice-audits" },
          { label: "All Audits", to: "/audit/all-audits" },
          { label: "Audit Status Board", to: "/audit/status-board" },
        ],
      },
      {
        label: "Assessments",
        items: [
          { label: "All Assessments", to: "/assessment/all-assessments" },
          { label: "Assessments Progress", to: "/assessment/progress" },
        ],
      },
      {
        label: "Pricing Engine",
        items: [
          {
            label: "Rate Finalization",
            to: "/pricing-engine/rate-finalization",
          },
        ],
      },
      {
        label: "Billing",
        items: [
          { label: "Billing Runs", to: "/billing/runs" },
          { label: "Billing Status Board", to: "/billing/status-board" },
        ],
      },
      {
        label: "Invoices",
        items: [
          { label: "All Invoices", to: "/invoice/all-invoices" },
          { label: "Invoice Status Board", to: "/invoice/status-board" },
          { label: "Overdue Invoices", to: "/invoice/overdue" },
        ],
      },
      {
        label: "Agreements",
        items: [
          { label: "All Agreements", to: "/agreements/all-agreements" },
          { label: "Agreement Pipeline", to: "/agreements/pipeline" },
          { label: "Pending Signatures", to: "/agreements/pending-signatures" },
        ],
      },
      {
        label: "Vendors",
        items: [
          { label: "All Vendors", to: "/vendors/all-vendors" },
          { label: "Vendor Contracts", to: "/vendors/contracts" },
          { label: "Vendor Payables", to: "/vendors/payables" },
        ],
      },
      {
        label: "Practices",
        items: [
          { label: "All Practice", to: "/practice/all-practices" },
          { label: "Pipeline Board", to: "/practice/pipeline" },
          { label: "Active Practices", to: "/practice/active-practice" },
          { label: "Prospects", to: "/practice/prospects" },
          { label: "Reminders Due", to: "/practice/reminder-dues" },
        ],
      },
      {
        label: "Monthly Reports",
        items: [
          { label: "Dashboard", to: "/monthly-reporting/dashboard" },
          { label: "Submit Report", to: "/monthly-reporting/submit" },
        ],
      },
      {
        label: "Integrations",
        items: [
          { label: "Accounting Sync", to: "/integrations/accounting-sync" },
        ],
      },
      {
        label: "Settings",
        items: [
          { label: "General Settings", to: "/settings/general" },
          { label: "API & Integrations", to: "/settings/integrations" },
          { label: "Team Management", to: "/settings/team" },
          { label: "Security & Access", to: "/settings/security" },
        ],
      },
    ],
  },
  // {
  //   items: [
  //     {
  //       label: "Deal",
  //       icon: <Backpack className="h-3 w-3" />,
  //       to: "/deal/all-deals",
  //     },
  //     {
  //       label: "Person",
  //       icon: <User className="h-3 w-3" />,
  //       to: "/person/all-persons",
  //     },
  //     {
  //       label: "Company",
  //       icon: <Building2 className="h-3 w-3" />,
  //       to: "/company/all-companies",
  //     },
  //   ],
  // },
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

function SidebarLeafItem({ item }: { item: SidebarSectionItem }) {
  const baseClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px]";

  const IconToRender = (() => {
    const label = item.label.toLowerCase();
    if (label.includes("dashboard"))
      return <LayoutDashboard className="h-3.5 w-3.5 text-indigo-500" />;
    if (label.includes("portal"))
      return <Globe className="h-3.5 w-3.5 text-emerald-500" />;
    if (label.includes("deal"))
      return <Target className="h-3.5 w-3.5 text-rose-500" />;
    if (label.includes("person"))
      return <Users className="h-3.5 w-3.5 text-blue-500" />;
    if (label.includes("company"))
      return <Building2 className="h-3.5 w-3.5 text-amber-500" />;
    return <ListDocumentIcon />;
  })();

  if (item.to) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          `${baseClass} ${
            isActive
              ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              : "hover:bg-white/70"
          }`
        }
      >
        <SidebarIcon>{IconToRender}</SidebarIcon>
        {item.label}
      </NavLink>
    );
  }

  return (
    <button type="button" className={`${baseClass} hover:bg-white/70`}>
      <SidebarIcon>{IconToRender}</SidebarIcon>
      {item.label}
    </button>
  );
}

function Sidebar({ activeModule, activeSubItem }: SidebarProps) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nextOpenMenus = Object.fromEntries(
      sidebarSections
        .flatMap((section) => section.menus ?? [])
        .map((menu) => [
          menu.label,
          menu.label === activeModule ||
            menu.items?.some(
              (item) =>
                item.label === activeSubItem || item.to === location.pathname,
            ) ||
            false,
        ]),
    );

    setOpenMenus((current) => ({ ...nextOpenMenus, ...current }));
  }, [activeModule, activeSubItem, location.pathname]);

  function toggleMenu(menuLabel: string) {
    setOpenMenus((current) => ({
      ...current,
      [menuLabel]: !current[menuLabel],
    }));
  }

  return (
    <aside className="h-full w-64 border-r border-[#ece8e1] bg-[#f8f7f5] flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-6 w-6 items-center justify-center">
          <img src="/tristate-metadata-logo.png" className="h-5 w-5" />
        </div>
        <span className="text-[15px] font-medium text-slate-800">
          Tristate MSO
        </span>
        {/*<svg viewBox="0 0 20 20" className="ml-auto h-4 w-4 text-slate-400">
          <path
            d="M5 7.5L10 12.5L15 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>*/}
      </div>

      {/*<div className="space-y-1 px-3">
        {quickItems.map((item) => (
          <SidebarLeafItem key={item.label} item={item} />
        ))}
      </div>*/}

      <div className="mt-1 flex-1 overflow-y-auto px-3 pb-5">
        {sidebarSections.map((section, sectionIndex) => (
          <div
            key={`${section.label ?? "section"}-${sectionIndex}`}
            className="mt-2"
          >
            {section.label ? (
              <p className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                {section.label}
              </p>
            ) : null}

            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarLeafItem key={item.label} item={item} />
              ))}
            </div>

            {section.menus?.map((menu) => {
              const isOpen = openMenus[menu.label] ?? false;
              const isActiveMenu =
                menu.label === activeModule ||
                menu.items?.some(
                  (item) =>
                    item.label === activeSubItem ||
                    item.to === location.pathname,
                ) ||
                false;

              return (
                <div
                  key={menu.label}
                  className={`mt-1 rounded-xl ${isActiveMenu ? "bg-[#f1efeb]" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleMenu(menu.label)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium ${
                      isActiveMenu
                        ? "bg-[#efede8] text-slate-800"
                        : "hover:bg-white/70"
                    }`}
                  >
                    <SidebarIcon>
                      {(() => {
                        const label = menu.label.toLowerCase();
                        if (label.includes("purchase"))
                          return <ShoppingCart className="h-3.5 w-3.5" />;
                        if (label.includes("invoice"))
                          return <Receipt className="h-3.5 w-3.5" />;
                        if (label.includes("services"))
                          return <Briefcase className="h-3.5 w-3.5" />;
                        if (label.includes("partner"))
                          return <Share2 className="h-3.5 w-3.5" />;
                        if (label.includes("audit"))
                          return <ClipboardCheck className="h-3.5 w-3.5" />;
                        if (label.includes("assessment"))
                          return <BarChart3 className="h-3.5 w-3.5" />;
                        if (label.includes("pricing"))
                          return <Calculator className="h-3.5 w-3.5" />;
                        if (label.includes("billing"))
                          return <CreditCard className="h-3.5 w-3.5" />;
                        if (label.includes("agreement"))
                          return <FileSignature className="h-3.5 w-3.5" />;
                        if (label.includes("vendor"))
                          return <Truck className="h-3.5 w-3.5" />;
                        if (label.includes("practice"))
                          return <Stethoscope className="h-3.5 w-3.5" />;
                        if (label.includes("integration"))
                          return <Zap className="h-3.5 w-3.5" />;
                        if (label.includes("settings"))
                          return <Settings2 className="h-3.5 w-3.5" />;
                        return <ListDocumentIcon />;
                      })()}
                    </SidebarIcon>
                    <span className="min-w-0 flex-1">{menu.label}</span>
                    <ChevronIcon open={isOpen} />
                  </button>

                  {isOpen ? (
                    <div className="pl-4 pr-2 pb-2">
                      {menu.items?.map((item) => {
                        const isActive =
                          item.label === activeSubItem ||
                          item.to === location.pathname;

                        // Selection of icon based on label
                        let CustomIcon = <SubmenuIcon />;
                        const label = item.label.toLowerCase();
                        if (label.includes("general"))
                          CustomIcon = <SettingsIcon className="h-3.5 w-3.5" />;
                        if (label.includes("integrations"))
                          CustomIcon = <LinkIcon className="h-3.5 w-3.5" />;
                        if (label.includes("team"))
                          CustomIcon = <User className="h-3.5 w-3.5" />;
                        if (label.includes("security"))
                          CustomIcon = <Shield className="h-3.5 w-3.5" />;
                        if (label.includes("status board"))
                          CustomIcon = (
                            <LayoutDashboard className="h-3.5 w-3.5" />
                          );
                        if (
                          label.includes("overdue") ||
                          label.includes("pending")
                        )
                          CustomIcon = <BarChart3 className="h-3.5 w-3.5" />;
                        if (
                          label.includes("contracts") ||
                          label.includes("agreements")
                        )
                          CustomIcon = (
                            <FileSignature className="h-3.5 w-3.5" />
                          );
                        if (
                          label.includes("payables") ||
                          label.includes("billing")
                        )
                          CustomIcon = <CreditCard className="h-3.5 w-3.5" />;
                        if (label.includes("sync"))
                          CustomIcon = <Zap className="h-3.5 w-3.5" />;

                        return item.to ? (
                          <NavLink
                            key={item.label}
                            to={item.to}
                            className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] ${
                              isActive
                                ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                                : "text-slate-600 hover:bg-white/80"
                            }`}
                          >
                            <SidebarIcon>{CustomIcon}</SidebarIcon>
                            {item.label}
                          </NavLink>
                        ) : (
                          <button
                            key={item.label}
                            type="button"
                            className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] ${
                              isActive
                                ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                                : "text-slate-600 hover:bg-white/80"
                            }`}
                          >
                            <SidebarIcon>
                              <SubmenuIcon />
                            </SidebarIcon>
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
