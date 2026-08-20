import AppLayout from "../layout/AppLayout";

export default function OnboardingMilestonesPage() {
  return (
    <AppLayout title="Onboarding Milestones" activeModule="Onboarding Projects" activeSubItem="Milestones">
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Onboarding Milestones</h2>
          <p className="mt-2 text-slate-500">
            Project milestones timeline (M1, M2...) and target dates.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
