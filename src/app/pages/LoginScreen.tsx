import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Phone } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { authService } from '@/features/auth';
import { getProductById } from '@/features/products';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addToCart, currentMarket, login, marketId } = useApp();
  const recoveryParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const resetAccessToken = searchParams.get("access_token") || recoveryParams.get("access_token") || "";
  const resetRefreshToken = searchParams.get("refresh_token") || recoveryParams.get("refresh_token") || undefined;
  const [logoFailed, setLogoFailed] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(resetAccessToken ? "reset" : "login");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const showMarketLogo = Boolean(currentMarket.logo && !logoFailed);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const storeId = currentMarket.id || marketId;

    if (mode === "forgot") {
      if (!email.trim()) {
        showSystemNotice("Informe seu e-mail.");
        return;
      }

      setLoading(true);

      try {
        const response = await authService.forgotPassword(email.trim(), storeId);
        showSystemNotice(response.message || "Verifique seu e-mail para redefinir a senha.");
      } catch (error: any) {
        showSystemNotice(error?.message || "Não foi possível iniciar a recuperação.");
      } finally {
        setLoading(false);
      }

      return;
    }

    if (mode === "reset") {
      if (!resetAccessToken) {
        showSystemNotice("Link de recuperação inválido.");
        return;
      }

      if (password.length < 6) {
        showSystemNotice("A senha deve ter pelo menos 6 caracteres.");
        return;
      }

      if (password !== confirmPassword) {
        showSystemNotice("As senhas não conferem.");
        return;
      }

      setLoading(true);

      try {
        await authService.resetPassword(resetAccessToken, resetRefreshToken, password);
        showSystemNotice("Senha redefinida com sucesso. Entre com sua nova senha.");
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        navigate(`/mercado/${storeId}/login`, { replace: true });
      } catch (error: any) {
        showSystemNotice(error?.message || "Não foi possível redefinir a senha.");
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!email.trim() || !password) {
      showSystemNotice("Preencha e-mail e senha.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      showSystemNotice("Informe seu nome completo.");
      return;
    }

    setLoading(true);

    try {
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
        ? await getProductById(marketId, navigationState.pendingCartProductId)
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
      showSystemNotice(error || "Não foi possível autenticar. Verifique seus dados.");
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
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-4"
        style={{
          background:
            "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center overflow-hidden rounded-xl"
            style={{
              width: "72px",
              height: "56px",
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          >
            {showMarketLogo ? (
              <img
                src={currentMarket.logo}
                alt={currentMarket.name}
                className="h-full w-full object-cover"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span style={{ fontSize: "28px" }}>🛒</span>
            )}
          </div>

          <div className="min-w-0">
            <p
              className="truncate text-white"
              style={{
                fontSize: "16px",
                fontWeight: 800,
              }}
            >
              {currentMarket.name}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "#c7d7ee",
              }}
            >
              {mode === "login"
                ? "Bem-vindo de volta!"
                : mode === "signup"
                  ? "Crie sua conta"
                  : mode === "forgot"
                    ? "Recupere sua senha"
                    : "Defina sua nova senha"}
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
          disabled={mode === "reset"}
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
          {mode === "forgot" && (
            <p className="text-sm text-gray-600">
              Informe o e-mail cadastrado para receber as instruções de recuperação.
            </p>
          )}

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

          {mode !== "reset" && (
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
          )}

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

          {mode !== "forgot" && (
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
          )}

          {mode === "reset" && (
            <div
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
              style={{ border: "1px solid #d9e4f2" }}
            >
              <Lock size={18} color="#122a4c" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
                style={{
                  fontSize: "14px",
                  color: "#334155",
                }}
              />
            </div>
          )}

          {mode === "login" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
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
                : mode === "signup"
                  ? "Criar minha conta"
                  : mode === "forgot"
                    ? "Enviar instruções"
                    : "Redefinir senha"}
          </button>

          {(mode === "forgot" || mode === "reset") && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                navigate(`/mercado/${currentMarket.id || marketId}/login`, { replace: true });
              }}
              className="flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ color: "#122a4c" }}
            >
              <ArrowLeft size={16} />
              Voltar para entrar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
