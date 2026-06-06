import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getFriendlyMessage } from "@/shared/lib/userMessages";

type SystemNoticeModalProps = {
  title?: string;
  message: string;
  primaryColor?: string;
  onClose: () => void;
};

export function SystemNoticeModal({
  title = "Atenção",
  message,
  primaryColor = "var(--market-primary-color)",
  onClose,
}: SystemNoticeModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar aviso">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-gray-700">{message}</p>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type SystemNoticePayload = {
  title?: string;
  message: string;
};

const SYSTEM_NOTICE_EVENT = "system-notice";

export function showSystemNotice(message: unknown, title = "Atenção") {
  window.dispatchEvent(
    new CustomEvent<SystemNoticePayload>(SYSTEM_NOTICE_EVENT, {
      detail: { title, message: getFriendlyMessage(message) },
    }),
  );
}

export function SystemNoticeHost() {
  const [notice, setNotice] = useState<SystemNoticePayload | null>(null);

  useEffect(() => {
    const handleNotice = (event: Event) => {
      const detail = (event as CustomEvent<SystemNoticePayload>).detail;
      if (detail?.message) setNotice(detail);
    };

    window.addEventListener(SYSTEM_NOTICE_EVENT, handleNotice);
    return () => window.removeEventListener(SYSTEM_NOTICE_EVENT, handleNotice);
  }, []);

  if (!notice) return null;

  return (
    <SystemNoticeModal
      title={notice.title}
      message={notice.message}
      onClose={() => setNotice(null)}
    />
  );
}
