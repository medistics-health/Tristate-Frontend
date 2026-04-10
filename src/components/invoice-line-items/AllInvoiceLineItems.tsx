import StandardEntityListPage from "../shared/StandardEntityListPage";

function AllInvoiceLineItems() {
  return (
    <StandardEntityListPage
      title="Invoice Line Items"
      activeModule="Invoice Line Items"
      activeSubItem="All Invoice Line Items"
      viewLabel="All Invoice Line Items"
      itemLabel="Invoice Line Item"
      emptyTitle="Add your first Invoice Line Item"
      emptyDescription="Use our API or add your first Invoice Line Item manually"
      emptyActionLabel="Add an Invoice Line Item"
    />
  );
}

export default AllInvoiceLineItems;
