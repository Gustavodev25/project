import { useState, useEffect } from "react";
import { API_CONFIG } from "@/lib/api-config";

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
    statusIcon: "❔",
    statusColor: "gray",
  });

  useEffect(() => {
    const detectBackend = async () => {
      try {
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

        if (!apiUrl && typeof window !== "undefined") {
          apiUrl = window.location.origin;
        }

        const finalUrl = apiUrl || (typeof window !== "undefined" ? window.location.origin : "");
        const debugEndpoint = API_CONFIG.getApiUrl("/api/debug/ambiente");

        try {
          const response = await fetch(debugEndpoint, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });

          if (response.ok) {
            const data = await response.json();
            console.log("[useBackendDetection] Resposta do backend debug:", data);

            const source = determineBackendSource(finalUrl, data);

            setBackendInfo({
              url: finalUrl,
              source,
              statusIcon: getStatusIcon(source),
              statusColor: getStatusColor(source),
            });

            return;
          }
        } catch (debugError) {
          console.warn("[useBackendDetection] Falha ao consultar /api/debug/ambiente:", debugError);
        }

        const fallbackSource = determineBackendSource(finalUrl, null);

        setBackendInfo({
          url: finalUrl,
          source: fallbackSource,
          statusIcon: getStatusIcon(fallbackSource),
          statusColor: getStatusColor(fallbackSource),
        });

        console.log("[useBackendDetection] Backend detectado:", finalUrl);
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
  if (debugData?.vercelEnv) {
    return "Vercel";
  }

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
      return "🟢";
    case "Local":
      return "🟨";
    case "Unknown":
      return "❔";
    default:
      return "❔";
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
