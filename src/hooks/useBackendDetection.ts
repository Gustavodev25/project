import { useEffect, useState } from "react";
import { API_CONFIG } from "@/lib/api-config";

type BackendSource = "Vercel" | "Render" | "Local" | "Unknown";

interface BackendInfo {
  url: string;
  source: BackendSource;
  statusIcon: string;
  statusColor: string;
}

export function useBackendDetection(): BackendInfo {
  const [backendInfo, setBackendInfo] = useState<BackendInfo>({
    url: "",
    source: "Unknown",
    statusIcon: "?",
    statusColor: "gray",
  });

  useEffect(() => {
    const detectBackend = async () => {
      try {
        const envBackend =
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          process.env.NEXT_PUBLIC_RENDER_BACKEND_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          "";

        let apiUrl = envBackend;
        if (!apiUrl && typeof window !== "undefined") {
          apiUrl = window.location.origin;
        }

        const finalUrl =
          apiUrl || (typeof window !== "undefined" ? window.location.origin : "");
        const debugEndpoint = API_CONFIG.getApiUrl("/api/debug/ambiente");

        try {
          const response = await fetch(debugEndpoint, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });

          if (response.ok) {
            const data = await response.json();
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
): BackendSource {
  if (debugData?.vercelEnv || debugData?.vercelRegion) {
    return "Vercel";
  }

  if (debugData?.renderEnv || debugData?.backendProvider === "render") {
    return "Render";
  }

  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return "Local";
  }

  if (url.includes("render.com") || url.includes(".onrender.com")) {
    return "Render";
  }

  if (url.includes("vercel.app") || url.includes(".vercel.app")) {
    return "Vercel";
  }

  return "Unknown";
}

function getStatusIcon(source: BackendSource): string {
  switch (source) {
    case "Vercel":
      return "V";
    case "Render":
      return "R";
    case "Local":
      return "L";
    case "Unknown":
    default:
      return "?";
  }
}

function getStatusColor(source: BackendSource): string {
  switch (source) {
    case "Vercel":
      return "blue";
    case "Render":
      return "green";
    case "Local":
      return "yellow";
    case "Unknown":
    default:
      return "gray";
  }
}
