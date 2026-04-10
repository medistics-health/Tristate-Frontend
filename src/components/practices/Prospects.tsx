import MetricFilterTablePage from "../shared/MetricFilterTablePage";

function ProspectsPage() {
  return (
    <MetricFilterTablePage
      title="Practice"
      activeModule="Practice"
      activeSubItem="Prospects"
      tableHeading="Prospects"
      rowIdPrefix="prospects"
    />
  );
}

export default ProspectsPage;
