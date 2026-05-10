import { useNavigate } from "react-router";
import {
  ChevronLeft,
  Shield,
  Eye,
  Key,
  AlertTriangle,
  ChevronRight,
  Check,
} from "lucide-react";
import { useState } from "react";

export function PrivacyScreen() {
  const navigate = useNavigate();

  const [dadosAnalise, setDadosAnalise] = useState(true);

  const Toggle = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0 transition-all"
      style={{
        width: "46px",
        height: "26px",
        borderRadius: "13px",
        backgroundColor: value ? "#122a4c" : "#cbd5e1",
      }}
    >
      <span
        className="absolute top-1 transition-all"
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          backgroundColor: "white",
          left: value ? "24px" : "4px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-12 md:pt-5 pb-5 flex items-center gap-3"
        style={{ background: "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
        >
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: "18px", fontWeight: 800 }}>
            Privacidade e segurança
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Privacidade de dados */}
        <div>
          <p className="mb-2 px-1" style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Privacidade de dados
          </p>
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden" style={{ border: "1px solid #d9e4f2" }}>
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid #eef2f7" }}>
              <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}>
                <Eye size={18} color="#122a4c" />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Análise de uso</p>
                <p style={{ fontSize: "12px", color: "#64748b" }}>Compartilhar dados para melhorias</p>
              </div>
              <Toggle value={dadosAnalise} onChange={setDadosAnalise} />
            </div>

            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50"
              style={{ borderBottom: "1px solid #eef2f7" }}
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}>
                <AlertTriangle size={18} color="#122a4c" />
              </div>
              <span className="flex-1 text-left" style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                Gerenciar permissões
              </span>
              <ChevronRight size={16} color="#94a3b8" />
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50">
              <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}>
                <Shield size={18} color="#122a4c" />
              </div>
              <span className="flex-1 text-left" style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                Política de privacidade
              </span>
              <ChevronRight size={16} color="#94a3b8" />
            </button>
          </div>
        </div>

        {/* Alterar senha */}
        <div>
          <p className="mb-2 px-1" style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Credenciais
          </p>
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden" style={{ border: "1px solid #d9e4f2" }}>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50" style={{ borderBottom: "1px solid #eef2f7" }}>
              <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}>
                <Key size={18} color="#122a4c" />
              </div>
              <span className="flex-1 text-left" style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                Alterar senha
              </span>
              <ChevronRight size={16} color="#94a3b8" />
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50">
              <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: "38px", height: "38px", backgroundColor: "#fff0f0" }}>
                <AlertTriangle size={18} color="#dc2626" />
              </div>
              <span className="flex-1 text-left" style={{ fontSize: "14px", fontWeight: 600, color: "#dc2626" }}>
                Excluir minha conta
              </span>
              <ChevronRight size={16} color="#94a3b8" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: "#eef4fb", border: "1px solid #d9e4f2" }}
        >
          <Check size={16} color="#122a4c" className="flex-shrink-0 mt-0.5" />
          <p style={{ fontSize: "12px", color: "#334155", lineHeight: 1.5 }}>
            Seus dados são criptografados e protegidos de acordo com a{" "}
            <span style={{ fontWeight: 700 }}>LGPD</span> (Lei Geral de Proteção de Dados).
          </p>
        </div>

        <div className="pb-4" />
      </div>
    </div>
  );
}