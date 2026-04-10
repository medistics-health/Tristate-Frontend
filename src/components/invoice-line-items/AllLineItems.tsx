import StandardEntityListPage from "../shared/StandardEntityListPage";

function AllLineItems() {
  return (
    <StandardEntityListPage
      title="Invoice Line Items"
      activeModule="Invoice Line Items"
      activeSubItem="All Line Items"
      viewLabel="All Line Items"
      itemLabel="Line Item"
      emptyTitle="Add your first Line Item"
      emptyDescription="Use our API or add your first Line Item manually"
      emptyActionLabel="Add a Line Item"
    />
  );
}

export default AllLineItems;
