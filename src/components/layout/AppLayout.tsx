import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import type { NavbarAction } from "./Navbar";
import Sidebar from "./Sidebar";
import { X } from "lucide-react";

type AppLayoutProps = {
  title: string;
  activeModule?: string;
  activeSubItem?: string;
  navbarIcon?: ReactNode;
  navbarActions?: NavbarAction[];
  children: ReactNode;
};

function AppLayout({
  title,
  activeModule,
  activeSubItem,
  navbarIcon,
  navbarActions,
  children,
}: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <main className="h-screen overflow-hidden bg-[#fbfaf8] text-slate-700 font-app-sans">
      <div className="flex h-full relative min-w-0">
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <div
          className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-auto
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          <Sidebar
            activeModule={activeModule}
            activeSubItem={activeSubItem}
            onNavigate={() => setIsMobileMenuOpen(false)}
          />

          {isMobileMenuOpen && (
            <button
              type="button"
              className="absolute top-4 -right-12 h-8 w-8 flex items-center justify-center rounded-md bg-white border border-[#ece8e1] shadow-sm lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          )}
        </div>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar
            title={title}
            icon={navbarIcon}
            actions={navbarActions}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f7f5f1] p-2">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export default AppLayout;
