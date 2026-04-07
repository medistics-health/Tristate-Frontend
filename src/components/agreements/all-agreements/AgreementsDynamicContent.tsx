import AgreementsFilterPanel from "./AgreementsFilterPanel";
import AgreementsTable from "./AgreementsTable";
import type { AgreementsViewData } from "../types";

type AgreementsDynamicContentProps = {
  data: AgreementsViewData;
};

function AgreementsDynamicContent({ data }: AgreementsDynamicContentProps) {
  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <AgreementsTable
        title={data.title}
        totalCount={data.totalCount}
        fields={data.fields}
        rows={data.rows}
      />
      <AgreementsFilterPanel fields={data.fields} />
    </div>
  );
}

export default AgreementsDynamicContent;
