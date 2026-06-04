import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Download, Home, MoreVertical, Share, Smartphone, X } from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Platform = "android" | "ios" | "other";

const DISMISSED_STORAGE_KEY = "cliente_delivery_pwa_install_banner_dismissed";

function isStandaloneMode() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function detectPlatform(): Platform {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || (
    userAgent.includes("macintosh") && navigator.maxTouchPoints > 1
  );
  const isAndroid = userAgent.includes("android");

  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "other";
}

function getStoredDismissed() {
  try {
    return localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function storeDismissed() {
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
  } catch {
    // Storage can be unavailable in private browsing. The close action still hides it for this session.
  }
}

function getSteps(platform: Platform, canPromptInstall: boolean) {
  if (platform === "ios") {
    return [
      {
        title: "Abra o menu de compartilhamento",
        description: "No Safari, toque no botão de compartilhar na barra inferior.",
        Icon: Share,
      },
      {
        title: "Escolha Adicionar à Tela de Início",
        description: "Role as opções se precisar e selecione Adicionar à Tela de Início.",
        Icon: Home,
      },
      {
        title: "Confirme em Adicionar",
        description: "O app aparecerá junto com os outros aplicativos do iPhone.",
        Icon: CheckCircle2,
      },
    ];
  }

  if (platform === "android" && canPromptInstall) {
    return [
      {
        title: "Toque em Instalar app",
        description: "O navegador abrirá a confirmação de instalação.",
        Icon: Download,
      },
      {
        title: "Confirme a instalação",
        description: "Depois de aceitar, o atalho do app será criado no Android.",
        Icon: CheckCircle2,
      },
    ];
  }

  return [
    {
      title: "Abra o menu do navegador",
      description: "No Chrome ou navegador compatível, toque no menu de três pontos.",
      Icon: MoreVertical,
    },
    {
      title: "Escolha Instalar app",
      description: "A opção também pode aparecer como Adicionar à tela inicial.",
      Icon: Download,
    },
    {
      title: "Confirme a instalação",
      description: "O app ficará disponível na tela inicial do seu dispositivo.",
      Icon: CheckCircle2,
    },
  ];
}

export function PwaInstallBanner() {
  const { currentMarket } = useApp();
  const [platform, setPlatform] = useState<Platform>("other");
  const [isVisible, setIsVisible] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState<"idle" | "accepted" | "dismissed" | "installed">("idle");

  const primaryColor = currentMarket?.primaryColor || "#122a4c";
  const isAndroidPromptAvailable = platform === "android" && Boolean(installPrompt);
  const steps = useMemo(
    () => getSteps(platform, isAndroidPromptAvailable),
    [isAndroidPromptAvailable, platform],
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const CurrentStepIcon = currentStep.Icon;
  const platformLabel = platform === "ios" ? "iPhone" : platform === "android" ? "Android" : "celular";

  useEffect(() => {
    const nextPlatform = detectPlatform();
    setPlatform(nextPlatform);
    setIsVisible(!isStandaloneMode() && !getStoredDismissed() && nextPlatform !== "other");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      if (!isStandaloneMode() && !getStoredDismissed()) {
        setIsVisible(true);
      }
    };

    const handleInstalled = () => {
      setInstallStatus("installed");
      setIsVisible(false);
      setIsGuideOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isGuideOpen) return;
    setStepIndex(0);
    setInstallStatus("idle");
  }, [isGuideOpen, platform]);

  if (!isVisible) return null;

  const closeBanner = () => {
    storeDismissed();
    setIsVisible(false);
    setIsGuideOpen(false);
  };

  const openGuide = () => {
    setIsGuideOpen(true);
  };

  const runAndroidPrompt = async () => {
    if (!installPrompt) {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallStatus(choice.outcome);

    if (choice.outcome === "accepted") {
      setStepIndex(steps.length - 1);
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const nextStep = () => {
    if (isAndroidPromptAvailable && stepIndex === 0) {
      void runAndroidPrompt();
      return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    setIsGuideOpen(false);
  };

  return (
    <>
      <div
        className="fixed left-4 right-4 z-40 md:left-auto md:right-6"
        style={{ bottom: "84px", maxWidth: "420px" }}
      >
        <div
          className="rounded-2xl bg-white p-3 shadow-lg"
          style={{ border: "1px solid #d9e4f2", boxShadow: "0 18px 42px rgba(15,23,42,0.18)" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openGuide}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "color-mix(in srgb, #16a34a 12%, white)" }}
              >
                <Smartphone size={22} color="#16a34a" />
              </span>
              <span className="min-w-0">
                <span className="block truncate" style={{ color: "#122a4c", fontSize: "13px", fontWeight: 900 }}>
                  Instale o app no {platformLabel}
                </span>
                <span className="block truncate" style={{ color: "#64748b", fontSize: "12px", fontWeight: 700 }}>
                  Toque para ver o passo a passo.
                </span>
              </span>
              <ChevronRight size={18} color="#94a3b8" className="ml-auto flex-shrink-0" />
            </button>

            <button
              type="button"
              onClick={closeBanner}
              aria-label="Fechar instrução de instalação"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "#f1f5f9" }}
            >
              <X size={17} color="#64748b" />
            </button>
          </div>
        </div>
      </div>

      {isGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-4 pt-10 sm:items-center sm:pb-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          onClick={() => setIsGuideOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            style={{ border: "1px solid #d9e4f2" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p style={{ color: "#64748b", fontSize: "12px", fontWeight: 800 }}>
                  Passo {Math.min(stepIndex + 1, steps.length)} de {steps.length}
                </p>
                <h2 id="pwa-install-title" style={{ color: "#122a4c", fontSize: "18px", fontWeight: 900 }}>
                  Instalar app no {platformLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                aria-label="Fechar passo a passo"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: "#f1f5f9" }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="mb-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: "#e2e8f0" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((stepIndex + 1) / steps.length) * 100}%`,
                  backgroundColor: primaryColor,
                }}
              />
            </div>

            <div className="rounded-2xl p-4" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "color-mix(in srgb, #16a34a 12%, white)" }}
              >
                <CurrentStepIcon size={24} color="#16a34a" />
              </div>
              <h3 style={{ color: "#122a4c", fontSize: "16px", fontWeight: 900 }}>
                {currentStep.title}
              </h3>
              <p className="mt-1" style={{ color: "#475569", fontSize: "13px", lineHeight: 1.5, fontWeight: 600 }}>
                {currentStep.description}
              </p>
            </div>

            {installStatus === "dismissed" && (
              <p className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#fffbeb", color: "#92400e", fontSize: "12px", fontWeight: 800 }}>
                A instalação não foi confirmada. Você ainda pode instalar pelo menu do navegador.
              </p>
            )}

            {installStatus === "accepted" && (
              <p className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontSize: "12px", fontWeight: 800 }}>
                Instalação iniciada. Confira a tela inicial do dispositivo.
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={nextStep}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-white"
                style={{ backgroundColor: primaryColor, fontSize: "14px", fontWeight: 900 }}
              >
                {isAndroidPromptAvailable && stepIndex === 0
                  ? "Instalar app"
                  : stepIndex < steps.length - 1
                    ? "Já fiz isso"
                    : "Concluir"}
                <ChevronRight size={17} />
              </button>
              <button
                type="button"
                onClick={closeBanner}
                className="w-full rounded-2xl px-4 py-3"
                style={{ backgroundColor: "#eef4fb", color: "#122a4c", fontSize: "13px", fontWeight: 900 }}
              >
                Não mostrar novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
