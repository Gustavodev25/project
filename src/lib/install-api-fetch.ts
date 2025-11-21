import { API_CONFIG } from "./api-config";

let isPatched = false;

export function installExternalApiClients(): void {
  if (isPatched) return;
  if (typeof window === "undefined") return;
  if (!API_CONFIG.baseURL) return;

  isPatched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    const shouldRewrite =
      typeof rawUrl === "string" && rawUrl.startsWith("/api/");

    if (!shouldRewrite) {
      return originalFetch(input as any, init as any);
    }

    const finalUrl = API_CONFIG.getApiUrl(rawUrl);
    const finalInit: RequestInit = {
      ...init,
      credentials: init?.credentials ?? "include",
    };

    try {
      return originalFetch(finalUrl, finalInit);
    } catch (error) {
      console.warn("[api-fetch] Falha ao reescrever fetch:", error);
      return originalFetch(input as any, init as any);
    }
  };

  if (typeof window.EventSource !== "undefined") {
    const OriginalEventSource = window.EventSource;
    class PatchedEventSource extends OriginalEventSource {
      constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
        const rawUrl =
          typeof url === "string" ? url : url.toString();
        const finalUrl =
          typeof rawUrl === "string" && rawUrl.startsWith("/api/")
            ? API_CONFIG.getApiUrl(rawUrl)
            : rawUrl;

        const finalInit: EventSourceInit = {
          ...eventSourceInitDict,
          withCredentials: eventSourceInitDict?.withCredentials ?? true,
        };

        super(finalUrl, finalInit);
      }
    }

    window.EventSource = PatchedEventSource as typeof EventSource;
  }
}
