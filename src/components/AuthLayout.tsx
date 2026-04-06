import type { ReactNode } from "react";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const trustedMetrics = [
  { value: "24/7", label: "Access for care teams" },
  { value: "99.9%", label: "Workflow continuity" },
  { value: "HIPAA", label: "Security-first posture" },
];

const highlights = [
  "Single dashboard for intake, scheduling, and follow-up",
  "Built for multi-location practices with shared visibility",
  "Fast handoff between front desk, billing, and clinical staff",
];

function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(199,231,255,0.95),_transparent_34%),linear-gradient(135deg,_#f4f9ff_0%,_#edf4ef_46%,_#f8efe4_100%)] text-slate-950">
      <div className="relative isolate mx-auto flex min-h-screen max-w-[1600px] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute left-[8%] top-[12%] h-48 w-48 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute bottom-[8%] right-[10%] h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
        </div>

        <section className="relative hidden w-[54%] flex-col justify-between border-r border-slate-200/70 px-10 py-10 lg:flex xl:px-16 xl:py-14">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-300/70 bg-white/70 px-4 py-2 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex h-9 w-9 items-center justify-center rounded-full  text-sm font-semibold tracking-[0.3em] text-white">
                <img src="/tristate-metadata-logo.png" />
              </div>
              <div>
                <p className="font-['Trebuchet_MS','Segoe_UI',sans-serif] text-xs uppercase tracking-[0.35em] text-slate-500">
                  Tristate MSO
                </p>
                <p className="font-['Georgia',serif] text-lg text-slate-950">
                  Practice Operations CRM
                </p>
              </div>
            </div>

            <div className="mt-20 max-w-2xl">
              <p className="font-['Trebuchet_MS','Segoe_UI',sans-serif] text-sm uppercase tracking-[0.45em] text-slate-500">
                Healthcare operations, simplified
              </p>
              <h1 className="mt-6 font-['Georgia',serif] text-6xl leading-[1.05] tracking-[-0.04em] text-slate-950">
                Keep every patient touchpoint moving from first call to final
                claim.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                A focused workspace for intake teams, coordinators, billing, and
                providers who need fewer handoff gaps and cleaner day-to-day
                operations.
              </p>
            </div>

            {/*<div className="mt-12 grid max-w-2xl grid-cols-3 gap-4">
              {trustedMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur"
                >
                  <p className="font-['Georgia',serif] text-3xl italic text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>*/}
          </div>

          {/*<div className="rounded-[32px] border border-white/80 bg-slate-950 px-7 py-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
            <p className="font-['Trebuchet_MS','Segoe_UI',sans-serif] text-sm uppercase tracking-[0.35em] text-slate-300">
              Why teams switch
            </p>
            <div className="mt-6 grid gap-4">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <p className="text-sm leading-7 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </div>*/}
        </section>

        <section className="relative flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-[46%] lg:px-8">
          <div className="w-full max-w-[540px] rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6">
            <div className="rounded-[28px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(245,248,252,0.95)_100%)] p-6 sm:p-8">
              <div>
                <p className="font-['Trebuchet_MS','Segoe_UI',sans-serif] text-xs uppercase tracking-[0.35em] text-slate-500">
                  Welcome
                </p>
                <h2 className="mt-3 font-['Georgia',serif] text-4xl tracking-[-0.04em] text-slate-950">
                  {title}
                </h2>
                {/*<p className="mt-4 text-sm leading-7 text-slate-600">
                  {description}
                </p>*/}
              </div>

              {children}

              {/*<div className="mt-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Protected access
                </p>
                <div className="h-px flex-1 bg-slate-200" />
              </div>*/}

              {/*<div className="mt-6 rounded-[28px] border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-['Georgia',serif] text-xl text-slate-950">
                      Trusted for daily practice coordination
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Role-based access, secure records, and shared status
                      across your organization.
                    </p>
                  </div>
                  <div className="hidden rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700 sm:block">
                    Verified
                  </div>
                </div>
              </div>*/}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
