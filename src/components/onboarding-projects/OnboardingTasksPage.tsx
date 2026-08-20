import AppLayout from "../layout/AppLayout";

export default function OnboardingTasksPage() {
  return (
    <AppLayout title="Onboarding Tasks" activeModule="Onboarding Projects" activeSubItem="Tasks">
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Onboarding Tasks</h2>
          <p className="mt-2 text-slate-500">
            Project tasks with phases, owners, start/due dates, and dependencies.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
