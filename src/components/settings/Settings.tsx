import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  User,
  CreditCard,
  Link as LinkIcon,
  Shield,
  Save,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  SettingsIcon,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getAllUsers,
  updateUserApi,
  createUserApi,
  deleteUserApi,
  getSystemSettingsApi,
  updateSystemSettingsApi,
  type SystemSettings,
} from "../../services/operations/users";
import { getMercuryAccounts } from "../../services/operations/mercury";
import QuickBooksIntegrations from "../integrations/QuickBooksIntegrations";
import { canManageSettings, readStoredUser } from "../../utils/auth";
import { authMe, toggle2FA, verify2FASetup } from "../../services/operations/auth";
import OtpInput from "../shared/OtpInput";

function parseNotifyToEmails(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,;]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function SecuritySettingsSection() {
  const currentUser = readStoredUser();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const data = await authMe();
      if (data && typeof data.twoFactorEnabled === "boolean") {
        setIsEnabled(data.twoFactorEnabled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    const nextState = !isEnabled;

    if (nextState) {
      // User wants to enable 2FA -> fetch QR setup
      const toastId = toast.loading("Generating 2FA setup...");
      try {
        const res = await toggle2FA(true);
        toast.dismiss(toastId);
        if (res.requireSetup) {
          setQrCodeDataUrl(res.qrCodeDataUrl);
          setSecretKey(res.secret);
          setShowSetupModal(true);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to initiate 2FA setup.", { id: toastId });
      }
    } else {
      // User wants to disable 2FA
      const toastId = toast.loading("Disabling 2FA...");
      try {
        await toggle2FA(false);
        setIsEnabled(false);
        toast.success("2FA disabled successfully.", { id: toastId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to disable 2FA.", { id: toastId });
      }
    }
  }

  async function handleVerifyAndActivate(e: React.FormEvent) {
    e.preventDefault();
    if (verifyCode.trim().length !== 6) {
      toast.error("Please enter a 6-digit code.");
      return;
    }

    setIsVerifying(true);
    const toastId = toast.loading("Activating 2FA...");
    try {
      await verify2FASetup(verifyCode.trim());
      setIsEnabled(true);
      setShowSetupModal(false);
      setVerifyCode("");
      toast.success("Two-Factor Authentication is now enabled!", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed.", { id: toastId });
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#4f63ea]" />
            <h4 className="font-bold text-slate-800">
              Two-Factor Authentication (2FA)
            </h4>
          </div>

          {loading ? (
            <div className="h-6 w-11 animate-pulse rounded-full bg-slate-200" />
          ) : (
            <button
              type="button"
              onClick={handleToggle}
              className={`h-6 w-11 rounded-full relative transition-colors focus:outline-none ${
                isEnabled ? "bg-[#4f63ea]" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  isEnabled ? "right-1" : "left-1"
                }`}
              />
            </button>
          )}
        </div>

        <p className="text-sm text-slate-500">
          Protect your personal user account (<strong>{currentUser?.email || currentUser?.userName || "Your account"}</strong>) using Microsoft Authenticator or any TOTP authenticator app.
        </p>

        <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">2FA Status for your account:</span>
          <span
            className={`font-bold px-2.5 py-1 rounded-full ${
              isEnabled
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {showSetupModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#f1efeb] px-6 py-5">
              <h3 className="text-lg font-bold text-slate-800">
                Setup Microsoft Authenticator
              </h3>
              <button
                onClick={() => {
                  setShowSetupModal(false);
                  setVerifyCode("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyAndActivate} className="p-6 space-y-5">
              <div className="flex flex-col items-center justify-center  p-4 text-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="h-44 w-44 rounded-xl border bg-white p-2 shadow-sm"
                  />
                ) : (
                  <div className="h-44 w-44 animate-pulse rounded-xl bg-slate-200" />
                )}
                {secretKey && (
                  <div className="mt-3">
                    <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider block">
                      Manual Entry Secret
                    </span>
                    <code className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200 inline-block mt-1">
                      {secretKey}
                    </code>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm  text-slate-700 block text-center">
                  Open you Authenticator app and scan the QR code above to add your account.
                </label>
                 <label className="text-sm font-semibold text-slate-700 block text-center">
                  6-Digit PIN to verify setup
                </label>
                <OtpInput
                  value={verifyCode}
                  onChange={setVerifyCode}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSetupModal(false);
                    setVerifyCode("");
                  }}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || verifyCode.length !== 6}
                  className="rounded-xl bg-[#4f63ea] px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-600 disabled:bg-slate-300"
                >
                  {isVerifying ? "Verifying..." : "Enable 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const location = useLocation();
  const currentRole = readStoredUser()?.role as string | undefined;
  const canWriteSettings = canManageSettings(currentRole);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Modals / Editing state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    userName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "VIEWER",
  });

  // General Settings state
  const [orgSettings, setOrgSettings] = useState({
    organizationName: "",
    domain: "",
    address: "",
    supportEmail: "",
    authorizedSigner: "",
    notifyTo: [] as string[],
    creditCardCompanyRatePercent: 1.4,
    creditCardCompanyFixedFee: 0.3,
    creditCardClientRatePercent: 1.5,
    creditCardClientFixedFee: 0,
    achCompanyRatePercent: 0.8,
    achCompanyCapAmount: 5,
    achClientRatePercent: 0,
    achClientCapAmount: 0,
    invoiceDueDays: 15,
    invoiceReminderDays: 5,
    credentialingReminderDays: 5,
  });
  const [notifyToInput, setNotifyToInput] = useState("");
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Mercury Status state
  const [isMercuryConnected, setIsMercuryConnected] = useState<boolean | null>(
    null,
  );
  const [mercuryEnv, setMercuryEnv] = useState("production");

  const [searchTerm, setSearchTerm] = useState("");

  // Determine active tab from URL
  const activeTab = location.pathname.split("/").pop() || "general";

  useEffect(() => {
    if (activeTab === "team") {
      loadUsers();
    }
    if (activeTab === "general") {
      loadSettings();
    }
  }, [activeTab]); // Run when activeTab changes

  useEffect(() => {
    if (activeTab === "integrations") {
      loadMercuryStatus();
    }
  }, [activeTab]);

  async function loadMercuryStatus() {
    try {
      const mercuryData = await getMercuryAccounts();
      setIsMercuryConnected(!!mercuryData.configured);
      if (mercuryData.environment) {
        setMercuryEnv(mercuryData.environment);
      }
    } catch (err) {
      console.error("Failed to load mercury status", err);
    }
  }

  async function loadUsers() {
    setIsLoadingUsers(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (e) {
      toast.error("Failed to load team members");
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function loadSettings() {
    setIsLoadingSettings(true);
    try {
      const data: SystemSettings = await getSystemSettingsApi();
      setOrgSettings({
        organizationName: data.organizationName || "",
        domain: data.domain || "",
        address: data.address || "",
        supportEmail: data.supportEmail || "",
        authorizedSigner: data.authorizedSigner || "",
        notifyTo: Array.isArray(data.notifyTo) ? data.notifyTo : [],
        creditCardCompanyRatePercent:
          data.creditCardCompanyRatePercent ?? 1.4,
        creditCardCompanyFixedFee: data.creditCardCompanyFixedFee ?? 0.3,
        creditCardClientRatePercent:
          data.creditCardClientRatePercent ?? 1.5,
        creditCardClientFixedFee: data.creditCardClientFixedFee ?? 0,
        achCompanyRatePercent: data.achCompanyRatePercent ?? 0.8,
        achCompanyCapAmount: data.achCompanyCapAmount ?? 5,
        achClientRatePercent: data.achClientRatePercent ?? 0,
        achClientCapAmount: data.achClientCapAmount ?? 0,
        invoiceDueDays: data.invoiceDueDays ?? 15,
        invoiceReminderDays: data.invoiceReminderDays ?? 5,
        credentialingReminderDays: data.credentialingReminderDays ?? 5,
      });
      setNotifyToInput(
        Array.isArray(data.notifyTo) ? data.notifyTo.join(", ") : "",
      );
    } catch (e) {
      toast.error("Failed to load organization settings");
    } finally {
      setIsLoadingSettings(false);
    }
  }

  const handleSaveGeneral = async () => {
    if (!canWriteSettings) {
      toast.error("Only admin users can update organization settings.");
      return;
    }
    setIsSaving(true);
    try {
      await updateSystemSettingsApi({
        ...orgSettings,
        authorizedSigner: orgSettings.authorizedSigner.trim(),
        notifyTo: parseNotifyToEmails(notifyToInput),
      });
      toast.success("Organization profile updated");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!canWriteSettings) {
      toast.error("Only admin users can add team members.");
      return;
    }
    try {
      await createUserApi(newUser);
      toast.success("Team member added");
      setShowAddModal(false);
      setNewUser({
        userName: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "VIEWER",
      });
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    if (!canWriteSettings) {
      toast.error("Only admin users can update team members.");
      return;
    }

    try {
      await updateUserApi(editingUser.id, editingUser);
      toast.success("User updated successfully");
      setEditingUser(null);
      loadUsers();
    } catch (e) {
      toast.error("Failed to update user");
    }
  }

  async function handleDeleteUser(id: string) {
    if (!canWriteSettings) {
      toast.error("Only admin users can delete team members.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this team member?"))
      return;
    try {
      await deleteUserApi(id);
      toast.success("Member removed");
      loadUsers();
    } catch (e) {
      toast.error("Failed to remove member");
    }
  }

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.role}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <AppLayout
      title="Settings"
      activeModule="Settings"
      activeSubItem={
        activeTab === "general"
          ? "General Settings"
          : activeTab === "integrations"
            ? "API & Integrations"
            : activeTab === "team"
              ? "Team Management"
              : "Security & Access"
      }
    >
      <div className="flex h-full flex-col gap-4 m-4">
        {/* Header - Premium Unified Layout */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-[#ece8e1] shadow-sm">
              {activeTab === "general" && (
                <SettingsIcon className="h-6 w-6 text-[#4f63ea]" />
              )}
              {activeTab === "integrations" && (
                <LinkIcon className="h-6 w-6 text-[#4f63ea]" />
              )}
              {activeTab === "team" && (
                <User className="h-6 w-6 text-[#4f63ea]" />
              )}
              {activeTab === "security" && (
                <Shield className="h-6 w-6 text-[#4f63ea]" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 capitalize leading-tight">
                {activeTab === "integrations"
                  ? "API & Integrations"
                  : activeTab.replace(/-/g, " ")}
              </h1>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>Settings</span>
                <span>/</span>
                <span className="capitalize">
                  {activeTab.replace(/-/g, " ")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "team" && canWriteSettings && (
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-xl bg-[#4f63ea] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#3d4ed1] shadow-lg shadow-blue-500/10"
              >
                Add Member
              </button>
            )}
            {activeTab === "general" && canWriteSettings && (
              <button
                onClick={handleSaveGeneral}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-white border border-[#ece8e1] px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                ) : (
                  <Save className="h-4 w-4 text-slate-400" />
                )}
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Content Area - No more internal sidebar! */}
        <div className="flex-1 overflow-y-auto rounded-3xl border border-[#ece8e1] bg-white p-5 shadow-sm m-2">
          {activeTab === "general" && (
            <div className="max-w-2xl space-y-8">
              {isLoadingSettings ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ece8e1] border-t-[#4f63ea]" />
                </div>
              ) : (
                <section>
                  <h3 className="text-lg font-bold text-slate-800">
                    Organization Profile
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    This information will be displayed on invoices and reports.
                  </p>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={orgSettings.organizationName}
                        onChange={(e) =>
                          setOrgSettings({
                            ...orgSettings,
                            organizationName: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Business Domain
                      </label>
                      <input
                        type="text"
                        value={orgSettings.domain}
                        onChange={(e) =>
                          setOrgSettings({
                            ...orgSettings,
                            domain: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={orgSettings.supportEmail}
                        onChange={(e) =>
                          setOrgSettings({
                            ...orgSettings,
                            supportEmail: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Authorized Signer *
                      </label>
                      <input
                        type="email"
                        required
                        value={orgSettings.authorizedSigner}
                        onChange={(e) =>
                          setOrgSettings({
                            ...orgSettings,
                            authorizedSigner: e.target.value,
                          })
                        }
                        placeholder="signer@company.com"
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                      <p className="text-xs text-slate-400">
                        Primary signer email for the first party agreement
                        request.
                      </p>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Notify To
                      </label>
                      <textarea
                        rows={3}
                        value={notifyToInput}
                        onChange={(e) => {
                          setNotifyToInput(e.target.value);
                          setOrgSettings((current) => ({
                            ...current,
                            notifyTo: parseNotifyToEmails(e.target.value),
                          }));
                        }}
                        placeholder="copy1@company.com, copy2@company.com"
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                      <p className="text-xs text-slate-400">
                        Enter multiple email addresses separated by commas or
                        new lines.
                      </p>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Business Address
                      </label>
                      <textarea
                        rows={3}
                        value={orgSettings.address}
                        onChange={(e) =>
                          setOrgSettings({
                            ...orgSettings,
                            address: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Invoice Due Period (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={orgSettings.invoiceDueDays}
                        onChange={(e) =>
                          setOrgSettings({
                            ...orgSettings,
                            invoiceDueDays: parseInt(e.target.value, 10) || 15,
                          })
                        }
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Invoice Reminder Period (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={orgSettings.invoiceReminderDays}
                        onChange={(e) =>
                          setOrgSettings({
                            ...orgSettings,
                            invoiceReminderDays: parseInt(e.target.value, 10) || 5,
                          })
                        }
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Credentialing Reminder Period (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={orgSettings.credentialingReminderDays}
                        onChange={(e) =>
                          setOrgSettings({
                            ...orgSettings,
                            credentialingReminderDays:
                              parseInt(e.target.value, 10) || 5,
                          })
                        }
                        className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                      />
                    </div>
                    <div className="col-span-2 rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-800">
                          Processing Fee Rules
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          These values drive the billing run payment method and bearer calculations.
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Credit Card
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Bearer
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Rate %
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Fixed Fee
                        </div>
                        <div />

                        <div className="self-center text-sm font-medium text-slate-700">
                          Company
                        </div>
                        <input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={orgSettings.creditCardCompanyRatePercent}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              creditCardCompanyRatePercent:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl border border-[#ece8e1] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={orgSettings.creditCardCompanyFixedFee}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              creditCardCompanyFixedFee:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl border border-[#ece8e1] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                        />
                        <div />

                        <div className="self-center text-sm font-medium text-slate-700">
                          Client
                        </div>
                        <input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={orgSettings.creditCardClientRatePercent}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              creditCardClientRatePercent:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl border border-[#ece8e1] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={orgSettings.creditCardClientFixedFee}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              creditCardClientFixedFee:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl border border-[#ece8e1] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                        />
                        <div />

                        <div className="col-span-4 mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                          ACH
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Bearer
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Rate %
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Cap Amount
                        </div>
                        <div />

                        <div className="self-center text-sm font-medium text-slate-700">
                          Company
                        </div>
                        <input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={orgSettings.achCompanyRatePercent}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              achCompanyRatePercent:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl border border-[#ece8e1] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={orgSettings.achCompanyCapAmount}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              achCompanyCapAmount:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl border border-[#ece8e1] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                        />
                        <div />

                        <div className="self-center text-sm font-medium text-slate-700">
                          Client
                        </div>
                        <input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={orgSettings.achClientRatePercent}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              achClientRatePercent:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl border border-[#ece8e1] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={orgSettings.achClientCapAmount}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              achClientCapAmount:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl border border-[#ece8e1] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#4f63ea]"
                        />
                        <div />
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <QuickBooksIntegrations />

              {/* Stripe Card */}
              <div className="flex items-center justify-between rounded-2xl border border-[#ece8e1] bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 shadow-sm">
                    <CreditCard className="h-6 w-6 text-[#635bff]" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-slate-800">
                      Stripe Payments
                    </h4>
                    <p className="text-xs text-slate-500">
                      Handle credit cards & ACH processing for your invoices.
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-600 border border-emerald-100 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Global Active
                </span>
              </div>

              {/* Mercury Bank Card */}
              <div className="flex items-center justify-between rounded-2xl border border-[#ece8e1] bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 shadow-sm text-slate-800">
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-slate-800">
                      Mercury Banking
                    </h4>
                    <p className="text-xs text-slate-500">
                      Read-only banking layer for automated reconciliation.
                    </p>
                  </div>
                </div>
                {isMercuryConnected === null ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 shadow-sm">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking…
                  </span>
                ) : isMercuryConnected ? (
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold border shadow-sm ${mercuryEnv === "sandbox" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                    {mercuryEnv === "sandbox"
                      ? "Sandbox Connected"
                      : "API Connected"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 shadow-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />{" "}
                    Disconnected
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                  <input
                    type="text"
                    placeholder="Search team by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] pl-12 pr-5 py-3 text-sm outline-none transition-all focus:border-[#4f63ea] focus:bg-white"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-400">
                  Total:{" "}
                  <span className="text-slate-800 font-bold">
                    {users.length}
                  </span>
                </div>
              </div>

              {isLoadingUsers ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#f1efeb] border-t-[#4f63ea]" />
                  <p className="text-sm font-medium text-slate-500">
                    Fetching team members...
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[#ece8e1]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#fbfaf8] border-b border-[#ece8e1]">
                      <tr>
                        <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                          Team Member
                        </th>
                        <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                          Access Role
                        </th>
                        <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                          Account Status
                        </th>
                        <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                          2FA Status
                        </th>
                        {canWriteSettings && (
                          <th className="px-6 py-5 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                            Action
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ece8e1]">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-blue-50/30 transition-all group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-2xl bg-white border border-[#ece8e1] shadow-sm text-[#4f63ea] flex items-center justify-center font-bold text-sm uppercase">
                                {user.firstName[0]}
                                {user.lastName[0]}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-[12px] text-slate-500">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {(() => {
                              const roleColors: Record<string, string> = {
                                ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
                                FINANCE: "bg-emerald-50 text-emerald-700 border-emerald-200",
                                OPERATIONS: "bg-blue-50 text-blue-700 border-blue-200",
                                SALES: "bg-amber-50 text-amber-700 border-amber-200",
                                ACCOUNTMANAGER: "bg-indigo-50 text-indigo-700 border-indigo-200",
                                VIEWER: "bg-slate-100 text-slate-600 border-slate-200",
                              };
                              const colorClass = roleColors[user.role?.toUpperCase()] || "bg-slate-100 text-slate-600 border-slate-200";
                              return (
                                <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[11px] font-extrabold tracking-tight ${colorClass}`}>
                                  {user.role}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600 border border-emerald-100">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            {user.twoFactorEnabled ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                Enabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 border border-slate-200">
                                Disabled
                              </span>
                            )}
                          </td>
                          {canWriteSettings && (
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => setEditingUser(user)}
                                  className="p-2.5 rounded-xl text-slate-400 hover:bg-white hover:text-[#4f63ea] hover:shadow-sm transition-all"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2.5 rounded-xl text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-sm transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "security" && (
            <SecuritySettingsSection />
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#f1efeb] px-8 py-6">
              <h2 className="text-xl font-bold text-slate-800">
                Edit Team Member
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.firstName}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.lastName}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        lastName: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                >
                  <option value="SALES">Sales</option>
                  <option value="ACCOUNTMANAGER">Account Manager</option>
                  <option value="OPERATIONS">Operations</option>
                  <option value="FINANCE">Finance</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {canWriteSettings && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900">
                  <label className="flex items-center gap-2.5 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingUser.reset2FA}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          reset2FA: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-amber-300 text-[#4f63ea] focus:ring-[#4f63ea]"
                    />
                    Reset 2FA Authentication
                  </label>
                  <p className="mt-1 text-[11px] text-amber-700 leading-relaxed">
                    Check this to disable 2FA and clear secret key for this member if they lost access to Microsoft Authenticator.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-xl border border-[#ece8e1] py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#4f63ea] py-3 text-sm font-bold text-white hover:bg-[#3d4ed1] transition-all shadow-lg shadow-blue-500/20"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#f1efeb] px-8 py-6">
              <h2 className="text-xl font-bold text-slate-800">
                Add Team Member
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Username
                </label>
                <input
                  type="text"
                  value={newUser.userName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, userName: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, firstName: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, lastName: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-2.5 text-sm outline-none focus:border-[#4f63ea]"
                >
                  <option value="SALES">Sales</option>
                  <option value="ACCOUNTMANAGER">Account Manager</option>
                  <option value="OPERATIONS">Operations</option>
                  <option value="FINANCE">Finance</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-[#ece8e1] py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#4f63ea] py-3 text-sm font-bold text-white hover:bg-[#3d4ed1] transition-all shadow-lg shadow-blue-500/20"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
