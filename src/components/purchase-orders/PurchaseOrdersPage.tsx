import AppLayout from "../layout/AppLayout";
import PurchaseOrdersContent from "./PurchaseOrdersContent";

function PurchaseOrdersPage() {
  return (
    <AppLayout
      title="Purchase Orders"
      activeModule="Purchase Orders"
      activeSubItem="Unpaid POs"
    >
      <PurchaseOrdersContent />
    </AppLayout>
  );
}

export default PurchaseOrdersPage;
