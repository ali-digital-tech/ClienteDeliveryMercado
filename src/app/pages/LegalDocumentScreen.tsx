import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, FileText } from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";
import { fetchPublishedLegalDocument, type LegalDocument } from "@/features/legalDocuments";

const DOCUMENT_CONFIG = {
  policy: {
    documentKey: "privacy-policy",
    title: "Termos de Uso e Política de Privacidade",
    unpublishedMessage: "Os Termos de Uso e a Política de Privacidade ainda não foram publicados.",
  },
  terms: {
    documentKey: "privacy-policy",
    title: "Termos de Uso e Política de Privacidade",
    unpublishedMessage: "Os Termos de Uso e a Política de Privacidade ainda não foram publicados.",
  },
} as const;

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const elements: JSX.Element[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      index -= 1;

      const rows = tableLines
        .filter((tableLine) => !/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(tableLine))
        .map((tableLine) => tableLine.split("|").slice(1, -1).map((cell) => cell.trim()));
      const [header, ...body] = rows;

      elements.push(
        <div key={`table-${index}`} className="my-4 overflow-x-auto rounded-xl border border-[var(--market-primary-border-color)]">
          <table className="min-w-full text-left text-xs">
            {header && (
              <thead className="bg-[var(--market-primary-soft-color)] text-[var(--market-primary-color)]">
                <tr>{header.map((cell, cellIndex) => <th key={cellIndex} className="px-3 py-2 font-bold">{cell}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-[#eef2f7]">
                  {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 align-top text-[#334155]">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={index} className="mt-5 text-base font-extrabold text-[var(--market-primary-color)]">{trimmed.replace(/^###\s+/, "")}</h3>);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(<h2 key={index} className="mt-6 text-lg font-extrabold text-[var(--market-primary-color)]">{trimmed.replace(/^##\s+/, "")}</h2>);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(<h1 key={index} className="text-xl font-extrabold text-[#0f172a]">{trimmed.replace(/^#\s+/, "")}</h1>);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      elements.push(
        <p key={index} className="pl-3 text-sm leading-6 text-[#334155]">
          <span className="mr-2">•</span>
          {trimmed.replace(/^[-*]\s+/, "")}
        </p>
      );
      continue;
    }

    elements.push(<p key={index} className="text-sm leading-6 text-[#334155]">{trimmed}</p>);
  }

  return <div className="space-y-2">{elements}</div>;
}

export function LegalDocumentScreen() {
  const navigate = useNavigate();
  const { documentSlug } = useParams();
  const { currentMarket } = useApp();
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const primaryColor = currentMarket.primaryColor || "var(--market-primary-color)";
  const documentConfig = documentSlug === "terms" ? DOCUMENT_CONFIG.terms : DOCUMENT_CONFIG.policy;

  useEffect(() => {
    let isActive = true;
    setLoading(true);

    fetchPublishedLegalDocument(documentConfig.documentKey)
      .then((publishedDocument) => {
        if (!isActive) return;
        setDocument(publishedDocument);
        setError("");
      })
      .catch(() => {
        if (!isActive) return;
        setDocument(null);
        setError(documentConfig.unpublishedMessage);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [documentConfig.documentKey, documentConfig.unpublishedMessage]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 flex items-center gap-3"
        style={{ background: `linear-gradient(160deg, ${primaryColor} 0%, var(--market-primary-color) 100%)` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
        >
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex items-center gap-2">
          <FileText size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: "18px", fontWeight: 800 }}>
            {documentConfig.title}
          </h1>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid var(--market-primary-border-color)" }}>
          {loading ? (
            <p className="text-sm text-slate-500">Carregando documento...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : document ? (
            <>
              <div className="mb-4 rounded-xl p-3" style={{ backgroundColor: "var(--market-primary-soft-color)" }}>
                <p className="text-sm font-bold" style={{ color: primaryColor }}>{document.title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Versão {document.version}
                  {document.published_at ? ` · Publicada em ${formatDate(document.published_at)}` : ""}
                </p>
              </div>
              <MarkdownBlock content={document.content_markdown} />
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
