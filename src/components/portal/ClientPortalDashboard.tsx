import { useEffect, useState } from "react";
import { DollarSign, Users, FileText, AlertTriangle, CreditCard, LifeBuoy, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getClientPortalSnapshot,
  type PortalSnapshot,
} from "../../services/operations/portal";
import { Link } from "react-router-dom";

export default function ClientPortalDashboard() {
  const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSnapshot() {
      try {
        setIsLoading(true);
        const data = await getClientPortalSnapshot();
        setSnapshot(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load portal snapshot.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSnapshot();
  }, []);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  if (isLoading) {
    return (
      <AppLayout title="Client Portal" activeModule="Dashboard" activeSubItem="Client Portal">
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading portal snapshot...</div>
        </div>
      </AppLayout>
    );
  }

  if (!snapshot) {
    return (
      <AppLayout title="Client Portal" activeModule="Dashboard" activeSubItem="Client Portal">
        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <AlertTriangle className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">No Practice Found</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            We could not find an active practice associated with your account to display the portal view.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Portal: ${snapshot.practiceName}`} activeModule="Dashboard" activeSubItem="Client Portal">
      <div className="flex h-full flex-col p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome, {snapshot.practiceName}</h1>
          <p className="mt-1 text-sm text-slate-500">Here is your financial and operational snapshot for the year.</p>
        </div>

        {/* Snapshot Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-slate-600 text-sm">Total Billed (YTD)</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{formatCurrency(snapshot.totalBilled)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-slate-600 text-sm">Active Providers</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{snapshot.activeProviders}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-slate-600 text-sm">Recent Invoices</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{snapshot.unpaidInvoices} <span className="text-base font-medium text-slate-500">Unpaid</span></p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-slate-600 text-sm">Pending Terms</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{snapshot.pendingAgreements} <span className="text-base font-medium text-slate-500">Requires Signature</span></p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              to="/invoice/all-invoices" 
              className="group flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-slate-100 p-2 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800">Pay Open Invoices</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">Securely pay via Stripe or view your outstanding balance.</p>
              <div className="text-sm font-medium text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                View Invoices <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link 
              to="/agreements/all-agreements" 
              className="group flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-slate-100 p-2 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800">Review Agreements</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">Review and sign pending MSO pricing term sheets.</p>
              <div className="text-sm font-medium text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                View Agreements <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <button 
              onClick={() => toast.success("Support request opened! We will contact you shortly.")}
              className="group flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-slate-100 p-2 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800">Request Support</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">Need help with an invoice or updating your practice roster?</p>
              <div className="text-sm font-medium text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                Contact Support <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
