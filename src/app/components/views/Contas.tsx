"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import Sidebar from "../views/ui/Sidebar";
import Topbar from "../views/ui/Topbar";
import HeaderContas from "../views/ui/HeaderContas";
import CardsContas from "../views/ui/CardsContas";
import TabelaContas from "../views/ui/TabelaContas";
import { useToast } from "./ui/toaster";
import { useNotification } from "@/contexts/NotificationContext";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

// useLayoutEffect no browser; fallback para useEffect no SSR
const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Contas() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { showNotification } = useNotification();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isCardsLoading, setIsCardsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Detecta quando estamos no cliente e carrega estado do localStorage
  useEffect(() => {
    setIsClient(true);
    const savedState = localStorage.getItem(LS_KEY);
    if (savedState === "1") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  // Detecta se uma conta do Mercado Livre foi conectada e mostra toast de sucesso
  useEffect(() => {
    const meliConnected = searchParams.get("meli_connected");
    const meliNickname = searchParams.get("meli_nickname");
    const meliUserId = searchParams.get("meli_user_id");

    if (meliConnected === "true") {
      const accountName = meliNickname || `Usuário ${meliUserId}`;

      // Mostrar notificação popup
      showNotification({
        type: "success",
        title: "Conta Mercado Livre conectada!",
        message: `Sua conta ${accountName} foi conectada com sucesso. Agora você pode sincronizar suas vendas.`,
        actionLabel: "Sincronizar Vendas",
        actionHref: "/vendas/mercado-livre",
        duration: 8000,
      });

      // Selecionar automaticamente a plataforma Mercado Livre
      setSelectedPlatform("Mercado Livre");
      setTableRefreshKey((value) => value + 1);

      // Limpar os parâmetros da URL sem recarregar a página
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("meli_connected");
        url.searchParams.delete("meli_nickname");
        url.searchParams.delete("meli_user_id");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [searchParams, showNotification]);

  // Detecta se uma conta Shopee foi conectada e mostra toast de sucesso
  useEffect(() => {
    const shopeeConnected = searchParams.get("shopee_connected");
    const shopId = searchParams.get("shopee_shop_id");
    const merchantId = searchParams.get("shopee_merchant_id");

    if (shopeeConnected === "true") {
      const accountLabel = shopId
        ? `Loja ${shopId}`
        : merchantId
          ? `Merchant ${merchantId}`
          : "Loja Shopee";

      // Mostrar notificação popup
      showNotification({
        type: "success",
        title: "Conta Shopee conectada!",
        message: `${accountLabel} foi conectada com sucesso. Agora você pode sincronizar suas vendas.`,
        actionLabel: "Sincronizar Vendas",
        actionHref: "/vendas/shopee",
        duration: 8000,
      });

      setSelectedPlatform("Shopee");
      setTableRefreshKey((value) => value + 1);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("shopee_connected");
        url.searchParams.delete("shopee_shop_id");
        url.searchParams.delete("shopee_merchant_id");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [searchParams, showNotification]);

  // Detecta se uma conta Bling foi conectada e mostra toast de sucesso
  useEffect(() => {
    const blingConnected = searchParams.get("bling_connected");
    const blingUserId = searchParams.get("bling_user_id");
    const blingAccountName = searchParams.get("bling_account_name");

    if (blingConnected === "true") {
      const accountLabel =
        blingAccountName || `Conta Bling ${blingUserId || ""}`.trim();

      // Mostrar notificação popup
      showNotification({
        type: "success",
        title: "Conta Bling conectada!",
        message: `${accountLabel} foi conectada com sucesso.`,
        actionLabel: "Ver Contas",
        actionHref: "/contas",
        duration: 8000,
      });

      setSelectedPlatform("Bling");
      setTableRefreshKey((value) => value + 1);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("bling_connected");
        url.searchParams.delete("bling_user_id");
        url.searchParams.delete("bling_account_name");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [searchParams, showNotification]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = (event: MessageEvent) => {
      if (typeof window === "undefined") return;
      if (event.origin !== window.location.origin) return;

      const payload: any = event.data;
      if (!payload || typeof payload !== "object") return;

      if (payload.type === "shopee:auth:success") {
        const detail = payload.data || {};
        const shopIdValue =
          typeof detail.shopId === "string" && detail.shopId.length > 0
            ? detail.shopId
            : typeof detail.shop_id === "string" && detail.shop_id.length > 0
              ? detail.shop_id
              : undefined;
        const accountLabel = shopIdValue
          ? `Loja ${shopIdValue}`
          : "Loja Shopee";
        toast({
          variant: "success",
          title: "Conta Shopee conectada!",
          description: `${accountLabel} foi conectada com sucesso.`,
          duration: 5000,
        });
        setSelectedPlatform("Shopee");
        setTableRefreshKey((value) => value + 1);
        return;
      }

      if (payload.type === "shopee:auth:error") {
        const message =
          typeof payload.message === "string" && payload.message.length > 0
            ? payload.message
            : "Nao foi possivel concluir a autenticacao. Tente novamente.";
        toast({
          variant: "error",
          title: "Falha ao conectar a Shopee",
          description: message,
          duration: 6000,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast]);

  // Simula carregamento inicial dos cards
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCardsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Simula carregamento da tabela quando uma plataforma é selecionada
  useEffect(() => {
    if (selectedPlatform) {
      setIsTableLoading(true);
      const timer = setTimeout(() => {
        setIsTableLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedPlatform]);

  // Define a var CSS logo na 1ª pintura do cliente (conforme o estado inicial)
  const hasInitialSet = useRef(false);

  useIsoLayout(() => {
    if (!isClient || hasInitialSet.current) return;
    const el = containerRef.current;
    if (!el) return;
    hasInitialSet.current = true;
    gsap.set(el, {
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isClient, isSidebarCollapsed]);

  // Anima quando o estado muda
  useIsoLayout(() => {
    if (!isClient) return;
    const el = containerRef.current;
    if (!el) return;
    gsap.to(el, {
      duration: 0.35,
      ease: "power2.inOut",
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed, isClient]);

  // Persiste o estado
  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(LS_KEY, isSidebarCollapsed ? "1" : "0");
    } catch {}
  }, [isSidebarCollapsed, isClient]);

  // Fallbacks de var + evita scroll horizontal
  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden">
      <Sidebar
        collapsed={isSidebarCollapsed}
        mobileOpen={isSidebarMobileOpen}
        onMobileClose={() => setIsSidebarMobileOpen(false)}
      />

      <Topbar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        onMobileMenu={() => setIsSidebarMobileOpen((v) => !v)}
      />

      {/* Plano de fundo da área de conteúdo */}
      <div
        className={`fixed top-16 bottom-0 left-0 right-0 ${mdLeftVar} z-10 bg-[#F3F3F3]`}
      >
        <div className="h-full w-full rounded-tl-none md:rounded-tl-2xl border border-gray-200 bg-white" />
      </div>

      {/* Conteúdo */}
      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          <HeaderContas
            selectedPlatform={selectedPlatform || undefined}
            onBackClick={() => setSelectedPlatform(null)}
          />

          {selectedPlatform ? (
            <TabelaContas
              platform={selectedPlatform}
              isLoading={isTableLoading}
              refreshKey={tableRefreshKey}
            />
          ) : (
            <CardsContas
              isLoading={isCardsLoading}
              onCardClick={(platform) => setSelectedPlatform(platform)}
            />
          )}
        </section>
      </main>
    </div>
  );
}
