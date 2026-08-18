import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  authMe,
  login,
  setup2FA,
  verify2FASetup,
  verify2FALogin,
} from "../../services/operations/auth";
import AuthLayout from "./AuthLayout";
import OtpInput from "../shared/OtpInput";
import { Spinner } from "../layout/Spinner";

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
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA state
  const [step, setStep] = useState<"login" | "2fa-verify" | "2fa-setup">("login");
  const [twoFactorUserId, setTwoFactorUserId] = useState<string>("");
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const response: any = await authMe();
        if (response && response.id) {
          localStorage.setItem("user", JSON.stringify(response));
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch (_) {
        // Not authenticated
      } finally {
        setCheckingAuth(false);
      }
    }
    checkExistingSession();
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
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
    const identifier = userName;

    setIsSubmitting(true);
    const loadingToast = toast.loading("Signing you in...");

    try {
      const response = await login({ identifier, password });

      if (response.require2FA) {
        toast.dismiss(loadingToast);
        setTwoFactorUserId(response.userId);

        if (response.isConfigured) {
          setStep("2fa-verify");
          toast.success("Password verified. Enter your 2FA code.");
        } else {
          // 2FA enabled but not yet configured -> setup QR code screen
          const setupRes = await setup2FA(response.userId);
          setQrCodeDataUrl(setupRes.qrCodeDataUrl);
          setSecretKey(setupRes.secret);
          setStep("2fa-setup");
          toast.success("Scan the QR code with Microsoft Authenticator.");
        }
        return;
      }

      toast.success(response.message ?? "Signed in successfully.", {
        id: loadingToast,
      });
      navigate("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign you in.";

      toast.error(message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify2FALogin(e: React.FormEvent) {
    e.preventDefault();
    if (twoFactorCode.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Verifying code...");
    try {
      const res = await verify2FALogin(twoFactorUserId, twoFactorCode.trim());
      toast.success(res.message ?? "Signed in successfully.", { id: loadingToast });
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      toast.error(message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify2FASetup(e: React.FormEvent) {
    e.preventDefault();
    if (twoFactorCode.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Activating 2FA...");
    try {
      const res = await verify2FASetup(twoFactorCode.trim(), twoFactorUserId);
      toast.success(res.message ?? "2FA activated & signed in successfully.", {
        id: loadingToast,
      });
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Setup verification failed.";
      toast.error(message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isOnboardingPage = localStorage.getItem("onBoardingId");
  const isSignDocPage = localStorage.getItem("documentId");

  return (
    <AuthLayout
      title={
        step === "login"
          ? "Sign in"
          : step === "2fa-verify"
            ? "Two-Factor Verification"
            : "Setup Microsoft Authenticator"
      }
      description={
        step === "login"
          ? "Access your Tristate workspace and continue managing patient operations."
          : step === "2fa-verify"
            ? "Enter the 6-digit security code generated by Microsoft Authenticator."
            : "Scan the QR code in Microsoft Authenticator app, then enter the 6-digit code."
      }
    >
      {step === "login" && (
        <>
          <div className="mt-8 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <Link
              to="/login"
              className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            >
              Login
            </Link>
            {(!isOnboardingPage || !isSignDocPage) && (
              <Link
                to="/signup"
                className="inline-flex rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
              >
                Sign up
              </Link>
            )}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
        </>
      )}

      {step === "2fa-verify" && (
        <form className="mt-8 space-y-5" onSubmit={handleVerify2FALogin}>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-600">
            Open <strong>Microsoft Authenticator</strong> or your preferred TOTP app and enter the 6-digit PIN.
          </div>

          <div>
            <span className="mb-3 block text-center text-sm font-medium text-slate-700">
              Enter 6-Digit Verification PIN
            </span>
            <OtpInput
              value={twoFactorCode}
              onChange={setTwoFactorCode}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || twoFactorCode.length !== 6}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Verifying...
              </>
            ) : (
              "Verify & Sign In"
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("login");
              setTwoFactorCode("");
            }}
            className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Back to sign in
          </button>
        </form>
      )}

      {step === "2fa-setup" && (
        <form className="mt-6 space-y-5" onSubmit={handleVerify2FASetup}>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
              <div className="mt-3 text-center">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  Manual Entry Key
                </span>
                <code className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 inline-block mt-1">
                  {secretKey}
                </code>
              </div>
            )}
          </div>

          <div>
            <span className="mb-3 block text-center text-sm font-medium text-slate-700">
              Enter 6-Digit PIN from Authenticator to activate
            </span>
            <OtpInput
              value={twoFactorCode}
              onChange={setTwoFactorCode}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || twoFactorCode.length !== 6}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Activating 2FA...
              </>
            ) : (
              "Verify & Activate 2FA"
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("login");
              setTwoFactorCode("");
            }}
            className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Back to sign in
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export default Login;

