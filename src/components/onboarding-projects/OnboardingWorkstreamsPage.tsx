import AppLayout from "../layout/AppLayout";

export default function OnboardingWorkstreamsPage() {
  return (
    <AppLayout title="Onboarding Workstreams" activeModule="Onboarding Projects" activeSubItem="Workstreams">
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Onboarding Workstreams</h2>
          <p className="mt-2 text-slate-500">
            Workstreams by service line (HR, Credentialing, RCM, CCM, etc.).
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
