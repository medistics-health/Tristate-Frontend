import StandardEntityListPage from "../shared/StandardEntityListPage";

function AllServices() {
  return (
    <StandardEntityListPage
      title="Services"
      activeModule="Services"
      activeSubItem="All Services"
      viewLabel="All Services"
      itemLabel="Service"
      emptyTitle="Add your first Service"
      emptyDescription="Use our API or add your first Service manually"
      emptyActionLabel="Add a Service"
    />
  );
}

export default AllServices;
