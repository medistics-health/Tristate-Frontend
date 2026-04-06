import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { signUp } from "../services/operations/auth";
import AuthLayout from "./AuthLayout";

type SignupFormData = {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
  role: string;
  subscribe: boolean;
};

const initialFormData: SignupFormData = {
  firstName: "",
  lastName: "",
  userName: "",
  email: "",
  password: "",
  role: "Sales",
  subscribe: true,
};

function Signup() {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    if (
      event.target instanceof HTMLInputElement &&
      event.target.type === "checkbox"
    ) {
      setFormData((current) => ({
        ...current,
        [name]: event.target.checked,
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      userName: formData.userName.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
      role: formData.role.toUpperCase(),
    };

    const hasEmptyField = Object.values(payload).some((value) => !value);

    if (hasEmptyField) {
      toast.error("Complete all required signup fields.");
      return;
    }

    if (payload.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Creating your workspace...");

    try {
      const response = await signUp(payload);

      toast.success(response.message ?? "Account created successfully.", {
        id: loadingToast,
      });
      setFormData(initialFormData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create your account.";

      toast.error(message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      description="Set up your workspace and invite your team to a shared operations hub."
    >
      <div className="mt-6 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <Link
          to="/login"
          className="inline-flex rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
        >
          Sign up
        </Link>
      </div>

      <form
        className="mt-6 mb-4 space-y-4 h-64 overflow-y-auto"
        onSubmit={handleSignUp}
      >
        <div className="grid gap-4 sm:grid-cols-2 ">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              First name
            </span>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Olivia"
              autoComplete="given-name"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Last name
            </span>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Carter"
              autoComplete="family-name"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Username
          </span>
          <input
            type="text"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            placeholder="olivia.carter"
            autoComplete="username"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Work email
          </span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="team@practice.com"
            autoComplete="email"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Min 8 characters
            </span>
          </div>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Role
          </span>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-950"
          >
            <option value="SALES">Sales</option>
            <option value="ACCOUNTMANAGER">Account Manager</option>
            <option value="OPERATIONS">Operations</option>
            <option value="FINANCE">Finance</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </label>

        {/*<div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              name="subscribe"
              checked={formData.subscribe}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
            />
            Send product updates and onboarding tips
          </label>
          <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Secure
          </span>
        </div>*/}
      </form>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
      >
        {isSubmitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Creating...
          </>
        ) : (
          "Create workspace"
        )}
      </button>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-slate-950 transition hover:text-slate-700"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;
