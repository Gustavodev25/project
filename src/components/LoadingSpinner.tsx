"use client";

import { useEffect, useState } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  messages?: string[];
}

const defaultMessages = [
  "Carregando...",
  "Aguarde...",
  "Processando...",
];

export default function LoadingSpinner({ 
  size = "md", 
  showText = true,
  messages = defaultMessages
}: LoadingSpinnerProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!showText || messages.length <= 1) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [showText, messages.length]);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  const textSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Spinner */}
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="absolute inset-0 border-4 border-orange-200 rounded-full animate-ping opacity-20"></div>
        <div className="absolute inset-1 border-3 border-orange-300 rounded-full animate-pulse"></div>
        <div className="absolute inset-2 border-3 border-transparent border-t-orange-500 rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full animate-pulse"></div>
      </div>

      {/* Texto opcional */}
      {showText && (
        <div className="text-center">
          <p className={`font-medium text-gray-700 ${textSize[size]} transition-opacity duration-300`}>
            {messages[messageIndex]}
          </p>
          
          {/* Pontos animados */}
          <div className="flex justify-center gap-1.5 mt-2">
            <div className={`${dotSize[size]} bg-orange-500 rounded-full animate-bounce`} style={{ animationDelay: "0ms" }}></div>
            <div className={`${dotSize[size]} bg-orange-500 rounded-full animate-bounce`} style={{ animationDelay: "150ms" }}></div>
            <div className={`${dotSize[size]} bg-orange-500 rounded-full animate-bounce`} style={{ animationDelay: "300ms" }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
