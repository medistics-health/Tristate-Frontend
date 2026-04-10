import StandardEntityListPage from "../shared/StandardEntityListPage";

function DealsPage() {
  return (
    <StandardEntityListPage
      title="Deals"
      activeModule="Deals"
      activeSubItem="All Deals"
      viewLabel="All Deals"
      itemLabel="Deal"
      emptyTitle="Add your first Deal"
      emptyDescription="Use our API or add your first Deal manually"
      emptyActionLabel="Add a Deal"
    />
  );
}

export default DealsPage;
