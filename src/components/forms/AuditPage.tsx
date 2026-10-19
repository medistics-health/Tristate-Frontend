import { FormsLayout, Panel, formatWhen } from "./chrome";
import { useFormStore } from "./store";

export default function AuditPage() {
  const { audit } = useFormStore();
  return (
    <FormsLayout title="Form audit log" activeSubItem="Audit Log">
      <Panel className="overflow-hidden font-app-sans">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#fbfaf8] text-[12px] uppercase text-slate-400">
            <tr>
              {["When", "User", "Action", "Form", "Summary"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audit.map((entry) => (
              <tr key={entry.id} className="border-t border-[#f3f0ea]">
                <td className="px-4 py-3 text-slate-500">{formatWhen(entry.at)}</td>
                <td className="px-4 py-3">{entry.user}</td>
                <td className="px-4 py-3 font-medium">{entry.action}</td>
                <td className="px-4 py-3">{entry.formTitle}</td>
                <td className="px-4 py-3 text-slate-600">{entry.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </FormsLayout>
  );
}
