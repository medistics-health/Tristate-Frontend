import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, Mail, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import {
  getInvoiceStripeEvents,
  resendStripeInvoice,
  type Invoice,
  type StripeEventLog,
} from "../../services/operations/invoices";

type Props = {
  invoice: Invoice;
  onUpdate: () => void;
};

export default function StripeInvoiceFlow({ invoice, onUpdate }: Props) {
  const [events, setEvents] = useState<StripeEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      try {
        setIsLoading(true);
        const data = await getInvoiceStripeEvents(invoice.id);
        setEvents(data);
      } catch (error) {
        console.error("Failed to load stripe events:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadEvents();
  }, [invoice.id]);

  async function handleResend() {
    try {
      setIsResending(true);
      await resendStripeInvoice(invoice.id);
      toast.success("Invoice resent via Stripe successfully!");
      // Reload events
      const data = await getInvoiceStripeEvents(invoice.id);
      setEvents(data);
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend invoice.");
    } finally {
      setIsResending(false);
    }
  }

  function getEventIcon(type: string) {
    if (type.includes("paid") || type.includes("success")) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (type.includes("sent")) return <Mail className="h-4 w-4 text-blue-500" />;
    if (type.includes("fail")) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-slate-400" />;
  }

  function formatDateTime(isoStr: string) {
    return new Date(isoStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  return (
    <div className="mt-6 border-t border-[#f0ece6] pt-6">
      <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-slate-800">
        <CreditCard className="h-4 w-4 text-indigo-500" />
        Stripe Flow
      </h3>

      {/* Stripe Actions */}
      <div className="mb-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => {
            if (invoice.stripeHostedInvoiceUrl) {
              window.open(invoice.stripeHostedInvoiceUrl, "_blank");
            } else {
              toast.error("No Stripe URL available for this invoice.");
            }
          }}
          className="inline-flex items-center w-fit gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2 text-[12px] font-bold text-[#6366f1] shadow-sm transition-all hover:bg-slate-50"
        >
          <ExternalLink className="h-4 w-4" />
          View Stripe Invoice
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="inline-flex items-center w-fit gap-2 rounded-xl bg-[#f5f3ff] px-3.5 py-2 text-[12px] font-bold text-[#6366f1] transition-all hover:bg-[#ede9fe] disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          Resend Invoice
        </button>
      </div>

      {/* Stripe Event Timeline */}
      <div className="rounded-2xl border border-[#f1f5f9] bg-[#f8fafc] p-4">
        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
          Stripe Event Timeline
        </h4>
        
        {isLoading ? (
          <div className="text-[12px] text-slate-400">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-[12px] text-slate-400">No Stripe events logged yet.</div>
        ) : (
          <div className="relative pl-7 space-y-5 before:absolute before:inset-y-0 before:left-[13px] before:w-[1px] before:bg-slate-200">
            {events.map((evt) => (
              <div key={evt.id} className="relative">
                <div className="absolute -left-[28px] top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#6366f1] text-white shadow-sm z-10">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-sm transition-all hover:shadow-md">
                  <div className="flex flex-col gap-0.5 mb-1.5">
                    <div className="font-extrabold text-[#1e293b] text-[14px]">
                      {evt.eventType}
                    </div>
                    <time className="text-[11px] font-semibold text-slate-400">
                      {formatDateTime(evt.createdAt)}
                    </time>
                  </div>
                  <div className="text-[12px] font-medium text-slate-500 leading-normal">
                    {evt.payload?.action || "Resent invoice via Stripe SDK"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
