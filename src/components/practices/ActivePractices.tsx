import MetricFilterTablePage from "../shared/MetricFilterTablePage";

function ActivePracticesPage() {
  return (
    <MetricFilterTablePage
      title="Practice"
      activeModule="Practice"
      activeSubItem="Active Practice"
      tableHeading="Active Practice"
      rowIdPrefix="active-practice"
    />
  );
}

export default ActivePracticesPage;
