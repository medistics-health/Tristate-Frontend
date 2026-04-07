import { useEffect, useState } from "react";
import { getAgreementsView } from "../../../services/operations/agreements";
import AppLayout from "../../layout/AppLayout";
import AgreementsTanstackContent from "./AgreementsTanstackContent";
import type { AgreementsViewData } from "../types";

function AgreementsPage() {
  const [data, setData] = useState<AgreementsViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAgreementsView() {
      setIsLoading(true);

      try {
        const response = await getAgreementsView();

        if (isMounted) {
          setData(response);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAgreementsView();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppLayout
      title="Agreements"
      activeModule="Agreements"
      activeSubItem="All Agreements"
    >
      {isLoading || !data ? (
        <div className="flex h-full items-center justify-center rounded-2xl border border-[#ece8e1] bg-white text-[15px] text-slate-400">
          Loading agreements...
        </div>
      ) : (
        <AgreementsTanstackContent data={data} />
      )}
    </AppLayout>
  );
}

export default AgreementsPage;
