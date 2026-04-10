import StandardEntityListPage from "../shared/StandardEntityListPage";

function ContactsPage() {
  return (
    <StandardEntityListPage
      title="Contacts"
      activeModule="Contacts"
      activeSubItem="All Contacts"
      viewLabel="All Contacts"
      itemLabel="Contact"
      emptyTitle="Add your first Contact"
      emptyDescription="Use our API or add your first Contact manually"
      emptyActionLabel="Add a Contact"
    />
  );
}

export default ContactsPage;
