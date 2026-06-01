export interface LegalDocument {
  id: string;
  document_key: string;
  title: string;
  version: string;
  content_markdown: string;
  status: "draft" | "published" | "archived";
  published_at?: string | null;
  atualizado_em?: string | null;
}
