import StandardEntityListPage from "../shared/StandardEntityListPage";

function AllChannelPartnersPage() {
  return (
    <StandardEntityListPage
      title="Channel Partners"
      activeModule="Channel Partners"
      activeSubItem="All Channel Partners"
      viewLabel="All Channel Partner"
      itemLabel="Channel Partner"
      emptyTitle="Add your first Channel Partner"
      emptyDescription="Use our API or add your first Channel Partner manually"
      emptyActionLabel="Add a Channel Partner"
    />
  );
}

export default AllChannelPartnersPage;
