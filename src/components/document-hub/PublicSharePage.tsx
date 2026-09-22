import { Download, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  downloadPublicShare,
  getPublicShare,
} from "../../services/operations/documentHub";

function PublicSharePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<{
    title: string;
    description: string | null;
    mimeType: string;
    originalFilename: string;
    allowDownload: boolean;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This link is no longer available.");
      setLoading(false);
      return;
    }
    getPublicShare(token)
      .then(setDoc)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "This link is no longer available."),
      )
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDownload() {
    if (!token) return;
    try {
      setDownloading(true);
      const result = await downloadPublicShare(token);
      window.open(result.sasUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This link is no longer available.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fbfaf8] font-app-sans text-slate-700">
      <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-[#ece8e1] bg-white p-8 shadow-sm">
          {loading ? (
            <p className="text-center text-[14px] text-slate-400">Loading...</p>
          ) : error || !doc ? (
            <div className="text-center">
              <FolderOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <h1 className="text-[18px] font-semibold text-slate-800">
                This link is no longer available.
              </h1>
              <p className="mt-2 text-[14px] text-slate-500">
                It may have expired or been revoked.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <FolderOpen className="mx-auto mb-3 h-8 w-8 text-[#4f63ea]" />
              <h1 className="text-[20px] font-semibold text-slate-800">{doc.title}</h1>
              {doc.description ? (
                <p className="mt-2 text-[14px] text-slate-500">{doc.description}</p>
              ) : null}
              <p className="mt-3 text-[12px] text-slate-400">{doc.originalFilename}</p>
              {doc.allowDownload && (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="app-control mt-6 inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing..." : "Download"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default PublicSharePage;
