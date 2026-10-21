import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FormsLayout, Panel, RecipientPill } from "./chrome";
import { myForms } from "./api";
import type { RecipientStatus } from "./types";

type Row = { formId: string; title: string; status: RecipientStatus; practice: string; token: string };

export default function MyFormsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void myForms().then((forms) => {
      setRows(forms.map((form) => ({
        formId: form.formId,
        title: form.title,
        practice: form.practice,
        token: form.token,
        status: (form.status || "PENDING") as RecipientStatus,
      })));
    }).catch(() => setRows([]));
  }, []);

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
            {rows.map((row) => (
              <tr key={row.formId + row.token} className="border-t border-[#f3f0ea]">
                <td className="px-4 py-3 font-medium">{row.title}</td>
                <td className="px-4 py-3">{row.practice || "—"}</td>
                <td className="px-4 py-3"><RecipientPill status={row.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/f/${row.token}`} className="font-medium text-[#4f63ea]">
                    {row.status === "COMPLETED" ? "View" : "Open"}
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">No forms are assigned to you.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </FormsLayout>
  );
}
