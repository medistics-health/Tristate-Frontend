import AppLayout from "../layout/AppLayout";

export default function OnboardingActionItemsPage() {
  return (
    <AppLayout title="Onboarding Action Items" activeModule="Onboarding Projects" activeSubItem="Action Items">
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Action Items</h2>
          <p className="mt-2 text-slate-500">
            Dated action item feed with responsible user tracking.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
