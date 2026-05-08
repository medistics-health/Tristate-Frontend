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
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (invoice.stripeHostedInvoiceUrl) {
              window.open(invoice.stripeHostedInvoiceUrl, "_blank");
            } else {
              toast.error("No Stripe URL available for this invoice.");
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          View Stripe Invoice
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-[12px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        >
          <Mail className="h-3.5 w-3.5" />
          {isResending ? "Resending..." : "Resend Invoice"}
        </button>
      </div>

      {/* Stripe Event Timeline */}
      <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-4">
        <h4 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-slate-500">
          Stripe Event Timeline
        </h4>
        
        {isLoading ? (
          <div className="text-[13px] text-slate-400">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-[13px] text-slate-400">No Stripe events logged yet.</div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-200">
            {events.map((evt) => (
              <div key={evt.id} className="relative">
                <div className="absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow-sm z-10">
                  {getEventIcon(evt.eventType)}
                </div>
                <div className="flex flex-col rounded-lg border border-[#f0ece6] bg-white p-3 shadow-sm">
                  <div className="flex flex-col gap-1 mb-1">
                    <div className="font-semibold text-slate-800 text-[13px] break-words">
                      {evt.eventType}
                    </div>
                    <time className="text-[11px] text-slate-500 font-medium">
                      {formatDateTime(evt.createdAt)}
                    </time>
                  </div>
                  <div className="text-[12px] text-slate-600 mt-1 break-words">
                    {evt.payload?.action || evt.stripeEventId}
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
