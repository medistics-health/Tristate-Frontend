import StandardEntityListPage from "../shared/StandardEntityListPage";

function AllInvoicePage() {
  return (
    <StandardEntityListPage
      title="Invoices"
      activeModule="Invoices"
      activeSubItem="All Invoices"
      viewLabel="All Invoices"
      itemLabel="Invoice"
      emptyTitle="Add your first Invoice"
      emptyDescription="Use our API or add your first Invoice manually"
      emptyActionLabel="Add an Invoice"
    />
  );
}

export default AllInvoicePage;
