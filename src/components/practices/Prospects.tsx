import MetricFilterTablePage from "../shared/MetricFilterTablePage";

function ProspectsPage() {
  return (
    <MetricFilterTablePage
      title="Practice"
      activeModule="Practices"
      activeSubItem="Prospects"
      tableHeading="Prospects"
      rowIdPrefix="prospects"
    />
  );
}

export default ProspectsPage;
