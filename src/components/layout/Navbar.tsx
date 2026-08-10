import { LogOut, Menu, ChevronDown, MoreHorizontal } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { logout } from "../../services/operations/auth";
import toast from "react-hot-toast";

export type NavbarAction = {
  label: string;
  muted?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
};

type NavbarProps = {
  title: string;
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
    if (response === 200) {
      toast.success("Logged Out Successfully.", {
        id: loadingToast,
      });
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign you in.";
    toast.error(message, { id: loadingToast });
  }
}

export const LOGOUT_ACTION: NavbarAction = {
  icon: <LogOut className="h-4 w-4 mr-2" />,
  label: "Logout",
  onClick: handleLogout,
};

function Navbar({
  title,
  icon = <DefaultDocumentIcon />,
  actions = [],
  onMenuClick,
}: NavbarProps) {
  const [userData, setUserData] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

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
    <header className="flex h-14 items-center border-b border-[#ece8e1] bg-[#fbfaf8] px-3 sm:px-5 font-app-sans w-full z-30 min-w-0">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3 text-[15px] font-medium text-slate-800">
        {onMenuClick && (
          <button
            type="button"
            className="lg:hidden h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-[#e4e0d8] bg-white text-slate-600 shadow-sm"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <span className="flex min-w-0 items-center gap-2.5 truncate text-[16px] font-semibold text-slate-700">
          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500 shrink-0">
            {icon}
          </div>
          <span className="truncate">{title}</span>
        </span>
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
