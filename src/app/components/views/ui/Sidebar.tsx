"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import gsap from "gsap";

type Leaf = { href: string; label: string };
type Branch = {
  slug: "sales" | "finance";
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children: Leaf[];
};
type Item = { href: string; label: string; icon?: React.ReactNode } | Branch;

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose?: () => void;
};

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 20 20"
    className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M5.8 7.5a1 1 0 0 1 1.4 0L10 10.3l2.8-2.8a1 1 0 1 1 1.4 1.4l-3.5 3.5a1 1 0 0 1 -1.4 0L5.8 8.9a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);
const DashboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 13m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M13.45 11.55l2.05 -2.05" />
    <path d="M6.4 20a9 9 0 1 1 11.2 0z" />
  </svg>
);
const SalesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
    <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
  </svg>
);
const TicketIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M15 5l0 2" />
    <path d="M15 11l0 2" />
    <path d="M15 17l0 2" />
    <path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2" />
  </svg>
);
const UsersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
    <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
  </svg>
);
const MoneyBagIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9.5 3h5a1.5 1.5 0 0 1 1.5 1.5a3.5 3.5 0 0 1 -3.5 3.5h-1a3.5 3.5 0 0 1 -3.5 -3.5a1.5 1.5 0 0 1 1.5 -1.5" />
    <path d="M4 17v-1a8 8 0 1 1 16 0v1a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4" />
  </svg>
);

const NAV_ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  {
    slug: "sales",
    label: "Central de Vendas",
    icon: <SalesIcon />,
    href: "/vendas",
    children: [
      { href: "/vendas/geral", label: "Vendas Geral" },
      { href: "/vendas/mercado-livre", label: "Vendas Mercado Livre" },
      { href: "/vendas/shopee", label: "Vendas Shopee" },
    ],
  },
  { href: "/sku", label: "Gestão de SKU", icon: <TicketIcon /> },
  { href: "/contas", label: "Contas de plataforma", icon: <UsersIcon /> },
  {
    slug: "finance",
    label: "Financeiro",
    icon: <MoneyBagIcon />,
    href: "/financeiro",
    children: [
      { href: "/financeiro/financas", label: "Finanças" },
      { href: "/financeiro/dashboard", label: "Dashboard Financeiro" },
      { href: "/financeiro/dre", label: "DRE" },
    ],
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Handle exposto para animar fechamento */
type RailFlyoutHandle = { close: () => Promise<void> };

/** Card (flyout) com animação de abrir/fechar com blur */
const RailFlyoutCard = forwardRef<
  RailFlyoutHandle,
  {
    label: string;
    items: Leaf[];
    top: number;
    left: number;
    activePath: string | null;
    onLinkClick?: () => void;
  }
>(({ label, items, top, left, activePath, onLinkClick }, ref) => {
  const elRef = useRef<HTMLDivElement | null>(null);

  // animação de entrada
  useLayoutEffect(() => {
    if (!elRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(
        elRef.current,
        { y: 6, x: -8, opacity: 0, filter: "blur(8px)", scale: 0.98 },
        {
          y: 0,
          x: 0,
          opacity: 1,
          filter: "blur(0px)",
          scale: 1,
          duration: 0.28,
          ease: "power2.out",
        },
      );
      const items = elRef.current?.querySelectorAll<HTMLAnchorElement>("[data-item]");
      if (items) {
        tl.fromTo(
          items,
          { autoAlpha: 0, y: 6 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.18,
            ease: "power2.out",
          stagger: 0.04,
        },
        "-=0.1",
      );
      }
    }, elRef);
    return () => ctx.revert();
  }, []);

  // expõe animação de saída (com blur)
  useImperativeHandle(ref, () => ({
    close: () =>
      new Promise<void>((resolve) => {
        if (!elRef.current) return resolve();
        const items =
          elRef.current.querySelectorAll<HTMLAnchorElement>("[data-item]");
        const tl = gsap.timeline({
          defaults: { ease: "power2.in" },
          onComplete: resolve,
        });
        // some primeiro os itens
        tl.to(
          items,
          {
            autoAlpha: 0,
            y: 4,
            duration: 0.12,
            stagger: { each: 0.03, from: "end" },
          },
          0,
        );
        // e o card em si com blur
        tl.to(
          elRef.current,
          {
            y: 6,
            x: -8,
            opacity: 0,
            filter: "blur(8px)",
            scale: 0.98,
            duration: 0.22,
          },
          0,
        );
      }),
  }));

  return (
    <div
      ref={elRef}
      className="fixed z-[60] w-72 rounded-2xl border border-gray-200/80 bg-white/70 shadow-xl backdrop-blur-md ring-1 ring-black/5"
      style={{ top, left }}
      role="dialog"
      aria-label={label}
    >
      <div className="absolute -left-2 top-3 h-4 w-4 rotate-45 rounded-sm bg-white/70 border-l border-t border-gray-200/80 backdrop-blur-md" />
      <div className="p-2">
        <div className="px-3 pb-1 text-xs font-medium text-gray-500">
          {label}
        </div>
        <div className="space-y-1 py-1">
          {items.map((leaf) => {
            const active =
              activePath === leaf.href ||
              activePath?.startsWith(leaf.href + "/");
            return (
              <Link
                key={leaf.href}
                href={leaf.href}
                data-item
                onClick={onLinkClick}
                className={[
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {leaf.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
});
RailFlyoutCard.displayName = "RailFlyoutCard";

/** ---------------------------- Sidebar ---------------------------- */
export default function Sidebar({
  collapsed,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  const [open, setOpen] = useState<Record<string, boolean>>({
    sales: false,
    finance: false,
  });
  const submenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const branchBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const asideRef = useRef<HTMLElement | null>(null);

  const [flyout, setFlyout] = useState<{
    slug: Branch["slug"] | null;
    top: number;
    left: number;
    label: string;
    items: Leaf[];
  }>({ slug: null, top: 0, left: 0, label: "", items: [] });

  const flyoutWrapperRef = useRef<HTMLDivElement | null>(null);
  const flyoutCardRef = useRef<RailFlyoutHandle | null>(null);

  // fecha ao navegar + fecha menu mobile
  const closeMobile = useCallback(() => {
    onMobileClose?.();
  }, [onMobileClose]);

  useEffect(() => {
    setFlyout((s) => ({ ...s, slug: null }));
    closeMobile();
  }, [pathname, closeMobile]);

  // abre branch correspondente ao path (modo expandido)
  useEffect(() => {
    const salesActive = pathname?.startsWith("/vendas");
    const financeActive = pathname?.startsWith("/financeiro");
    setOpen((s) => ({ ...s, sales: !!salesActive, finance: !!financeActive }));
  }, [pathname]);

  // estado inicial dos submenus (expandido)
  useLayoutEffect(() => {
    Object.values(submenuRefs.current).forEach((el) => {
      if (!el) return;
      gsap.set(el, {
        height: 0,
        opacity: 0,
        filter: "blur(8px)",
        display: "none",
      });
    });
  }, []);

  // anima abrir/fechar submenus (expandido) com blur também
  useEffect(() => {
    Object.entries(submenuRefs.current).forEach(([key, el]) => {
      if (!el) return;
      const isOpen = open[key];
      if (isOpen) {
        gsap.set(el, {
          display: "block",
          height: "auto",
        });
        const height = el.offsetHeight;
        gsap.fromTo(
          el,
          { height: 0, opacity: 0, filter: "blur(8px)" },
          {
            height,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.25,
            ease: "power1.out",
            onComplete: () => {
              gsap.set(el, { height: "auto" });
            },
          },
        );
      } else {
        gsap.to(el, {
          height: 0,
          opacity: 0,
          filter: "blur(8px)",
          duration: 0.2,
          ease: "power1.in",
          onComplete: () => {
            gsap.set(el, { display: "none" });
          },
        });
      }
    });
  }, [open]);

  // fecha flyout com animação
  const closeFlyout = useCallback(async () => {
    const slug = flyout.slug;
    if (!slug) return;
    try {
      await flyoutCardRef.current?.close();
    } finally {
      setFlyout((s) => ({ ...s, slug: null }));
    }
  }, [flyout.slug]);

  // clique fora + ESC para fechar (com animação)
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        flyout.slug &&
        flyoutWrapperRef.current &&
        !flyoutWrapperRef.current.contains(t) &&
        asideRef.current &&
        !asideRef.current.contains(t)
      ) {
        closeFlyout();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && flyout.slug) closeFlyout();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [flyout.slug, closeFlyout]);

  // reposiciona flyout em resize/scroll
  useEffect(() => {
    const handler = () => {
      if (!flyout.slug) return;
      const btn = branchBtnRefs.current[flyout.slug];
      const asideRect = asideRef.current?.getBoundingClientRect();
      const btnRect = btn?.getBoundingClientRect();
      if (!btnRect || !asideRect) return;
      const GAP = 8;
      const cardH = 280; // aprox. para clamp
      const top = clamp(btnRect.top, 12, window.innerHeight - 12 - cardH);
      setFlyout((s) => ({ ...s, top, left: asideRect.right + GAP }));
    };
    window.addEventListener("resize", handler, { passive: true });
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler);
    };
  }, [flyout.slug]);

  function openFlyoutFor(slug: Branch["slug"]) {
    const btn = branchBtnRefs.current[slug];
    const asideRect = asideRef.current?.getBoundingClientRect();
    const btnRect = btn?.getBoundingClientRect();
    if (!btnRect || !asideRect) return;

    const GAP = 8;
    const node = NAV_ITEMS.find((n): n is Branch => "slug" in n && n.slug === slug);
    if (!node) {
      return;
    }
    const approxCardH = 280;
    setFlyout({
      slug,
      label: node.label,
      items: node.children,
      top: clamp(btnRect.top, 12, window.innerHeight - 12 - approxCardH),
      left: asideRect.right + GAP,
    });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/25 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        ref={asideRef}
        className={[
          "fixed inset-y-0 left-0 z-50 transform bg-[#F3F3F3] transition-transform duration-200 ease-in-out",
          "w-64 md:w-[var(--sidebar-w,16rem)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        aria-label="Barra lateral de navegação"
      >
        <div className="flex h-14 px-3 items-center justify-center">
          <Image
            src="/logopng.webp"
            alt="ContaZoom"
            width={collapsed ? 32 : 180}
            height={collapsed ? 32 : 36}
            className={
              collapsed ? "h-8 w-8 object-contain" : "h-9 w-auto object-contain"
            }
            priority
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
          {NAV_ITEMS.map((item) => {
            if ("href" in item && !("children" in item)) {
              const active =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-base transition-colors",
                    collapsed ? "md:justify-center" : "",
                    active
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-700 hover:bg-gray-50",
                  ].filter(Boolean).join(" ")}
                >
                  <span
                    className={[
                      "shrink-0",
                      active
                        ? "text-gray-700"
                        : "text-gray-500 group-hover:text-gray-600",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={[
                      "truncate sidebar-label",
                      collapsed ? "md:hidden" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            const branch = item as Branch;
            const activeBranch =
              (branch.href &&
                (pathname === branch.href ||
                  pathname?.startsWith(branch.href + "/"))) ||
              branch.children.some((c) => pathname?.startsWith(c.href));
            const isOpen = open[branch.slug];

            return (
              <div key={branch.slug} className="space-y-1.5">
                <button
                  type="button"
                  ref={(el) => {
                    branchBtnRefs.current[branch.slug] = el;
                  }}
                  onClick={() => {
                    if (collapsed && !mobileOpen) {
                      if (flyout.slug === branch.slug) {
                        closeFlyout();
                      } else {
                        setOpen((s) => ({ ...s, [branch.slug]: false }));
                        openFlyoutFor(branch.slug);
                      }
                    } else {
                      setOpen((s) => ({
                        ...s,
                        [branch.slug]: !s[branch.slug],
                      }));
                    }
                  }}
                  className={[
                    "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-base transition-colors",
                    collapsed ? "md:justify-center" : "",
                    activeBranch
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-700 hover:bg-gray-50",
                  ].filter(Boolean).join(" ")}
                  aria-expanded={isOpen}
                  aria-controls={`submenu-${branch.slug}`}
                >
                  <span
                    className={[
                      "shrink-0",
                      activeBranch
                        ? "text-gray-700"
                        : "text-gray-500 group-hover:text-gray-600",
                    ].join(" ")}
                  >
                    {branch.icon}
                  </span>
                  <span
                    className={[
                      "truncate sidebar-label",
                      collapsed ? "md:hidden" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {branch.label}
                  </span>
                  <span
                    className={[
                      "ml-auto text-gray-500 group-hover:text-gray-600",
                      collapsed ? "md:hidden" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <Chevron open={isOpen} />
                  </span>
                </button>

                <div
                  id={`submenu-${branch.slug}`}
                  ref={(el) => {
                    submenuRefs.current[branch.slug] = el;
                  }}
                  className={[
                    "overflow-hidden",
                    collapsed ? "md:hidden" : "",
                  ].filter(Boolean).join(" ")}
                  style={{
                    height: 0,
                    opacity: 0,
                    display: "none",
                    filter: "blur(8px)",
                  }}
                >
                  <div className="pl-9 pr-3 pb-2 pt-0.5 space-y-1">
                    {branch.children.map((leaf) => {
                      const active =
                        pathname === leaf.href ||
                        pathname?.startsWith(leaf.href + "/");
                      return (
                        <Link
                          key={leaf.href}
                          href={leaf.href}
                          className={[
                            "block rounded-md px-2 py-1.5 text-sm",
                            active
                              ? "bg-gray-100 text-gray-900 font-medium"
                              : "text-gray-700 hover:bg-gray-50",
                          ].join(" ")}
                        >
                          {leaf.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* CARD (flyout) para modo collapsed */}
      {collapsed && !mobileOpen && flyout.slug && (
        <div ref={flyoutWrapperRef}>
          <RailFlyoutCard
            ref={flyoutCardRef}
            label={flyout.label}
            items={flyout.items}
            top={flyout.top}
            left={flyout.left}
            activePath={pathname ?? null}
            onLinkClick={() => {
              // navegação acontecerá; não precisamos animar saída aqui
              setFlyout((s) => ({ ...s, slug: null }));
            }}
          />
        </div>
      )}
    </>
  );
}
