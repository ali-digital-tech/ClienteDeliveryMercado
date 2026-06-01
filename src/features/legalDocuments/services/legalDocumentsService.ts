import { apiRequest } from "@/shared/lib/api";
import type { LegalDocument } from "../types/legalDocument";

export async function fetchPublishedLegalDocument(documentKey = "privacy-policy") {
  const response = await apiRequest<{ data: LegalDocument }>(`/legal-documents/public/${documentKey}`);
  return response.data;
}

export async function acceptLegalDocument(documentKey: string, documentId: string) {
  const response = await apiRequest<{ data: unknown }>(`/legal-documents/${documentKey}/accept`, {
    method: "POST",
    body: {
      accepted: true,
      document_id: documentId,
    } as any,
  });

  return response.data;
}
