// @ts-nocheck
import AppLayout from "../layout/AppLayout";
import { getStandardNavbarActions } from "../shared/PageComponents";

export default function CalculatePrefunding() {
  const navbarActions = getStandardNavbarActions();
  return (
    <AppLayout navbarActions={navbarActions}>
      <div className="flex-1 overflow-hidden bg-[#fafafa]">
        <div className="h-full px-6 py-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-slate-800">Calculate Prefunding</h1>
          </div>
          <div className="rounded-xl bg-white border border-[#e8e4dc] shadow-sm min-h-[500px] flex items-center justify-center p-8">
            <div className="text-center">
              <h2 className="text-lg font-medium text-slate-700">Calculate Prefunding Content</h2>
              <p className="text-sm text-slate-500 mt-2">This module is currently under construction.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
