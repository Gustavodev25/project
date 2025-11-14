import { useState, useEffect } from "react";

interface BackendInfo {
  url: string;
  source: "Vercel" | "Render" | "Local" | "Unknown";
  statusIcon: string;
  statusColor: string;
}

export function useBackendDetection(): BackendInfo {
  const [backendInfo, setBackendInfo] = useState<BackendInfo>({
    url: "",
    source: "Unknown",
    statusIcon: "⚪",
    statusColor: "gray",
  });

  useEffect(() => {
    const detectBackend = async () => {
      try {
        // 1. Verificar variável de ambiente
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

        // 2. Se não houver variável, usar origin
        if (!apiUrl && typeof window !== "undefined") {
          apiUrl = window.location.origin;
        }

        // 3. Tentar obter informações de debug do backend
        try {
          const response = await fetch(`${apiUrl || "/api"}/debug/ambiente`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (response.ok) {
            const data = await response.json();
            console.log("🔍 Resposta do backend debug:", data);

            // Se conseguir resposta do backend, use a URL configurada
            const finalUrl = apiUrl || window.location.origin;
            const source = determineBackendSource(finalUrl, data);

            setBackendInfo({
              url: finalUrl,
              source,
              statusIcon: getStatusIcon(source),
              statusColor: getStatusColor(source),
            });
          }
        } catch (debugError) {
          // Se falhar o debug endpoint, usa detecção por URL
          const finalUrl = apiUrl || window.location.origin;
          const source = determineBackendSource(finalUrl, null);

          setBackendInfo({
            url: finalUrl,
            source,
            statusIcon: getStatusIcon(source),
            statusColor: getStatusColor(source),
          });
        }

        console.log("🔗 Backend detectado:", apiUrl);
      } catch (error) {
        console.error("Erro ao detectar backend:", error);
      }
    };

    detectBackend();
  }, []);

  return backendInfo;
}

function determineBackendSource(
  url: string,
  debugData?: any
): "Vercel" | "Render" | "Local" | "Unknown" {
  // Verificar pelo environment variable do Vercel
  if (debugData?.vercelEnv) {
    return "Vercel";
  }

  // Verificar pela URL
  if (
    url.includes("vercel.app") ||
    url.includes(".vercel.app") ||
    url.includes("localhost") ||
    url.includes("127.0.0.1")
  ) {
    return url.includes("localhost") || url.includes("127.0.0.1")
      ? "Local"
      : "Vercel";
  }

  if (url.includes("render.com") || url.includes(".onrender.com")) {
    return "Render";
  }

  // Verificar pelo hostname da resposta do debug
  if (debugData?.vercelRegion) {
    return "Vercel";
  }

  return "Unknown";
}

function getStatusIcon(source: "Vercel" | "Render" | "Local" | "Unknown"): string {
  switch (source) {
    case "Vercel":
      return "🟦";
    case "Render":
      return "🟩";
    case "Local":
      return "🟨";
    case "Unknown":
      return "⚪";
    default:
      return "⚪";
  }
}

function getStatusColor(source: "Vercel" | "Render" | "Local" | "Unknown"): string {
  switch (source) {
    case "Vercel":
      return "blue";
    case "Render":
      return "green";
    case "Local":
      return "yellow";
    case "Unknown":
      return "gray";
    default:
      return "gray";
  }
}
