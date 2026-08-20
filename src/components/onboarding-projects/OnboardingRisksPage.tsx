import AppLayout from "../layout/AppLayout";

export default function OnboardingRisksPage() {
  return (
    <AppLayout title="Onboarding Risk Register" activeModule="Onboarding Projects" activeSubItem="Risks">
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Risk Register</h2>
          <p className="mt-2 text-slate-500">
            Practice & Workstream risk tracking, rating, and mitigations.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
