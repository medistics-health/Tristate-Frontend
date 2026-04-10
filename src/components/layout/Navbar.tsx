import { LogOut, Menu } from "lucide-react";
import type { ReactNode } from "react";
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
  actions = [LOGOUT_ACTION],
  onMenuClick,
}: NavbarProps) {
  // Ensure logout is always at the end if actions are provided manually but logout is missing
  const finalActions = [...actions];
  if (!finalActions.some((a) => a.label === "Logout")) {
    finalActions.push(LOGOUT_ACTION);
  }

  return (
    <header className="flex h-15 items-center border-b border-[#ece8e1] bg-[#fbfaf8] px-5 font-app-sans w-full">
      <div className="flex min-w-0 items-center gap-3 text-[15px] font-medium text-slate-800">
        {onMenuClick && (
          <button
            type="button"
            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-md border border-[#e4e0d8] bg-white text-slate-600 shadow-sm mr-1"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <span className="flex items-center gap-2 truncate">
          {icon}
          {title}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4 shrink-0">
        {finalActions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`rounded-md border border-[#e4e0d8] bg-white px-3 cursor-pointer flex items-center py-1.5 text-[14px] shadow-sm transition-colors hover:bg-slate-50 ${
              action.muted ? "text-slate-500" : "text-slate-700"
            }`}
          >
            {action.icon} {action.label}
          </button>
        ))}
      </div>
    </header>
  );
}

export default Navbar;
