"use client";

import { useEffect, useState } from "react";

const loadingMessages = [
  "Verificando autenticação...",
  "Validando credenciais...",
  "Carregando sessão...",
  "Preparando acesso...",
  "Quase pronto...",
];

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isLockOpen, setIsLockOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        setIsVisible(true);
      }, 300); // Tempo do fade out
    }, 2000); // Troca a cada 2 segundos

    return () => clearInterval(interval);
  }, []);

  // Animação do cadeado abrindo e fechando
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLockOpen((prev) => !prev);
    }, 1500); // Alterna a cada 1.5 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="text-center">
        {/* Loader animado - Cadeado com círculo rotativo */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Círculo externo pulsante */}
          <div className="absolute inset-0 border-3 border-orange-200 rounded-full animate-ping opacity-20"></div>
          
          {/* Círculo rotativo de fundo */}
          <div className="absolute inset-2 border-3 border-transparent border-t-orange-400 border-r-orange-300 rounded-full animate-spin"></div>
          
          {/* Ícone de cadeado centralizado */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              key={isLockOpen ? "open" : "closed"}
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-orange-500 ${
                isLockOpen ? "animate-lock-open" : "animate-lock-close"
              }`}
              style={{
                transform: isLockOpen ? "rotate(-5deg) scale(1.05)" : "rotate(5deg) scale(1.05)",
                transition: "transform 0.3s ease-out",
              }}
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              {isLockOpen ? (
                // Cadeado Aberto
                <>
                  <path d="M3 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" />
                  <path d="M9 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
                  <path d="M13 11v-4a4 4 0 1 1 8 0v4" />
                </>
              ) : (
                // Cadeado Fechado
                <>
                  <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" />
                  <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
                  <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Texto que alterna com fade */}
        <div className="relative h-7 overflow-hidden">
          <p
            className={`text-base font-medium bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent transition-all duration-300 ${
              isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 -translate-y-4"
            }`}
          >
            {loadingMessages[messageIndex]}
          </p>
        </div>

        {/* Pontos animados */}
        <div className="flex justify-center gap-1.5 mt-4">
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
}
