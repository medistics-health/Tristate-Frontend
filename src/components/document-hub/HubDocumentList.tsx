import { Download, FileText } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { downloadHubDocument } from "../../services/operations/documentHub";
import type { HubLinkedDocument } from "./types";

export function HubDocumentList({ documents }: { documents: HubLinkedDocument[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(id: string) {
    try {
      setDownloadingId(id);
      const result = await downloadHubDocument(id);
      window.open(result.sasUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to download document.");
    } finally {
      setDownloadingId(null);
    }
  }

  if (!documents.length) {
    return (
      <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
        No Document Hub files linked yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <div
          key={document.id}
          className="flex items-start justify-between gap-3 rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4"
        >
          <div className="min-w-0 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold break-words text-slate-900">{document.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {document.originalFilename} · v{document.version}
                {document.categories.length
                  ? ` · ${document.categories.map((item) => item.name).join(", ")}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDownload(document.id)}
            disabled={downloadingId === document.id}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#4f63ea] hover:underline disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {downloadingId === document.id ? "..." : "Download"}
          </button>
        </div>
      ))}
    </div>
  );
}
