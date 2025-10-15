"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import UserAvatar from "./UserAvatar";

type TopbarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void; // desktop
  onMobileMenu: () => void; // mobile
};

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  vendas: "Central de Vendas",
  geral: "Vendas Geral",
  "mercado-livre": "Vendas Mercado Livre",
  shopee: "Vendas Shopee",
  sku: "Gestão de SKU",
  contas: "Contas de plataforma",
  financeiro: "Financeiro",
  dashboardfinanceiro: "Dashboard Financeiro",
  financas: "Finanças",
  dre: "DRE",
  aliquotas: "Alíquotas de Impostos",
};

function toLabel(slug: string) {
  return (
    LABEL_MAP[slug] ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (s) => s.toUpperCase())
  );
}

export default function Topbar({
  collapsed,
  onToggleCollapse,
  onMobileMenu,
}: TopbarProps) {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: toLabel(seg),
  }));

  // Ref para animar a seta do botão (rotação)
  const arrowRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    gsap.to(arrowRef.current, {
      rotate: collapsed ? 180 : 0,
      transformOrigin: "50% 50%",
      duration: 0.25,
      ease: "power2.inOut",
    });
  }, [collapsed]);

  return (
    <>
      <header
        className={[
          "fixed top-0 right-0 left-0 z-40 h-16 bg-[#F3F3F3] flex items-center",
          "left-0 md:left-[var(--sidebar-w)]", // acompanha a var no desktop
        ].join(" ")}
      >
        <div className="w-full px-3">
          <div className="flex items-center gap-2">
            {/* Botão mobile (hambúrguer) */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md px-3 py-2 text-sm text-gray-900"
              onClick={onMobileMenu}
              aria-label="Abrir menu"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex-1 flex items-center gap-2 text-sm overflow-hidden"
            >
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 truncate"
              >
                Dashboard
              </Link>
              {crumbs
                .filter((c) => c.href !== "/dashboard")
                .map((c, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <span
                      key={c.href}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <span aria-hidden className="text-gray-400">
                        ›
                      </span>
                      {isLast ? (
                        <span className="font-semibold text-gray-900 truncate">
                          {c.label}
                        </span>
                      ) : (
                        <Link
                          href={c.href}
                          className="text-gray-600 hover:text-gray-900 truncate"
                        >
                          {c.label}
                        </Link>
                      )}
                    </span>
                  );
                })}
            </nav>

            {/* Avatar do usuário */}
            <div className="flex items-center">
              <UserAvatar />
            </div>
          </div>
        </div>
      </header>

      {/* Botão de collapse “meio a meio” (sem background), centralizado verticalmente */}
      <div
        className="hidden md:flex fixed top-0 z-50 h-16 items-center"
        style={{ left: "calc(var(--sidebar-w) - 14px)" }}
      >
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          className="h-7 w-7 rounded-full flex items-center justify-center focus:outline-none"
        >
          {/* ícone/chevron controlado por GSAP */}
          <svg
            ref={arrowRef}
            viewBox="0 0 24 24"
            className="h-5 w-5 text-black"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>
    </>
  );
}
