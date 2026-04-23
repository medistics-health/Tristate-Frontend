import {
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { DocusealForm } from "@docuseal/react";
import { getDocusealFormBySlug } from "../../services/operations/agreements";

type DocuSealDocument = {
  id: number;
  uuid: string;
  url: string;
  preview_image_url: string;
  filename: string;
};

type DocuSealFormData = {
  id: number;
  name: string;
  slug: string;
  documents: DocuSealDocument[];
  submitters: Array<{
    id: number;
    uuid: string;
    email: string;
    name: string;
    status: string;
    slug: string;
  }>;
};

export default function DocumentSigningPage() {
  const { slug } = useParams<{ slug: string }>();

  const [form, setForm] = useState<DocuSealFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmbeddedForm, setShowEmbeddedForm] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDocuSealForm = useCallback(async () => {
    if (!slug) {
      setError("Invalid signing link");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const submission = await getDocusealFormBySlug(slug);

      if (!submission.id) {
        throw new Error("Document not found");
      }

      setForm(submission as any);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDocuSealForm();
  }, [fetchDocuSealForm]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#4f63ea]" />
          <p className="mt-4 text-[14px] text-slate-500">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-[20px] font-semibold text-slate-700">
            Error Loading Document
          </h1>
          <p className="mt-2 text-[14px] text-slate-500">
            {error || "Document not found"}
          </p>
          <button
            onClick={fetchDocuSealForm}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#4f63ea] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#3d4ed1]"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const formUrl = `https://docuseal.com/d/${form.slug}`;
  const isCompleted = form.status === "completed";
  const isDeclined = form.status === "declined";

  if (showEmbeddedForm) {
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <header className="border-b border-[#e8e3db] bg-white px-6 py-4">
          <div className="mx-auto max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEmbeddedForm(false)}
                className="text-slate-500 hover:text-slate-700 text-[14px]"
              >
                ← Back to Documents
              </button>
            </div>
            {/*<a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#4f63ea] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#3d4ed1]"
            >
              <ExternalLink className="h-4 w-4" />
              Open in DocuSeal
            </a>*/}
          </div>
        </header>
        <main className="p-6">
          <div className="mx-auto max-w-4xl h-[calc(100vh-180px)]">
            <DocusealForm
              src={formUrl}
              onLoad={() => console.log("Form loaded")}
              onSubmitted={() => {
                console.log("Form submitted");
                fetchDocuSealForm();
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="border-b border-[#e8e3db] bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4f63ea]">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-slate-700">
                {form.name || "Document Signing"}
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[12px] ${isCompleted ? "text-green-600" : isDeclined ? "text-red-600" : "text-amber-600"}`}
                >
                  {isCompleted
                    ? "✓ Completed"
                    : isDeclined
                      ? "✗ Declined"
                      : "Pending Signature"}
                </span>
                {lastRefresh && (
                  <span className="text-[11px] text-slate-400">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchDocuSealForm}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e8e3db] bg-white px-4 py-2.5 text-[14px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {/*{!isCompleted && !isDeclined && (
              <button
                onClick={() => setShowEmbeddedForm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#4f63ea] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#3d4ed1]"
              >
                Sign Now
              </button>
            )}*/}
            {/*<a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[#e8e3db] bg-white px-5 py-2.5 text-[14px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
            >
              <ExternalLink className="h-4 w-4" />
              Open in DocuSeal
            </a>*/}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {isCompleted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-4 text-[20px] font-semibold text-green-700">
              Document Signed Successfully!
            </h2>
            <p className="mt-2 text-[14px] text-green-600">
              Thank you for signing. You will receive a confirmation email
              shortly.
            </p>
            <p className="mt-4 text-[13px] text-slate-500">
              You can close this page or refresh to check the status.
            </p>
          </div>
        ) : isDeclined ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
            <h2 className="mt-4 text-[20px] font-semibold text-red-700">
              Document Declined
            </h2>
            <p className="mt-2 text-[14px] text-red-600">
              This document signing request was declined.
            </p>
          </div>
        ) : form.documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-[18px] font-semibold text-slate-700">
              No Documents
            </h2>
            <p className="mt-2 text-[14px] text-slate-500">
              This form has no documents attached.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-[16px] font-medium text-slate-700">
              Documents to Sign
            </h2>

            {form.documents.map((doc) => (
              <div
                key={doc.id}
                className="overflow-hidden rounded-xl border border-[#e8e3db] bg-white shadow-sm"
              >
                <div className="border-b border-[#f0ece6] bg-[#faf9f7] px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="text-[14px] font-medium text-slate-700">
                        {doc.filename}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowEmbeddedForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3d4ed1]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Sign
                    </button>
                  </div>
                </div>

                <div className="aspect-[3/4] w-full bg-slate-100">
                  {doc.preview_image_url ? (
                    <img
                      src={doc.preview_image_url}
                      alt={doc.filename}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <FileText className="mx-auto h-12 w-12 text-slate-300" />
                        <p className="mt-2 text-[13px] text-slate-400">
                          Preview not available
                        </p>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-[13px] text-[#4f63ea] hover:underline"
                        >
                          View PDF
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isCompleted && !isDeclined && (
          <div className="mt-10 rounded-xl border border-[#e8e3db] bg-white p-6">
            <h3 className="text-[15px] font-medium text-slate-700">
              How to Sign
            </h3>
            <ol className="mt-4 space-y-3 text-[13px] text-slate-500">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#4f63ea] text-[11px] font-medium text-white">
                  1
                </span>
                Click the "Sign" button
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#4f63ea] text-[11px] font-medium text-white">
                  2
                </span>
                Fill in your details and sign the document
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#4f63ea] text-[11px] font-medium text-white">
                  3
                </span>
                Once signed, you will see the confirmation message
              </li>
            </ol>

            <div className="mt-6 flex items-center gap-2 rounded-lg bg-green-50 p-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-[13px] text-green-700">
                Your signature is legally binding and secure
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
