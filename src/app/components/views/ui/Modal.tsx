"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "lg",
  showCloseButton = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!shouldRender) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full mx-4",
  };

  const modalContent = (
    <>
      {/* Backdrop com blur progressivo */}
      <div
        className={`fixed inset-0 z-[9998] transition-all duration-300 ease-out ${
          isAnimating
            ? "backdrop-blur-md bg-black/40"
            : "backdrop-blur-none bg-black/0"
        }`}
        style={{
          backdropFilter: isAnimating ? "blur(8px)" : "blur(0px)",
          WebkitBackdropFilter: isAnimating ? "blur(8px)" : "blur(0px)",
        }}
        onClick={handleBackdropClick}
      />

      {/* Container do modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className={`relative w-full ${sizeClasses[size]} pointer-events-auto transition-all duration-350 ease-out ${
            isAnimating
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-8"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card do modal com glassmorphism */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/70 bg-gradient-to-r from-gray-50/50 to-white/50">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                {title}
              </h2>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="group p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 transition-all duration-200 active:scale-95"
                  aria-label="Fechar modal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform group-hover:rotate-90 duration-200"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-5 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 8px;
          margin: 4px 0;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #cbd5e0 0%, #a0aec0 100%);
          border-radius: 8px;
          border: 2px solid #f7fafc;
          transition: background 0.2s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #a0aec0 0%, #718096 100%);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: #718096;
        }
      `}</style>
    </>
  );

  return createPortal(modalContent, document.body);
}