import type { ReactNode } from "react";
import Navbar from "./Navbar";
import type { NavbarAction } from "./Navbar";
import Sidebar from "./Sidebar";

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
  return (
    <main className="h-screen overflow-hidden bg-[#fbfaf8] text-slate-700">
      <div className="flex h-full">
        <Sidebar activeModule={activeModule} activeSubItem={activeSubItem} />

        <section className="flex min-w-0 flex-1 flex-col">
          <Navbar title={title} icon={navbarIcon} actions={navbarActions} />

          <div className="min-h-0 flex-1 bg-[#f7f5f1] p-2">{children}</div>
        </section>
      </div>
    </main>
  );
}

export default AppLayout;
