"use client";

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from "react";
import gsap from "gsap";
import Sidebar from "./ui/Sidebar";
import Topbar from "./ui/Topbar";
import HeaderGestaoSKU from "./ui/HeaderGestaoSKU";
import FiltrosGestaoSKU, { type FiltrosSKU } from "./ui/FiltrosGestaoSKU";
import TabelaGestaoSKU, {
  type SKU,
  type CreateSKUInput,
} from "./ui/TabelaGestaoSKU";
import SKUsPendentesModal from "./ui/SKUsPendentesModal";
import { ImportExcelModal } from "./ui/ImportExcelModal";
import { useToast } from "./ui/toaster";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

// useLayoutEffect no browser; fallback para useEffect no SSR
const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function GestaoSKU() {
  const { toast } = useToast();
  
  // Estados do layout
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Estados dos SKUs
  const [skus, setSkus] = useState<SKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosSKU>({
    search: '',
    tipo: '',
    ativo: null,
    temEstoque: null,
    hierarquia1: '',
    hierarquia2: '',
    page: 1,
    limit: 25,
  });
  
  // Estados da interface
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedSKUs, setSelectedSKUs] = useState<string[]>([]);
  const [showSKUsPendentes, setShowSKUsPendentes] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // Prefill da linha de criação na tabela
  const [prefillNovoSku, setPrefillNovoSku] = useState<Partial<CreateSKUInput> | null>(null);
  
  // Estados de paginação
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Detecta quando estamos no cliente e carrega estado do localStorage
  useEffect(() => {
    setIsClient(true);
    const savedState = localStorage.getItem(LS_KEY);
    if (savedState === "1") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  // Carregamento inicial dos SKUs
  const loadSKUs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (filtros.search) params.append('search', filtros.search);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.ativo !== null) params.append('ativo', filtros.ativo);
      if (filtros.temEstoque !== null) params.append('temEstoque', filtros.temEstoque);
      if (filtros.hierarquia1) params.append('hierarquia1', filtros.hierarquia1);
      if (filtros.hierarquia2) params.append('hierarquia2', filtros.hierarquia2);
      params.append('page', filtros.page.toString());
      params.append('limit', filtros.limit.toString());

      const response = await fetch(`/api/sku/com-status-vendas?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar SKUs');
      
      const data = await response.json();
      setSkus(data.skus || []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Erro ao carregar SKUs:', error);
      toast({
        variant: "error",
        title: "Erro ao carregar SKUs",
        description: "Não foi possível carregar os SKUs. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filtros, toast]);

  useEffect(() => {
    loadSKUs();
  }, [loadSKUs]);

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

  // Handlers dos filtros
  const handleFiltrosChange = (novosFiltros: FiltrosSKU) => {
    setFiltros(novosFiltros);
  };

  // Handlers do header
  const handleImportExcel = () => {
    setShowImportModal(true);
  };

  const handleImportComplete = () => {
    loadSKUs();
  };

  const handleSKUsCreated = () => {
    loadSKUs();
  };

  const handlePickToCreate = (data: { sku: string; produto: string; custoUnitario?: number }) => {
    // Preenche a linha de criação com dados vindos do modal
    setPrefillNovoSku({
      sku: data.sku,
      produto: data.produto,
      tipo: 'filho',
      custoUnitario: data.custoUnitario ?? 0,
      quantidade: 0,
      ativo: true,
      temEstoque: true,
    });
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.ativo !== null) params.append('ativo', filtros.ativo);

      const response = await fetch(`/api/sku/export?${params}`);
      if (!response.ok) throw new Error('Erro ao exportar');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skus_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        variant: "success",
        title: "Exportação concluída",
        description: "Arquivo Excel foi baixado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        variant: "error",
        title: "Erro na exportação",
        description: "Não foi possível exportar os SKUs",
      });
    }
  };

  const handleSKUsPendentes = () => {
    setShowSKUsPendentes(true);
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setIsMultiSelect(false);
      setSelectedSKUs([]);
    }
  };

  const handleToggleMultiSelect = () => {
    setIsMultiSelect(!isMultiSelect);
    if (!isMultiSelect) {
      setSelectedSKUs([]);
    }
  };

  // Handlers da tabela
  const handleEditSKU = async (sku: SKU) => {
    console.log('Editar SKU:', sku);
  };

  const handleCreateSKU = async (payload: CreateSKUInput) => {
    console.log('handleCreateSKU no componente principal chamado com:', payload);
    
    try {
      const response = await fetch('/api/sku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sku: payload.sku,
          produto: payload.produto,
          tipo: payload.tipo,
          skuPai: payload.skuPai,
          custoUnitario: payload.custoUnitario,
          quantidade: payload.quantidade,
          hierarquia1: payload.hierarquia1,
          hierarquia2: payload.hierarquia2,
          ativo: payload.ativo,
          temEstoque: true, // Sempre true conforme solicitado
          skusFilhos: payload.skusFilhos,
        }),
      });

      console.log('Resposta da API:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        console.error('Erro da API:', error);
        throw new Error(error?.error ?? 'Não foi possível criar o SKU');
      }

      const result = await response.json();
      console.log('SKU criado com sucesso:', result);
      await loadSKUs();
    } catch (error) {
      console.error('Erro ao criar SKU:', error);
      throw error;
    }
  };

  const handleDeleteSKU = async (sku: SKU) => {
    try {
      const response = await fetch(`/api/sku/${sku.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir SKU');
      }
      
      await loadSKUs();
      toast({
        variant: "success",
        title: "SKU excluído",
        description: `SKU ${sku.sku} foi excluído com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao excluir SKU:', error);
      toast({
        variant: "error",
        title: "Erro ao excluir SKU",
        description: error instanceof Error ? error.message : "Não foi possível excluir o SKU",
      });
    }
  };

  const handleSelectSKU = (skuId: string, selected: boolean) => {
    if (selected) {
      setSelectedSKUs(prev => [...prev, skuId]);
    } else {
      setSelectedSKUs(prev => prev.filter(id => id !== skuId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedSKUs(skus.map(sku => sku.id));
    } else {
      setSelectedSKUs([]);
    }
  };

  const handleBulkDelete = async (skuIds: string[]) => {
    try {
      const promises = skuIds.map(id => 
        fetch(`/api/sku/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(promises);
      await loadSKUs();
      setSelectedSKUs([]);
      
      toast({
        variant: "success",
        title: "SKUs excluídos",
        description: `${skuIds.length} SKU(s) foram excluídos com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao excluir SKUs:', error);
      toast({
        variant: "error",
        title: "Erro ao excluir SKUs",
        description: "Não foi possível excluir alguns SKUs",
      });
    }
  };

  const handleToggleStatus = async (skuIds: string[], ativo: boolean) => {
    try {
      const promises = skuIds.map(id => 
        fetch(`/api/sku/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativo }),
        })
      );
      
      await Promise.all(promises);
      await loadSKUs();
      setSelectedSKUs([]);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: "error",
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status dos SKUs",
      });
    }
  };

  const handleToggleEstoque = async (skuIds: string[], temEstoque: boolean) => {
    try {
      const promises = skuIds.map(id => 
        fetch(`/api/sku/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temEstoque }),
        })
      );
      
      await Promise.all(promises);
      await loadSKUs();
      setSelectedSKUs([]);
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      toast({
        variant: "error",
        title: "Erro ao atualizar estoque",
        description: "Não foi possível atualizar o status de estoque dos SKUs",
      });
    }
  };

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
          <HeaderGestaoSKU 
            selectedCategory={selectedCategory || undefined}
            onBackClick={() => setSelectedCategory(null)}
            onImportExcel={handleImportExcel}
            onExportExcel={handleExportExcel}
            isLoading={isLoading}
          />
          
          <FiltrosGestaoSKU
            onFiltrosChange={handleFiltrosChange}
            isLoading={isLoading}
            onSKUsPendentes={handleSKUsPendentes}
            onToggleEditMode={handleToggleEditMode}
            onToggleMultiSelect={handleToggleMultiSelect}
            isEditMode={isEditMode}
            isMultiSelect={isMultiSelect}
            selectedCount={selectedSKUs.length}
          />
          
          <TabelaGestaoSKU
            skus={skus}
            isLoading={isLoading}
            isEditMode={isEditMode}
            isMultiSelect={isMultiSelect}
            selectedSKUs={selectedSKUs}
            onEditSKU={handleEditSKU}
            onCreateSKU={handleCreateSKU}
            onDeleteSKU={handleDeleteSKU}
            onSelectSKU={handleSelectSKU}
            onSelectAll={handleSelectAll}
            onBulkDelete={handleBulkDelete}
            onToggleStatus={handleToggleStatus}
            onToggleEstoque={handleToggleEstoque}
            prefillNovoSku={prefillNovoSku || undefined}
            onPrefillConsumed={() => setPrefillNovoSku(null)}
          />
        </section>
      </main>

      {/* Modais */}
      <SKUsPendentesModal
        isOpen={showSKUsPendentes}
        onClose={() => setShowSKUsPendentes(false)}
        onSKUsCreated={handleSKUsCreated}
        onPickToCreate={handlePickToCreate}
      />

      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
