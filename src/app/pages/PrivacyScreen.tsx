import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Key,
  ReceiptText,
  Shield,
} from "lucide-react";
import { Checkbox } from "@/app/components/ui/checkbox";
import { useApp } from "@/app/providers/AppProvider";
import { authService, type AuthUser } from "@/features/auth";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCpf(value: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (baseLength: number) => {
    let sum = 0;

    for (let index = 0; index < baseLength; index += 1) {
      sum += Number(digits[index]) * (baseLength + 1 - index);
    }

    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
}

export function PrivacyScreen() {
  const navigate = useNavigate();
  const { currentUser, isLoggedIn, tenantPath } = useApp();
  const [dadosAnalise, setDadosAnalise] = useState(true);
  const [profile, setProfile] = useState<AuthUser | null>(currentUser);
  const [cpf, setCpf] = useState(formatCpf(currentUser?.cpf || ""));
  const [cpfAsDefault, setCpfAsDefault] = useState(Boolean(currentUser?.cpf_na_nota_padrao));
  const [isSavingCpf, setIsSavingCpf] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    let isActive = true;

    authService.getCurrentCustomer()
      .then((customer) => {
        if (!isActive) return;
        setProfile(customer);
        setCpf(formatCpf(customer.cpf || ""));
        setCpfAsDefault(Boolean(customer.cpf_na_nota_padrao));
      })
      .catch((error) => {
        console.error("Erro ao carregar perfil do cliente:", error);
      });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

  const handleSaveCpfPreference = async () => {
    if (cpfAsDefault && !isValidCpf(cpf)) {
      showSystemNotice("Informe um CPF válido para usar como padrão.");
      return;
    }

    setIsSavingCpf(true);

    try {
      const updatedProfile = await authService.updateCurrentCustomer({
        cpf: cpf ? onlyDigits(cpf) : null,
        cpf_na_nota_padrao: cpfAsDefault,
      });
      setProfile(updatedProfile);
      setCpf(formatCpf(updatedProfile.cpf || ""));
      setCpfAsDefault(Boolean(updatedProfile.cpf_na_nota_padrao));
      showSystemNotice("Preferência de CPF na nota atualizada.");
    } catch (error) {
      showSystemNotice(error || "Não foi possível atualizar sua preferência.");
    } finally {
      setIsSavingCpf(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 6) {
      showSystemNotice("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showSystemNotice("As senhas não conferem.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await authService.changePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowPasswordForm(false);
      showSystemNotice("Senha alterada com sucesso.");
    } catch (error) {
      showSystemNotice(error || "Não foi possível alterar sua senha.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
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
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 flex items-center gap-3"
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <p className="mb-2 px-1" style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Dados fiscais
          </p>
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
            <div className="mb-3 flex items-center gap-2">
              <ReceiptText size={16} color="#122a4c" />
              <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#122a4c" }}>CPF na nota</h2>
            </div>

            {isLoggedIn ? (
              <>
                <input
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
                  style={{ borderColor: "#d9e4f2", color: "#334155" }}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(event) => setCpf(formatCpf(event.target.value))}
                  aria-label="CPF padrão para nota fiscal"
                />

                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id="privacy-cpf-default"
                    checked={cpfAsDefault}
                    onCheckedChange={(checked) => setCpfAsDefault(checked === true)}
                  />
                  <label
                    htmlFor="privacy-cpf-default"
                    className="flex-1"
                    style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}
                  >
                    Usar CPF na nota como padrão
                  </label>
                </div>

                {profile?.cpf_na_nota_padrao && (
                  <p className="mt-2" style={{ fontSize: "11px", color: "#15803d", fontWeight: 700 }}>
                    Ativo para próximas compras.
                  </p>
                )}

                <button
                  onClick={handleSaveCpfPreference}
                  disabled={isSavingCpf}
                  className="mt-3 w-full rounded-xl px-4 py-3 text-white disabled:opacity-60"
                  style={{ backgroundColor: "#122a4c", fontSize: "13px", fontWeight: 800 }}
                >
                  {isSavingCpf ? "Salvando..." : "Salvar preferência"}
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate(tenantPath("login"), { state: { redirectTo: tenantPath("privacy") } })}
                className="w-full rounded-xl px-4 py-3 text-white"
                style={{ backgroundColor: "#122a4c", fontSize: "13px", fontWeight: 800 }}
              >
                Entrar para configurar CPF
              </button>
            )}
          </div>
        </div>

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

            <button className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50" style={{ borderBottom: "1px solid #eef2f7" }}>
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

        <div>
          <p className="mb-2 px-1" style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Credenciais
          </p>
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden" style={{ border: "1px solid #d9e4f2" }}>
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  navigate(tenantPath("login"), { state: { redirectTo: tenantPath("privacy") } });
                  return;
                }

                setShowPasswordForm((visible) => !visible);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50"
              style={{ borderBottom: "1px solid #eef2f7" }}
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}>
                <Key size={18} color="#122a4c" />
              </div>
              <span className="flex-1 text-left" style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                Alterar senha
              </span>
              <ChevronRight
                size={16}
                color="#94a3b8"
                style={{ transform: showPasswordForm ? "rotate(90deg)" : undefined, transition: "transform 160ms ease" }}
              />
            </button>
            {showPasswordForm && isLoggedIn && (
              <form
                onSubmit={handleChangePassword}
                className="space-y-3 px-4 py-4"
                style={{ borderBottom: "1px solid #eef2f7", backgroundColor: "#f8fafc" }}
              >
                <p style={{ fontSize: "12px", lineHeight: 1.45, color: "#64748b" }}>
                  Escolha uma nova senha com no mínimo 6 caracteres.
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3" style={{ border: "1px solid #d9e4f2" }}>
                  <Key size={16} color="#64748b" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Nova senha"
                    autoComplete="new-password"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3" style={{ border: "1px solid #d9e4f2" }}>
                  <Key size={16} color="#64748b" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirmar nova senha"
                    autoComplete="new-password"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full rounded-xl px-4 py-3 text-white disabled:opacity-60"
                  style={{ backgroundColor: "#122a4c", fontSize: "13px", fontWeight: 800 }}
                >
                  {isChangingPassword ? "Alterando..." : "Salvar nova senha"}
                </button>
              </form>
            )}
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

        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: "#eef4fb", border: "1px solid #d9e4f2" }}>
          <Check size={16} color="#122a4c" className="flex-shrink-0 mt-0.5" />
          <p style={{ fontSize: "12px", color: "#334155", lineHeight: 1.5 }}>
            Seus dados são criptografados e protegidos de acordo com a <span style={{ fontWeight: 700 }}>LGPD</span>.
          </p>
        </div>

        <div className="pb-4" />
      </div>
    </div>
  );
}
