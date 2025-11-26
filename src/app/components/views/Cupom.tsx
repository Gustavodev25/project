"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Sidebar from "./ui/Sidebar";
import Topbar from "./ui/Topbar";
import HeaderCupom from "./ui/HeaderCupom";
import Modal from "./ui/Modal";
import { useToast } from "./ui/toaster";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Cupom() {
  const { toast } = useToast();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Sync with localStorage after hydration
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === "1") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"valor" | "percentual">("valor");
  const [value, setValue] = useState<string>("");
  const [validFrom, setValidFrom] = useState<string>("");
  const [validTo, setValidTo] = useState<string>("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasInitialSet = useRef(false);
  useIsoLayout(() => {
    if (hasInitialSet.current) return;
    const el = containerRef.current;
    if (!el) return;
    hasInitialSet.current = true;
    gsap.set(el, { css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W } });
  }, [isSidebarCollapsed]);

  useIsoLayout(() => {
    const el = containerRef.current;
    if (!el) return;
    gsap.to(el, {
      duration: 0.35,
      ease: "power2.inOut",
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, isSidebarCollapsed ? "1" : "0");
    } catch {}
  }, [isSidebarCollapsed]);

  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  const resetForm = () => {
    setCode("");
    setDiscountType("valor");
    setValue("");
    setValidFrom("");
    setValidTo("");
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = Number(value);
    if (!code.trim()) {
      toast({ variant: "error", title: "Código obrigatório", description: "Informe o código do cupom." });
      return;
    }
    if (!value || isNaN(numVal) || numVal <= 0) {
      toast({ variant: "error", title: "Valor inválido", description: "Informe um valor maior que zero." });
      return;
    }
    if (discountType === "percentual" && (numVal <= 0 || numVal > 100)) {
      toast({ variant: "error", title: "Percentual inválido", description: "Use um percentual entre 1% e 100%." });
      return;
    }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast({ variant: "success", title: "Cupom criado", description: "Seu cupom foi configurado com sucesso." });
      setIsModalOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

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

      <div className={`fixed top-16 bottom-0 left-0 right-0 ${mdLeftVar} z-10 bg-[#F3F3F3]`}>
        <div className="h-full w-full rounded-tl-none md:rounded-tl-2xl border border-gray-200 bg-white" />
      </div>

      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          <HeaderCupom onNew={handleOpenModal} />

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600">
              Crie e gerencie cupons para oferecer descontos em compras de créditos. Esta página está oculta do menu e acessível diretamente pela rota {"/cupom"}.
            </p>
          </div>
        </section>
      </main>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Criar novo cupom" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Código do cupom</label>
            <input
              id="code"
              name="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: CREDITO10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 uppercase"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <span className="block text-sm font-medium text-gray-700 mb-1">Tipo de desconto</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="discountType"
                    value="valor"
                    checked={discountType === "valor"}
                    onChange={() => setDiscountType("valor")}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  Valor (R$)
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="discountType"
                    value="percentual"
                    checked={discountType === "percentual"}
                    onChange={() => setDiscountType("percentual")}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  Percentual (%)
                </label>
              </div>
            </div>

            <div className="md:col-span-1">
              <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">{discountType === "valor" ? "Valor em reais" : "Percentual de desconto"}</label>
              <div className="relative">
                {discountType === "valor" && (
                  <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">R$</span>
                )}
                <input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  max={discountType === "percentual" ? 100 : undefined}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={discountType === "valor" ? "Ex: 10,00" : "Ex: 10"}
                  className={`w-full ${discountType === "valor" ? "pl-10" : "pl-3"} pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900`}
                  required
                />
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                />
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Opcional. Deixe em branco para uso imediato e sem data final.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors text-white ${saving ? "bg-orange-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}`}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
