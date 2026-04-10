import MetricFilterTablePage from "../shared/MetricFilterTablePage";

function ReminderDuePage() {
  return (
    <MetricFilterTablePage
      title="Practice"
      activeModule="Practice"
      activeSubItem="Reminder Due"
      tableHeading="Reminder Due"
      rowIdPrefix="reminder-due"
    />
  );
}

export default ReminderDuePage;
