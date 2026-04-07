import type { AgreementsViewData } from "../../components/agreements/types";

const agreementsViewMock: AgreementsViewData = {
  viewId: "5b2b90da-f741-47fe-8672-df3ec8359c2a",
  title: "All Agreements",
  totalCount: 3,
  fields: [
    { id: "name", label: "Name", type: "text", visible: true },
    {
      id: "creationDate",
      label: "Creation date",
      type: "date",
      visible: true,
    },
    {
      id: "lastUpdate",
      label: "Last update",
      type: "date",
      visible: true,
    },
    { id: "updatedBy", label: "Updated by", type: "user", visible: true },
    { id: "createdBy", label: "Created by", type: "user", visible: true },
    { id: "deletedAt", label: "Deleted at", type: "date", visible: false },
    {
      id: "effectiveDate",
      label: "Effective Date",
      type: "date",
      visible: false,
    },
    { id: "id", label: "Id", type: "text", visible: false },
    { id: "practice", label: "Practice", type: "relation", visible: false },
    {
      id: "renewalDate",
      label: "Renewal Date",
      type: "date",
      visible: false,
    },
    { id: "status", label: "Status", type: "text", visible: false },
    {
      id: "terminationDate",
      label: "Termination Date",
      type: "date",
      visible: false,
    },
    { id: "type", label: "Type", type: "text", visible: false },
    { id: "value", label: "Value", type: "text", visible: false },
  ],
  rows: [
    {
      id: "agreement-1",
      values: {
        id: "AGR-001",
        name: "TriState Radiology Services",
        creationDate: "Mar 23, 2026 6:47 PM",
        lastUpdate: "Apr 01, 2026 10:12 AM",
        updatedBy: {
          name: "Siddhi Gajjar",
          initials: "SG",
        },
        createdBy: {
          name: "Riya Shah",
          initials: "RS",
        },
        deletedAt: null,
        effectiveDate: "Apr 15, 2026",
        practice: "TriState Imaging",
        renewalDate: "Apr 15, 2027",
        status: "Active",
        terminationDate: "Apr 14, 2028",
        type: "MSA",
        value: "$128,000",
      },
    },
    {
      id: "agreement-2",
      values: {
        id: "AGR-002",
        name: "Hudson Valley Teleradiology",
        creationDate: "Feb 11, 2026 2:05 PM",
        lastUpdate: "Mar 30, 2026 4:25 PM",
        updatedBy: {
          name: "Nikhil Patel",
          initials: "NP",
        },
        createdBy: {
          name: "Siddhi Gajjar",
          initials: "SG",
        },
        deletedAt: null,
        effectiveDate: "May 01, 2026",
        practice: "Hudson Valley Partners",
        renewalDate: "May 01, 2027",
        status: "Pending Signature",
        terminationDate: "Apr 30, 2028",
        type: "NDA",
        value: "$42,500",
      },
    },
    {
      id: "agreement-3",
      values: {
        id: "AGR-003",
        name: "Empire Diagnostics Network",
        creationDate: "Jan 19, 2026 9:18 AM",
        lastUpdate: "Apr 05, 2026 1:40 PM",
        updatedBy: {
          name: "Aarav Mehta",
          initials: "AM",
        },
        createdBy: {
          name: "Nikhil Patel",
          initials: "NP",
        },
        deletedAt: "Apr 06, 2026 9:00 AM",
        effectiveDate: "Jan 20, 2026",
        practice: "Empire Diagnostics",
        renewalDate: "Jan 20, 2027",
        status: "Archived",
        terminationDate: "Jan 19, 2028",
        type: "BAA",
        value: "$76,900",
      },
    },
  ],
};

export async function getAgreementsView() {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return agreementsViewMock;
}
