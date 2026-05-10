import { useNavigate } from "react-router";
import {
  ChevronLeft,
  HelpCircle,
  Mail,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "Como cancelar um pedido?",
    a: "Você pode cancelar um pedido em até 5 minutos após a confirmação. Acesse Meus Pedidos, selecione o pedido e toque em Cancelar.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "O prazo padrão é de 30 a 60 minutos, dependendo da sua localização e da disponibilidade dos entregadores.",
  },
  {
    q: "Como solicitar reembolso?",
    a: "Reembolsos são processados em até 5 dias úteis. Entre em contato com nosso suporte informando o número do pedido.",
  },
  {
    q: "Posso mudar meu endereço de entrega?",
    a: "Sim, mas apenas antes de o pedido ser aceito pelo estabelecimento. Após essa etapa, não é possível alterar.",
  },
  {
    q: "O app aceita vale-refeição?",
    a: "Sim! Aceitamos VR, VA, Sodexo e Ticket. Adicione seu cartão na seção Métodos de Pagamento.",
  },
];

// Número do WhatsApp (substitua pelo número real)
const WHATSAPP_NUMBER = "5511999990000";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Olá! Preciso de ajuda com o app FrescaMart. 🛒"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

// Ícone do WhatsApp em SVG
function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SupportScreen() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
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
          <HelpCircle size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: "18px", fontWeight: 800 }}>
            Suporte
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Status */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
        >
          <CheckCircle size={20} color="#16a34a" className="flex-shrink-0" />
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#15803d" }}>
              Atendimento disponível
            </p>
            <p style={{ fontSize: "12px", color: "#166534" }}>
              Tempo médio de resposta: 5 minutos
            </p>
          </div>
        </div>

        {/* WhatsApp destaque */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl p-4 transition-all active:opacity-80"
          style={{
            background: "linear-gradient(135deg, #25d366 0%, #128c5e 100%)",
            boxShadow: "0 4px 14px rgba(37,211,102,0.35)",
          }}
        >
          <div
            className="rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ width: "48px", height: "48px", backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <WhatsAppIcon size={26} />
          </div>
          <div className="flex-1">
            <p className="text-white" style={{ fontSize: "15px", fontWeight: 800 }}>
              Falar no WhatsApp
            </p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>
              Atendimento rápido e direto
            </p>
          </div>
          <ExternalLink size={18} color="rgba(255,255,255,0.8)" />
        </a>

        {/* Outros canais */}
        <div>
          <p
            className="mb-2 px-1"
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Outros canais
          </p>
          <div
            className="rounded-2xl bg-white shadow-sm overflow-hidden"
            style={{ border: "1px solid #d9e4f2" }}
          >
            {/* E-mail */}
            <a
              href="mailto:suporte@frescamart.com.br"
              className="flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50"
            >
              <div
                className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}
              >
                <Mail size={18} color="#122a4c" />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                  Enviar e-mail
                </p>
                <p style={{ fontSize: "12px", color: "#64748b" }}>
                  suporte@frescamart.com.br
                </p>
              </div>
              <ExternalLink size={16} color="#94a3b8" />
            </a>
          </div>
        </div>

        {/* Horário */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: "#eef4fb", border: "1px solid #d9e4f2" }}
        >
          <Clock size={16} color="#122a4c" className="flex-shrink-0 mt-0.5" />
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
              Horário de atendimento
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.7 }}>
              WhatsApp e telefone: Segunda a sábado, 7h às 22h{"\n"}
              E-mail: Respondemos em até 24h úteis
            </p>
          </div>
        </div>

        {/* Perguntas frequentes */}
        <div>
          <p
            className="mb-2 px-1"
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Perguntas frequentes
          </p>

          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-2.5 mb-3 bg-white"
            style={{ border: "1px solid #d9e4f2" }}
          >
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Buscar dúvida..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: "14px", color: "#334155" }}
            />
          </div>

          <div
            className="rounded-2xl bg-white shadow-sm overflow-hidden"
            style={{ border: "1px solid #d9e4f2" }}
          >
            {filteredFaqs.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <AlertCircle size={24} color="#cbd5e1" />
                <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                  Nenhuma dúvida encontrada
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq, i) => (
                <div
                  key={i}
                  style={{
                    borderBottom:
                      i < filteredFaqs.length - 1 ? "1px solid #eef2f7" : "none",
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50 text-left"
                  >
                    <div
                      className="rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ width: "32px", height: "32px", backgroundColor: "#eef4fb" }}
                    >
                      <HelpCircle size={15} color="#122a4c" />
                    </div>
                    <span
                      className="flex-1"
                      style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}
                    >
                      {faq.q}
                    </span>
                    <ChevronRight
                      size={16}
                      color="#94a3b8"
                      style={{
                        transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 -mt-1">
                      <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pb-4" />
      </div>
    </div>
  );
}