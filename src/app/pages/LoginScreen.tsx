import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, Phone } from "lucide-react";
import { useApp } from "../context/AppContext";

export function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = () => {
    login();
    navigate(-1);
  };

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ background: "#f8fafc" }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-12 md:pt-5 pb-6"
        style={{
          background:
            "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: "180px",
              height: "76px",
            }}
          >
            <img
              src="https://wfmxfnwbmzetzygoanjh.supabase.co/storage/v1/object/public/ALI%20Digital/ALI%20Agenda/ChatGPT%20Image%2015%20abr%202026,%2008_39_58.png"
              alt="Logo FrescaMart"
              className="h-full w-full object-contain"
            />
          </div>

          <div>
            <p
              style={{
                fontSize: "12px",
                color: "#c7d7ee",
              }}
            >
              {mode === "login"
                ? "Bem-vindo de volta!"
                : "Crie sua conta"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 -mt-4 flex flex-shrink-0 overflow-hidden rounded-2xl bg-white shadow-lg">
        <button
          onClick={() => setMode("login")}
          className="flex-1 py-3 transition-all"
          style={{
            backgroundColor:
              mode === "login" ? "#122a4c" : "white",
            color: mode === "login" ? "white" : "#64748b",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          Entrar
        </button>
        <button
          onClick={() => setMode("signup")}
          className="flex-1 py-3 transition-all"
          style={{
            backgroundColor:
              mode === "signup" ? "#122a4c" : "white",
            color: mode === "signup" ? "white" : "#64748b",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          Criar conta
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6">
        <div className="flex flex-col gap-4">
          {mode === "signup" && (
            <div
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
              style={{ border: "1px solid #d9e4f2" }}
            >
              <span style={{ fontSize: "18px" }}>👤</span>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
                style={{
                  fontSize: "14px",
                  color: "#334155",
                }}
              />
            </div>
          )}

          <div
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
            style={{ border: "1px solid #d9e4f2" }}
          >
            <Mail size={18} color="#122a4c" />
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
              style={{
                fontSize: "14px",
                color: "#334155",
              }}
            />
          </div>

          {mode === "signup" && (
            <div
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
              style={{ border: "1px solid #d9e4f2" }}
            >
              <Phone size={18} color="#122a4c" />
              <input
                type="tel"
                placeholder="Seu telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
                style={{
                  fontSize: "14px",
                  color: "#334155",
                }}
              />
            </div>
          )}

          <div
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
            style={{ border: "1px solid #d9e4f2" }}
          >
            <Lock size={18} color="#122a4c" />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
              style={{
                fontSize: "14px",
                color: "#334155",
              }}
            />
            <button onClick={() => setShowPass(!showPass)}>
              {showPass ? (
                <EyeOff size={18} color="#64748b" />
              ) : (
                <Eye size={18} color="#64748b" />
              )}
            </button>
          </div>

          {mode === "login" && (
            <button
              className="text-right"
              style={{
                fontSize: "13px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Esqueceu sua senha?
            </button>
          )}

          <button
            onClick={handleSubmit}
            className="rounded-2xl py-4 text-white transition-all active:scale-[0.98]"
            style={{
              backgroundColor: "#122a4c",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            {mode === "login"
              ? "Entrar na conta"
              : "Criar minha conta"}
          </button>

          <div className="my-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span
              style={{
                fontSize: "12px",
                color: "#94a3b8",
              }}
            >
              ou entre com
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            className="flex items-center justify-center gap-3 rounded-2xl bg-white py-3.5 shadow-sm transition-all active:scale-[0.98]"
            style={{ border: "1px solid #d9e4f2" }}
          >
            <span style={{ fontSize: "20px" }}>📱</span>
            <span
              style={{
                fontSize: "14px",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              Continuar com Google
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}