import AppLayout from "../layout/AppLayout";

export default function OnboardingProjectsPage() {
  return (
    <AppLayout title="Onboarding Projects" activeModule="Project Management" activeSubItem="Projects">
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Onboarding Projects</h2>
          <p className="mt-2 text-slate-500">
            Master operational onboarding project tracker for practices.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
