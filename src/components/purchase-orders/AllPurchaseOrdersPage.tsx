import StandardEntityListPage from "../shared/StandardEntityListPage";

function AllPurchaseOrdersPage() {
  return (
    <StandardEntityListPage
      title="Purchase Orders"
      activeModule="Purchase Orders"
      activeSubItem="All Purchase Orders"
      viewLabel="All Purchase Orders"
      itemLabel="Purchase Order"
      emptyTitle="Add your first Purchase Order"
      emptyDescription="Use our API or add your first Purchase Order manually"
      emptyActionLabel="Add a Purchase Order"
    />
  );
}

export default AllPurchaseOrdersPage;
