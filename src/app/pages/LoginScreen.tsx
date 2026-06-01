import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { authService } from '@/features/auth';
import { fetchPublishedLegalDocument, type LegalDocument } from "@/features/legalDocuments";
import { getProductById } from '@/features/products';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addToCart, currentMarket, login, marketId, tenantPath } = useApp();
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
  const [privacyPolicy, setPrivacyPolicy] = useState<LegalDocument | null>(null);
  const [privacyPolicyError, setPrivacyPolicyError] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const showMarketLogo = Boolean(currentMarket.logo && !logoFailed);
  const primaryColor = currentMarket.primaryColor || "#122a4c";

  useEffect(() => {
    let isActive = true;

    fetchPublishedLegalDocument("privacy-policy")
      .then((document) => {
        if (!isActive) return;
        setPrivacyPolicy(document);
        setPrivacyPolicyError("");
      })
      .catch(() => {
        if (!isActive) return;
        setPrivacyPolicyError("Política de Privacidade não publicada.");
      });

    return () => {
      isActive = false;
    };
  }, []);

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

    if (mode === "signup" && password.length < 6) {
      showSystemNotice("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      showSystemNotice("As senhas não conferem.");
      return;
    }

    if (mode === "signup" && privacyPolicy && !privacyAccepted) {
      showSystemNotice("Você precisa aceitar a Política de Privacidade para criar a conta.");
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
          privacy_policy_accepted: privacyAccepted,
          accepted_privacy_policy_id: privacyPolicy?.id,
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
      className="flex-1 overflow-y-auto"
      style={{
        background: `radial-gradient(circle at 50% 0%, color-mix(in srgb, ${primaryColor} 11%, white) 0%, #f8fafc 40%)`,
      }}
    >
      <div
        className="px-4 pb-12 pt-8 md:pt-6"
        style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${primaryColor} 86%, #315c90) 0%, color-mix(in srgb, ${primaryColor} 82%, #071426) 100%)`,
        }}
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.18)" }}
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
              <p className="truncate text-white" style={{ fontSize: "17px", fontWeight: 800 }}>
                {currentMarket.name}
              </p>
              <p className="mt-0.5" style={{ fontSize: "12px", color: "rgba(255,255,255,0.76)" }}>
                Compras rápidas e seguras
              </p>
            </div>
          </div>
          <ShieldCheck className="flex-shrink-0" size={23} color="rgba(255,255,255,0.72)" />
        </div>
      </div>

      <main className="mx-auto -mt-7 w-full max-w-md px-4 pb-8">
        <div
          className="overflow-hidden rounded-3xl bg-white p-5"
          style={{ border: "1px solid #e2e8f0", boxShadow: "0 16px 40px rgba(15, 23, 42, 0.09)" }}
        >
          {mode !== "reset" && (
            <div className="mb-6 flex rounded-2xl p-1" style={{ backgroundColor: "#f1f5f9" }}>
              {(["login", "signup"] as const).map((tab) => {
                const selected = mode === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMode(tab)}
                    className="flex-1 rounded-xl py-2.5 transition-all"
                    style={{
                      backgroundColor: selected ? "#ffffff" : "transparent",
                      boxShadow: selected ? "0 2px 8px rgba(15, 23, 42, 0.08)" : "none",
                      color: selected ? primaryColor : "#64748b",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    {tab === "login" ? "Entrar" : "Criar conta"}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mb-5">
            <h1 style={{ color: "#0f172a", fontSize: "22px", fontWeight: 800, lineHeight: 1.2 }}>
              {mode === "login"
                ? "Bem-vindo de volta"
                : mode === "signup"
                  ? "Crie sua conta"
                  : mode === "forgot"
                    ? "Recupere sua senha"
                    : "Nova senha"}
            </h1>
            <p className="mt-1.5" style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
              {mode === "login"
                ? "Entre para acompanhar pedidos e aproveitar ofertas."
                : mode === "signup"
                  ? "Cadastre-se para começar suas compras."
                  : mode === "forgot"
                    ? "Enviaremos um link seguro para seu e-mail."
                    : "Defina uma senha nova para sua conta."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === "signup" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Nome completo</span>
                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ border: "1px solid #d9e4f2", backgroundColor: "#f8fafc" }}>
                  <UserRound size={18} color={primaryColor} />
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
            )}

            {mode !== "reset" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">E-mail</span>
                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ border: "1px solid #d9e4f2", backgroundColor: "#f8fafc" }}>
                  <Mail size={18} color={primaryColor} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
            )}

            {mode === "signup" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Telefone <span className="font-normal text-slate-400">(opcional)</span></span>
                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ border: "1px solid #d9e4f2", backgroundColor: "#f8fafc" }}>
                  <Phone size={18} color={primaryColor} />
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
            )}

            {mode !== "forgot" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  {mode === "login" ? "Senha" : "Nova senha"}
                </span>
                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ border: "1px solid #d9e4f2", backgroundColor: "#f8fafc" }}>
                  <Lock size={18} color={primaryColor} />
                  <input
                    type={showPass ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={mode === "login" ? "Sua senha" : "Mínimo de 6 caracteres"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}>
                    {showPass ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                  </button>
                </div>
              </label>
            )}

            {(mode === "signup" || mode === "reset") && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Confirmar senha</span>
                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ border: "1px solid #d9e4f2", backgroundColor: "#f8fafc" }}>
                  <Lock size={18} color={primaryColor} />
                  <input
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
            )}

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="self-end pb-1 pt-0.5 text-sm font-semibold"
                style={{ color: primaryColor }}
              >
                Esqueceu sua senha?
              </button>
            )}

            {mode === "signup" && (
              <div className="rounded-xl p-3" style={{ border: "1px solid #d9e4f2", backgroundColor: "#f8fafc" }}>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(event) => setPrivacyAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-xs leading-5 text-slate-600">
                    Li e aceito a{" "}
                    <button
                      type="button"
                      onClick={() => navigate(tenantPath("privacy/policy"))}
                      className="font-bold underline"
                      style={{ color: primaryColor }}
                    >
                      Política de Privacidade
                    </button>
                    {privacyPolicy?.version ? ` versão ${privacyPolicy.version}` : ""}.
                  </span>
                </label>
                {privacyPolicyError && (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {privacyPolicyError}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-xl py-3.5 text-white transition-all active:scale-[0.98] disabled:cursor-wait"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 76%, #071426))`,
                boxShadow: `0 8px 18px color-mix(in srgb, ${primaryColor} 24%, transparent)`,
                fontSize: "15px",
                fontWeight: 700,
                opacity: loading ? 0.7 : 1,
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
                className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold"
                style={{ color: primaryColor }}
              >
                <ArrowLeft size={16} />
                Voltar para entrar
              </button>
            )}
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Ambiente protegido para suas compras
        </p>
      </main>
    </div>
  );
}
