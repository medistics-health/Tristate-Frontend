import CompactViewPage from "../shared/CompactViewPage";

function PendingApprovalPage() {
  return (
    <CompactViewPage
      title="Purchase Orders"
      activeModule="Purchase Orders"
      activeSubItem="Pending Approval"
      initialViewName="Pending Approval"
    />
  );
}

export default PendingApprovalPage;
