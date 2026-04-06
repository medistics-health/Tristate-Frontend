import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { login } from "../services/operations/auth";
import AuthLayout from "./AuthLayout";

type LoginFormData = {
  userName: string;
  password: string;
  rememberMe: boolean;
};

const initialFormData: LoginFormData = {
  userName: "",
  password: "",
  rememberMe: false,
};

function Login() {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userName = formData.userName.trim();
    const password = formData.password.trim();

    if (!userName || !password) {
      toast.error("Enter both username and password.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Signing you in...");

    try {
      const response = await login({ userName, password });

      toast.success(response.message ?? "Signed in successfully.", {
        id: loadingToast,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign you in.";

      toast.error(message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Access your Tristate workspace and continue managing patient operations."
    >
      <div className="mt-8 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <Link
          to="/login"
          className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="inline-flex rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          Sign up
        </Link>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Username or email
          </span>
          <input
            type="text"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            placeholder="team@practice.com"
            autoComplete="username"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <button
              type="button"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-950"
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
          />
        </label>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
            />
            Keep me signed in
          </label>
          <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Secure
          </span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in...
            </>
          ) : (
            "Sign in to dashboard"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Need an account?{" "}
        <Link
          to="/signup"
          className="font-semibold text-slate-950 transition hover:text-slate-700"
        >
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
