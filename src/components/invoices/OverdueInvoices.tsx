import MetricFilterTablePage from "../shared/MetricFilterTablePage";

function OverdueInvoicePage() {
  return (
    <MetricFilterTablePage
      title="Invoices"
      activeModule="Invoices"
      activeSubItem="Overdue Invoices"
      tableHeading="Overdue Invoices"
      rowIdPrefix="overdue-invoices"
    />
  );
}

export default OverdueInvoicePage;
