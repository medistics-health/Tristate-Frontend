import { Link } from "react-router-dom";
import { FormsLayout, Panel, RecipientPill } from "./chrome";
import { useFormStore } from "./store";

export default function MyFormsPage() {
  const { forms } = useFormStore();
  const assigned = forms.flatMap((form) =>
    form.recipients
      .filter((recipient) => recipient.status !== "REMOVED" && recipient.status !== "BOUNCED")
      .slice(0, 1)
      .map((recipient) => ({ form, recipient })),
  );

  return (
    <FormsLayout title="My forms" activeSubItem="My Forms">
      <Panel className="overflow-hidden font-app-sans">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#fbfaf8] text-[12px] uppercase text-slate-400">
            <tr>
              {["Form", "Practice", "Status", ""].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assigned.map(({ form, recipient }) => (
              <tr key={form.id} className="border-t border-[#f3f0ea]">
                <td className="px-4 py-3 font-medium">{form.title}</td>
                <td className="px-4 py-3">{recipient.practice || "—"}</td>
                <td className="px-4 py-3"><RecipientPill status={recipient.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/f/${recipient.token}`} className="font-medium text-[#4f63ea]">
                    {recipient.status === "COMPLETED" ? "View" : "Open"}
                  </Link>
                </td>
              </tr>
            ))}
            {assigned.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">No forms are assigned to you.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </FormsLayout>
  );
}
