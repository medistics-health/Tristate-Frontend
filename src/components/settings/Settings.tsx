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
} from "../../services/operations/users";
import {
  disconnectQuickBooks,
  connectQuickBooks,
} from "../../services/operations/quickbooks";
import {
  getAllCompanies,
  type Company,
} from "../../services/operations/companies";
import { getMercuryAccounts } from "../../services/operations/mercury";
import QuickBooksIntegrations from "../integrations/QuickBooksIntegrations";

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

export default function SettingsPage() {
  const location = useLocation();
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
    invoiceDueDays: 15,
    invoiceReminderDays: 5,
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
      const data = await getSystemSettingsApi();
      setOrgSettings({
        organizationName: data.organizationName || "",
        domain: data.domain || "",
        address: data.address || "",
        supportEmail: data.supportEmail || "",
        authorizedSigner: data.authorizedSigner || "",
        notifyTo: Array.isArray(data.notifyTo) ? data.notifyTo : [],
        invoiceDueDays: data.invoiceDueDays ?? 15,
        invoiceReminderDays: data.invoiceReminderDays ?? 5,
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
            {activeTab === "team" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-xl bg-[#4f63ea] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#3d4ed1] shadow-lg shadow-blue-500/10"
              >
                Add Member
              </button>
            )}
            <button
              onClick={handleSaveGeneral}
              disabled={isSaving || activeTab !== "general"}
              className="flex items-center gap-2 rounded-xl bg-white border border-[#ece8e1] px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              ) : (
                <Save className="h-4 w-4 text-slate-400" />
              )}
              Save Changes
            </button>
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
                        <th className="px-6 py-5 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                          Action
                        </th>
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
                            <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-600 tracking-tight">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600 border border-emerald-100">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
                              Active
                            </span>
                          </td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "security" && (
            <div className="max-w-xl space-y-6">
              <div className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-[#4f63ea]" />
                    <h4 className="font-bold text-slate-800">
                      Two-Factor Authentication
                    </h4>
                  </div>
                  <div className="h-6 w-11 rounded-full bg-[#4f63ea] relative">
                    <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Secure your account by requiring an additional verification
                  code.
                </p>
              </div>
            </div>
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
                  <option value="INTERNAL">Internal</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
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
                  <option value="INTERNAL">Internal</option>
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
