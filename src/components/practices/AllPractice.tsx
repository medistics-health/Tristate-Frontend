import StandardEntityListPage from "../shared/StandardEntityListPage";

function AllPracticePage() {
  return (
    <StandardEntityListPage
      title="Practice"
      activeModule="Practice"
      activeSubItem="All Practice"
      viewLabel="All Practice Partner"
      itemLabel="Practice"
      emptyTitle="Add your first Practice"
      emptyDescription="Use our API or add your first Practice manually"
      emptyActionLabel="Add a Practice"
    />
  );
}

export default AllPracticePage;
