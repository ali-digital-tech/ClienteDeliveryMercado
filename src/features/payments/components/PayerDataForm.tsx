import { useEffect, useState } from "react";
import { CheckCircle2, IdCard, Mail, Save, UserRound } from "lucide-react";
import {
  getPayerFullName,
  normalizePayerData,
  onlyDigits,
  splitPayerFullName,
  validatePayerData,
  type PayerData,
} from "../services/paymentService";

type PayerDataFormProps = {
  value: PayerData;
  onChange: (value: PayerData) => void;
  primaryColor?: string;
  title?: string;
  description?: string;
  showSaveButton?: boolean;
  saveLabel?: string;
  onSave?: () => void;
  isSaving?: boolean;
};

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function formatDocument(value: string, docType: PayerData["doc_type"]) {
  return docType === "CNPJ" ? formatCnpj(value) : formatCpf(value);
}

export function PayerDataForm({
  value,
  onChange,
  primaryColor = "var(--market-primary-color)",
  title = "Dados para pagamento",
  description = "Necessário para processar Pix e cartão.",
  showSaveButton = false,
  saveLabel = "Salvar dados",
  onSave,
  isSaving = false,
}: PayerDataFormProps) {
  const [fullName, setFullName] = useState(() => getPayerFullName(value));
  const [isFullNameFocused, setIsFullNameFocused] = useState(false);
  const normalized = normalizePayerData(value);
  const validation = validatePayerData(normalized);
  const completedFields = [
    !validation.errors.full_name,
    !validation.errors.payer_email,
    !validation.errors.doc_number,
  ].filter(Boolean).length;
  const softColor = `color-mix(in srgb, ${primaryColor} 10%, white)`;
  const documentLabel = normalized.doc_type;

  useEffect(() => {
    if (!isFullNameFocused) {
      setFullName(getPayerFullName(value));
    }
  }, [isFullNameFocused, value.payer_first_name, value.payer_last_name]);

  const update = (next: Partial<PayerData>) => {
    onChange(normalizePayerData({ ...normalized, ...next }));
  };

  const updateFullName = (fullName: string) => {
    setFullName(fullName);
    const parts = splitPayerFullName(fullName);
    onChange({
      ...normalized,
      payer_first_name: parts.firstName,
      payer_last_name: parts.lastName,
    });
  };

  const inputStyle = {
    borderColor: "var(--market-primary-border-color)",
    color: "#334155",
    fontSize: "14px",
  };

  const labelStyle = {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid var(--market-primary-border-color)" }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: validation.isValid ? "#f0fdf4" : softColor }}
          >
            {validation.isValid ? (
              <CheckCircle2 size={21} color="#15803d" />
            ) : (
              <UserRound size={21} color={primaryColor} />
            )}
          </div>
          <div className="min-w-0">
            <h2 style={{ color: "var(--market-primary-color)", fontSize: "15px", fontWeight: 900 }}>{title}</h2>
            <p style={{ color: "#64748b", fontSize: "12px", lineHeight: 1.4 }}>{description}</p>
          </div>
        </div>

        <span
          className="flex-shrink-0 rounded-full px-2.5 py-1"
          style={{
            backgroundColor: validation.isValid ? "#f0fdf4" : "#fffbeb",
            color: validation.isValid ? "#15803d" : "#92400e",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          {completedFields}/3
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="mb-1.5 block" style={labelStyle}>Nome completo</label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} color="#64748b" />
            <input
              className="w-full rounded-xl border py-3 pl-10 pr-3 outline-none"
              style={inputStyle}
              placeholder="Nome e sobrenome"
              autoComplete="name"
              value={fullName}
              onFocus={() => setIsFullNameFocused(true)}
              onBlur={() => setIsFullNameFocused(false)}
              onChange={(event) => updateFullName(event.target.value)}
            />
          </div>
          {validation.errors.full_name && (
            <p className="mt-1" style={{ color: "#b91c1c", fontSize: "11px", fontWeight: 700 }}>
              {validation.errors.full_name}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block" style={labelStyle}>E-mail</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} color="#64748b" />
            <input
              className="w-full rounded-xl border py-3 pl-10 pr-3 outline-none"
              style={inputStyle}
              placeholder="email@exemplo.com"
              autoComplete="email"
              inputMode="email"
              value={normalized.payer_email}
              onChange={(event) => update({ payer_email: event.target.value })}
            />
          </div>
          {validation.errors.payer_email && (
            <p className="mt-1" style={{ color: "#b91c1c", fontSize: "11px", fontWeight: 700 }}>
              {validation.errors.payer_email}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block" style={labelStyle}>Documento</label>
          <div className="grid grid-cols-[104px_1fr] gap-2">
            <div className="grid grid-cols-2 rounded-xl border p-1" style={{ borderColor: "var(--market-primary-border-color)" }}>
              {(["CPF", "CNPJ"] as const).map((docType) => (
                <button
                  key={docType}
                  type="button"
                  onClick={() => update({
                    doc_type: docType,
                    doc_number: onlyDigits(normalized.doc_number).slice(0, docType === "CPF" ? 11 : 14),
                  })}
                  className="rounded-lg px-2 py-2"
                  style={{
                    backgroundColor: normalized.doc_type === docType ? primaryColor : "transparent",
                    color: normalized.doc_type === docType ? "#fff" : "#64748b",
                    fontSize: "12px",
                    fontWeight: 900,
                  }}
                >
                  {docType}
                </button>
              ))}
            </div>

            <div className="relative">
              <IdCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} color="#64748b" />
              <input
                className="w-full rounded-xl border py-3 pl-10 pr-3 outline-none"
                style={inputStyle}
                placeholder={documentLabel}
                inputMode="numeric"
                autoComplete="off"
                value={formatDocument(normalized.doc_number, normalized.doc_type)}
                onChange={(event) => update({
                  doc_number: onlyDigits(event.target.value).slice(0, normalized.doc_type === "CPF" ? 11 : 14),
                })}
              />
            </div>
          </div>
          {validation.errors.doc_number && (
            <p className="mt-1" style={{ color: "#b91c1c", fontSize: "11px", fontWeight: 700 }}>
              {validation.errors.doc_number}
            </p>
          )}
        </div>
      </div>

      {showSaveButton && (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !validation.isValid}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-white disabled:opacity-60"
          style={{ backgroundColor: primaryColor, fontSize: "13px", fontWeight: 900 }}
        >
          <Save size={16} />
          {isSaving ? "Salvando..." : saveLabel}
        </button>
      )}
    </div>
  );
}
