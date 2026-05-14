import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, Phone } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { authService } from '@/features/auth';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, currentMarket, login, marketId, products } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }

    setLoading(true);

    try {
      const storeId = currentMarket.id || marketId;

      if (mode === "signup") {
        await authService.registerCustomer({
          nome: name.trim(),
          email: email.trim(),
          telefone: phone.trim() || undefined,
          senha: password,
          loja_id: storeId,
        });
      }

      await login({ email: email.trim(), password, loja_id: storeId });

      const navigationState = location.state as {
        redirectTo?: string;
        pendingCartProductId?: string;
      } | null;
      const pendingProduct = navigationState?.pendingCartProductId
        ? products.find(product => product.id === navigationState.pendingCartProductId)
        : null;

      if (pendingProduct) {
        await addToCart(pendingProduct);
      }

      if (navigationState?.redirectTo) {
        navigate(navigationState.redirectTo, { replace: true });
      } else {
        navigate(-1);
      }
    } catch (error: any) {
      setError(error?.message || "Não foi possível autenticar. Verifique seus dados.");
    } finally {
      setLoading(false);
    }
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <button type="button" onClick={() => setShowPass(!showPass)}>
              {showPass ? (
                <EyeOff size={18} color="#64748b" />
              ) : (
                <Eye size={18} color="#64748b" />
              )}
            </button>
          </div>

          {mode === "login" && (
            <button
              type="button"
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

          {error && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl py-4 text-white transition-all active:scale-[0.98]"
            style={{
              backgroundColor: "#122a4c",
              fontSize: "15px",
              fontWeight: 700,
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar na conta"
                : "Criar minha conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
