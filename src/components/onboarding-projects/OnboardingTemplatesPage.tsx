import AppLayout from "../layout/AppLayout";

export default function OnboardingTemplatesPage() {
  return (
    <AppLayout title="Onboarding Task Templates" activeModule="Onboarding Projects" activeSubItem="Templates">
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Task Templates</h2>
          <p className="mt-2 text-slate-500">
            Standard service line task templates for automated onboarding project setup.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
