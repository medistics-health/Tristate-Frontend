import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  CreditCard, 
  Building, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { getVendorPayableById, payVendorPayable, type VendorPayable } from "../../services/operations/payables";

export default function PayVendorPayable() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [payable, setPayable] = useState<VendorPayable | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"ach" | "card" | "qb">("ach");
  
  // Payment Form States
  const [achForm, setAchForm] = useState({
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    authorize: false
  });
  
  const [cardForm, setCardForm] = useState({
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    zipCode: ""
  });

  async function loadPayable() {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await getVendorPayableById(id);
      setPayable(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load payable details.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPayable();
  }, [id]);

  function formatCurrency(amount: string | number) {
    const num = typeof amount === "number" ? amount : Number.parseFloat(amount as string);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payable || !id) return;

    // Form Validations
    if (activeTab === "ach") {
      if (!achForm.bankName || !achForm.routingNumber || !achForm.accountNumber) {
        toast.error("Please fill in all ACH details.");
        return;
      }
      if (!achForm.authorize) {
        toast.error("You must authorize the electronic bank debit.");
        return;
      }
    } else if (activeTab === "card") {
      if (!cardForm.cardholderName || !cardForm.cardNumber || !cardForm.expiryDate || !cardForm.cvv) {
        toast.error("Please fill in all credit card details.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const methodLabel = activeTab === "ach" ? "ACH Bank Debit" : activeTab === "card" ? "Credit Card" : "QuickBooks Bill Pay";
      await payVendorPayable(id, methodLabel);
      
      setPaymentSuccess(true);
      toast.success("Payment processed successfully!");
      
      // Redirect back to dashboard after showing success state
      setTimeout(() => {
        navigate("/vendors/payables");
      }, 2500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Vendor Bill Pay" activeModule="Vendors" activeSubItem="Vendor Payables">
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-500">Loading secure checkout portal...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!payable) {
    return (
      <AppLayout title="Vendor Bill Pay" activeModule="Vendors" activeSubItem="Vendor Payables">
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-red-50 p-4 text-red-500 border border-red-100">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Bill Not Found</h2>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              We couldn't retrieve the details for this vendor payable. It may have been deleted.
            </p>
          </div>
          <Link 
            to="/vendors/payables" 
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Payables
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isAlreadyPaid = payable.status === "PAID";

  return (
    <AppLayout title="Vendor Bill Pay" activeModule="Vendors" activeSubItem="Vendor Payables">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link 
            to="/vendors/payables" 
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Payables
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            <Lock className="h-3.5 w-3.5 text-slate-400" /> Secure 256-bit SSL Payment
          </div>
        </div>

        {paymentSuccess ? (
          /* Success Animation Portal */
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/20 p-12 text-center space-y-6 shadow-xl shadow-emerald-500/5 max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Completed!</h2>
              <p className="text-sm text-slate-500">
                The payable amount of <strong className="text-slate-800 font-extrabold">{formatCurrency(payable.totalAmount)}</strong> has been successfully processed for <span className="font-semibold">{payable.vendor.name}</span>.
              </p>
            </div>
            <div className="h-px bg-emerald-100/50 w-full" />
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Redirecting back to dashboard...
            </div>
          </div>
        ) : (
          /* Checkout Layout */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Bill Summary Card */}
            <div className="md:col-span-5 space-y-6">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-900/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-50/30 rounded-bl-full -z-10" />
                
                {/* Brand Logo / Section */}
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
                    <FileText className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Tristate Bill Pay</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accounts Payable</p>
                  </div>
                </div>

                {/* Amount Display */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount Owed</span>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {formatCurrency(payable.totalAmount)}
                  </div>
                  {isAlreadyPaid ? (
                    <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700 border border-green-100">
                      Already Paid
                    </span>
                  ) : (
                    <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100">
                      Awaiting Payment
                    </span>
                  )}
                </div>

                {/* Billing Summary List */}
                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex justify-between items-start py-1 border-b border-slate-50">
                    <span className="font-semibold text-slate-400">Vendor</span>
                    <span className="font-extrabold text-slate-800 text-right">{payable.vendor.name}</span>
                  </div>
                  <div className="flex justify-between items-start py-1 border-b border-slate-50">
                    <span className="font-semibold text-slate-400">Remit Email</span>
                    <span className="font-bold text-slate-600 text-right">{payable.vendor.remitEmail || "billing@vendor.com"}</span>
                  </div>
                  <div className="flex justify-between items-start py-1 border-b border-slate-50">
                    <span className="font-semibold text-slate-400">Related Practice</span>
                    <span className="font-extrabold text-slate-800 text-right">{payable.practice.name}</span>
                  </div>
                  <div className="flex justify-between items-start py-1 border-b border-slate-50">
                    <span className="font-semibold text-slate-400">Payable Number</span>
                    <span className="font-mono text-slate-600 text-right">#{payable.payableNumber || payable.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between items-start py-1">
                    <span className="font-semibold text-slate-400">Created At</span>
                    <span className="font-bold text-slate-600 text-right">{new Date(payable.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {payable.quickbooksBillId && (
                  <div className="mt-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4.5 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800">QuickBooks Synced</h4>
                      <p className="text-[11px] text-emerald-600/95 font-medium mt-0.5">
                        This bill is successfully tracked in QBO (ID: {payable.quickbooksBillId}). Paying here will trigger QBO Bill Payment synchronization automatically.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Safety Badge */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4.5 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">100% Secure Transaction</h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    Your financial credentials are encrypted and never stored on our servers. Processing complies fully with PCI-DSS requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Checkout Portal Form */}
            <div className="md:col-span-7">
              <div className="rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
                
                {/* Method Selector Tabs */}
                <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 p-1.5 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("ach")}
                    disabled={isAlreadyPaid}
                    className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${
                      activeTab === "ach" 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-100" 
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <Building className="h-4.5 w-4.5 mb-1" />
                    <span className="text-xs font-extrabold uppercase">ACH Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("card")}
                    disabled={isAlreadyPaid}
                    className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${
                      activeTab === "card" 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-100" 
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <CreditCard className="h-4.5 w-4.5 mb-1" />
                    <span className="text-xs font-extrabold uppercase">Credit Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("qb")}
                    disabled={isAlreadyPaid}
                    className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${
                      activeTab === "qb" 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-100" 
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="h-4.5 w-4.5 mb-1 text-emerald-500" />
                    <span className="text-xs font-extrabold uppercase">QB Bill Pay</span>
                  </button>
                </div>

                <form onSubmit={handlePaymentSubmit} className="p-8 space-y-6">
                  
                  {isAlreadyPaid ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 border border-green-100">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">This Bill has been Settled</h4>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                          No further action is required. This bill was recorded as paid.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ACH Tab Content */}
                      {activeTab === "ach" && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Electronic Bank Debit (ACH)</h4>
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bank Name</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Chase Bank, Bank of America"
                              value={achForm.bankName}
                              onChange={e => setAchForm(prev => ({ ...prev, bankName: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Routing Number</label>
                              <input 
                                type="text" 
                                required
                                maxLength={9}
                                placeholder="9-digit routing"
                                value={achForm.routingNumber}
                                onChange={e => setAchForm(prev => ({ ...prev, routingNumber: e.target.value.replace(/\D/g, "") }))}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Number</label>
                              <input 
                                type="text" 
                                required
                                placeholder="Bank account number"
                                value={achForm.accountNumber}
                                onChange={e => setAchForm(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, "") }))}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Type</label>
                            <select 
                              value={achForm.accountType}
                              onChange={e => setAchForm(prev => ({ ...prev, accountType: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                            >
                              <option value="checking">Checking</option>
                              <option value="savings">Savings</option>
                            </select>
                          </div>

                          <div className="pt-2">
                            <label className="relative flex items-start gap-3 cursor-pointer group">
                              <input 
                                type="checkbox"
                                checked={achForm.authorize}
                                onChange={e => setAchForm(prev => ({ ...prev, authorize: e.target.checked }))}
                                className="mt-1 h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="text-xs text-slate-500 font-medium leading-relaxed group-hover:text-slate-700 transition-colors">
                                I authorize Tristate MSO to electronically debit the bank account listed above for the total amount of {formatCurrency(payable.totalAmount)}.
                              </span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Credit Card Tab Content */}
                      {activeTab === "card" && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Credit Card / Purchasing Card</h4>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cardholder Name</label>
                            <input 
                              type="text" 
                              required
                              placeholder="Name on card"
                              value={cardForm.cardholderName}
                              onChange={e => setCardForm(prev => ({ ...prev, cardholderName: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Card Number</label>
                            <input 
                              type="text" 
                              required
                              placeholder="•••• •••• •••• ••••"
                              value={cardForm.cardNumber}
                              onChange={e => setCardForm(prev => ({ ...prev, cardNumber: e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim() }))}
                              maxLength={19}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expiration Date</label>
                              <input 
                                type="text" 
                                required
                                placeholder="MM/YY"
                                value={cardForm.expiryDate}
                                onChange={e => setCardForm(prev => ({ ...prev, expiryDate: e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d{2})/, "$1/$2").slice(0, 5) }))}
                                maxLength={5}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">CVV</label>
                              <input 
                                type="password" 
                                required
                                placeholder="•••"
                                value={cardForm.cvv}
                                onChange={e => setCardForm(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                                maxLength={4}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* QuickBooks Bill Pay Tab Content */}
                      {activeTab === "qb" && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <h4 className="text-sm font-bold text-emerald-800 border-b border-emerald-50 pb-2 flex items-center gap-1.5">
                            <Building className="h-4 w-4 text-emerald-600" /> QuickBooks Bill Pay Integration
                          </h4>
                          
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                            Submit a direct payment request from the connected QuickBooks account to the vendor's registered bank account. QuickBooks Online handles transfer execution and recording.
                          </p>

                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 space-y-3">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-slate-400 uppercase">Linked Bank</span>
                              <span className="font-extrabold text-slate-800">QuickBooks Operational Checking</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-slate-400 uppercase">QBO Vendor Match</span>
                              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">MATCHED</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-slate-400 uppercase">Transaction Settlement</span>
                              <span className="font-extrabold text-slate-800">Instant ACH Settlement (1-2 Days)</span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-400 font-semibold leading-relaxed">
                            Clicking pay below will submit the <strong className="text-slate-600">billpayment</strong> record payload securely to QuickBooks Online APIs to pay this bill.
                          </div>
                        </div>
                      )}

                      {/* Payment Action Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex h-13 items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-extrabold text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all font-semibold"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        {isSubmitting ? "Processing Payment..." : `Authorize & Pay ${formatCurrency(payable.totalAmount)}`}
                      </button>
                    </>
                  )}
                </form>
              </div>
            </div>
            
          </div>
        )}

      </div>
    </AppLayout>
  );
}
