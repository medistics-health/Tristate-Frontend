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
          <div className="rounded-2xl border border-[#ece8e1] bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Total Billed (YTD)</h3>
            </div>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{formatCurrency(snapshot.totalBilled)}</p>
          </div>

          <div className="rounded-2xl border border-[#ece8e1] bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Active Providers</h3>
            </div>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{snapshot.activeProviders}</p>
          </div>

          <div className="rounded-2xl border border-[#ece8e1] bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 border border-amber-100">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Recent Invoices</h3>
            </div>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{snapshot.unpaidInvoices} <span className="text-sm font-medium text-slate-400">Unpaid</span></p>
          </div>

          <div className="rounded-2xl border border-[#ece8e1] bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 border border-indigo-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Pending Terms</h3>
            </div>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{snapshot.pendingAgreements} <span className="text-sm font-medium text-slate-400">Needs Sign</span></p>
          </div>
        </div>

        {/* Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Services */}
          <div className="lg:col-span-2 rounded-3xl border border-[#ece8e1] bg-white overflow-hidden shadow-sm">
            <div className="border-b border-[#f1efeb] px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Active Services</h3>
              <span className="text-xs font-bold text-[#4f63ea] bg-blue-50 px-2 py-1 rounded-lg">Managed by Tristate</span>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { name: "Revenue Cycle Management", status: "Active", health: "Good", color: "bg-green-500" },
                  { name: "Credentialing Support", status: "In Progress", health: "Attention", color: "bg-amber-500" },
                  { name: "Marketing & Growth", status: "Active", health: "Good", color: "bg-green-500" },
                ].map((service, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#fbfaf8] border border-[#f1efeb]">
                    <div className="flex items-center gap-4">
                      <div className={`h-2 w-2 rounded-full ${service.color} animate-pulse`} />
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{service.name}</h4>
                        <p className="text-xs text-slate-500">Status: {service.status}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${service.health === "Good" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {service.health}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Credentialing Status */}
          <div className="rounded-3xl border border-[#ece8e1] bg-white overflow-hidden shadow-sm">
            <div className="border-b border-[#f1efeb] px-6 py-4">
              <h3 className="font-bold text-slate-800">Credentialing Status</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                  <span>Progress</span>
                  <span>65%</span>
                </div>
                <div className="h-2 w-full bg-[#f1efeb] rounded-full overflow-hidden">
                  <div className="h-full bg-[#4f63ea] rounded-full w-[65%]" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span className="text-slate-600">Provider Roster Submitted</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span className="text-slate-600">Tax ID Verification</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">⋯</div>
                  <span className="font-semibold text-slate-800">Payer Enrollment (In Review)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link 
              to="/invoice/all-invoices" 
              className="group flex flex-col items-start justify-between rounded-3xl border border-[#ece8e1] bg-white p-6 shadow-sm hover:border-[#4f63ea]/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="rounded-2xl bg-[#fbfaf8] p-3 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#4f63ea] transition-all">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-800">Pay Invoices</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Securely pay via Stripe or view your outstanding balance.</p>
              <div className="text-sm font-bold text-[#4f63ea] flex items-center gap-1 group-hover:gap-2 transition-all">
                View Invoices <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link 
              to="/agreements/all-agreements" 
              className="group flex flex-col items-start justify-between rounded-3xl border border-[#ece8e1] bg-white p-6 shadow-sm hover:border-[#4f63ea]/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="rounded-2xl bg-[#fbfaf8] p-3 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#4f63ea] transition-all">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-800">Review Terms</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Review and sign pending MSO pricing term sheets.</p>
              <div className="text-sm font-bold text-[#4f63ea] flex items-center gap-1 group-hover:gap-2 transition-all">
                View Agreements <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <button 
              onClick={() => toast.success("Support request opened! We will contact you shortly.")}
              className="group flex flex-col items-start justify-between rounded-3xl border border-[#ece8e1] bg-white p-6 shadow-sm hover:border-[#4f63ea]/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="rounded-2xl bg-[#fbfaf8] p-3 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#4f63ea] transition-all">
                  <LifeBuoy className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-800">Get Help</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Need help with an invoice or updating your practice roster?</p>
              <div className="text-sm font-bold text-[#4f63ea] flex items-center gap-1 group-hover:gap-2 transition-all">
                Contact Support <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
