"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Variant = "success" | "error" | "info" | "warning";

type ToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  variant?: Variant;
  duration?: number; // ms (0 = não auto-fecha)
  showProgress?: boolean;
  progressValue?: number;
  progressMax?: number;
  progressLabel?: string;
};

type Toast = {
  id: string;
  title: string;
  description: string;
  variant: Variant;
  duration: number;
  createdAt: number;
  showProgress?: boolean;
  progressValue?: number;
  progressMax?: number;
  progressLabel?: string;
};

const ToastCtx = createContext<{
  toast: (opts: ToastOptions) => string;
  updateToast: (id: string, opts: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
} | null>(null);

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Icon({ variant }: { variant: Variant }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    width: 20,
    height: 20,
    "aria-hidden": true as const,
  };
  if (variant === "success") {
    return (
      <svg {...common}>
        <path
          d="M20 6L9 17l-5-5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5" strokeLinecap="round" />
        <path d="M12 17h.01" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg {...common}>
        <path d="M12 3l9 16H3l9-16z" />
        <path d="M12 10v4" strokeLinecap="round" />
        <path d="M12 17h.01" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8h.01" strokeLinecap="round" />
      <path d="M11 12h1v4" strokeLinecap="round" />
    </svg>
  );
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  const MAX_STACK = 3;
  const stack = toasts.slice(-MAX_STACK).reverse();

  return (
    <div className="fixed bottom-4 right-4 z-[999] pointer-events-none">
      <div
        className="relative"
        style={{ width: "24rem", maxWidth: "calc(100vw - 2rem)" }}
      >
        {stack.map((t, i) => {
          const depth = i;
          const isTop = depth === 0;
          const isAssertive = t.variant === "error" || t.variant === "warning";

          const translateY = -Math.min(depth, 2) * 10;
          const scale = 1 - Math.min(depth, 2) * 0.06;
          const opacity = 1 - Math.min(depth, 2) * 0.18;
          const zIndex = 1000 - depth;

          return (
            <div
              key={t.id}
              role={isTop ? (isAssertive ? "alert" : "status") : undefined}
              aria-live={
                isTop ? (isAssertive ? "assertive" : "polite") : undefined
              }
              className={clsx(
                "absolute right-0 bottom-0 w-full will-change-transform",
                "transition-transform transition-opacity duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
                "pointer-events-none",
              )}
              style={{
                transform: `translateY(${translateY}px) scale(${scale})`,
                opacity,
                zIndex,
              }}
            >
              <div
                className={clsx(
                  "pointer-events-auto",
                  "flex items-start gap-3 rounded-xl border p-3 shadow-lg bg-white text-gray-900",
                  "transition-shadow duration-300",
                  depth > 0 && "blur-[0.2px]",
                  t.variant === "success" && "border-green-200",
                  t.variant === "error" && "border-red-200",
                  t.variant === "warning" && "border-yellow-200",
                  t.variant === "info" && "border-gray-200",
                )}
                style={{ pointerEvents: isTop ? "auto" : "none" }}
              >
                <div
                  className={clsx(
                    "mt-0.5",
                    t.variant === "success" && "text-green-600",
                    t.variant === "error" && "text-red-600",
                    t.variant === "warning" && "text-yellow-600",
                    t.variant === "info" && "text-gray-700",
                  )}
                >
                  <Icon variant={t.variant} />
                </div>

                <div className="min-w-0 flex-1">
                  {t.title && <p className="text-sm font-medium">{t.title}</p>}
                  {t.description && (
                    <p className="mt-0.5 break-words text-xs text-gray-600">
                      {t.description}
                    </p>
                  )}
                  
                  {t.showProgress && t.progressValue !== undefined && t.progressMax !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{t.progressLabel || 'Progresso'}</span>
                        <span className="text-gray-500">
                          {Math.round((t.progressValue / t.progressMax) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            t.variant === "success" ? "bg-green-500" :
                            t.variant === "error" ? "bg-red-500" :
                            t.variant === "warning" ? "bg-yellow-500" :
                            "bg-blue-500"
                          }`}
                          style={{ width: `${(t.progressValue / t.progressMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {isTop && (
                  <button
                    onClick={() => dismiss(t.id)}
                    className="ml-2 rounded-md p-1 text-gray-500 hover:text-gray-900 focus:outline-none"
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, opts: Partial<ToastOptions>) => {
    setToasts((s) => s.map((t) => 
      t.id === id 
        ? { 
            ...t, 
            ...opts,
            showProgress: opts.showProgress ?? t.showProgress,
            progressValue: opts.progressValue ?? t.progressValue,
            progressMax: opts.progressMax ?? t.progressMax,
            progressLabel: opts.progressLabel ?? t.progressLabel,
          }
        : t
    ));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id =
        opts.id ??
        (typeof globalThis !== "undefined" &&
        typeof globalThis.crypto?.randomUUID === "function"
          ? globalThis.crypto.randomUUID()
          : Math.random().toString(36).slice(2));

      const variant: Variant = opts.variant ?? "info";
      const duration = opts.duration ?? 4000;

      const t: Toast = {
        id,
        title: opts.title ?? "",
        description: opts.description ?? "",
        variant,
        duration,
        createdAt: Date.now(),
        showProgress: opts.showProgress,
        progressValue: opts.progressValue,
        progressMax: opts.progressMax,
        progressLabel: opts.progressLabel,
      };
      setToasts((s) => [...s, t]);

      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={{ toast, updateToast, dismiss }}>
      {children}
      {mounted &&
        createPortal(
          <ToastViewport toasts={toasts} dismiss={dismiss} />,
          document.body,
        )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx)
    throw new Error("useToast deve ser usado dentro de <ToasterProvider>.");
  return ctx;
}
