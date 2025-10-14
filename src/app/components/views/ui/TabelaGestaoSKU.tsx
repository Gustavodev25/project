"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import { useToast } from "./toaster";
import { EmptyState } from "./CardsContas";

// Tipos atualizados para SKU
export interface SKU {
  id: string;
  userId: string;
  sku: string;
  produto: string;
  tipo: "pai" | "filho";
  skuPai?: string;
  custoUnitario: number;
  // Proporção do custo no kit (0.0000 a 1.0000)
  proporcao?: number;
  quantidade: number;
  hierarquia1?: string;
  hierarquia2?: string;
  ativo: boolean;
  temEstoque: boolean;
  skusFilhos?: string[];
  observacoes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  custoHistorico?: SKUCustoHistorico[];
  statusVendas?: StatusVendas;
}

export interface SKUCustoHistorico {
  id: string;
  custoAnterior?: number;
  custoNovo: number;
  quantidade: number;
  motivo?: string;
  tipoAlteracao: string;
  alteradoPor?: string;
  createdAt: string;
}

export interface StatusVendas {
  totalVendas: number;
  totalQuantidadeVendida: number;
  totalValorVendido: number;
  margemMedia: number;
  ultimaVenda?: {
    data: string;
    valor: number;
    quantidade: number;
    plataforma: string;
    status: string;
  };
  statusPorPlataforma: Record<string, {
    vendas: number;
    quantidade: number;
    valor: number;
  }>;
}

export interface CreateSKUInput {
  sku: string;
  produto: string;
  tipo: "pai" | "filho";
  custoUnitario: number;
  quantidade: number;
  skuPai?: string;
  hierarquia1?: string;
  hierarquia2?: string;
  ativo: boolean;
  temEstoque: boolean;
  skusFilhos?: string[];
}

type NovoSkuState = {
  sku: string;
  produto: string;
  tipo: "pai" | "filho";
  skuPai: string;
  custoUnitario: number;
  quantidade: number;
  hierarquia1: string;
  hierarquia2: string;
  ativo: boolean;
  temEstoque: boolean;
  skusFilhos: string[];
};

type PrefillNovoSku = Partial<NovoSkuState>;

interface TabelaGestaoSKUProps {
  skus: SKU[];
  isLoading?: boolean;
  isEditMode?: boolean;
  isMultiSelect?: boolean;
  selectedSKUs?: string[];
  onEditSKU?: (sku: SKU) => void;
  onCreateSKU?: (sku: CreateSKUInput) => Promise<void> | void;
  onDeleteSKU?: (sku: SKU) => void;
  onSelectSKU?: (skuId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onBulkDelete?: (skuIds: string[]) => void;
  onToggleStatus?: (skuIds: string[], ativo: boolean) => void;
  onToggleEstoque?: (skuIds: string[], temEstoque: boolean) => void;
  prefillNovoSku?: PrefillNovoSku;
  onPrefillConsumed?: () => void;
}

export default function TabelaGestaoSKU({
  skus,
  isLoading = false,
  isEditMode = false,
  isMultiSelect = false,
  selectedSKUs = [],
  onEditSKU,
  onCreateSKU,
  onDeleteSKU,
  onSelectSKU,
  onSelectAll,
  onBulkDelete,
  onToggleStatus,
  onToggleEstoque,
  prefillNovoSku,
  onPrefillConsumed,
}: TabelaGestaoSKUProps) {
  const { toast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEstoqueModal, setShowEstoqueModal] = useState(false);
  const [skusToDelete, setSkusToDelete] = useState<string[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const filhosDisponiveis = useMemo(
    () => skus.filter((sku) => sku.tipo === "filho"),
    [skus]
  );

  // Ordena para exibir kits seguidos de seus filhos, e depois individuais sem pai
  const skusOrdenados = useMemo(() => {
    const pais = skus.filter((s) => s.tipo === 'pai');
    const filhos = skus.filter((s) => s.tipo === 'filho');
    const filhosPorPai = new Map<string, SKU[]>();
    for (const f of filhos) {
      if (!f.skuPai) continue;
      if (!filhosPorPai.has(f.skuPai)) filhosPorPai.set(f.skuPai, []);
      filhosPorPai.get(f.skuPai)!.push(f);
    }
    const usados = new Set<string>();
    const resultado: SKU[] = [];
    for (const p of pais) {
      resultado.push(p);
      const filhosDoPai = filhosPorPai.get(p.sku) || [];
      for (const f of filhosDoPai) {
        resultado.push(f);
        usados.add(f.id);
      }
    }
    // Filhos sem pai ou não listados ainda
    for (const f of filhos) {
      if (!usados.has(f.id)) resultado.push(f);
    }
    return resultado;
  }, [skus]);

  // Versão que também leva em conta a lista skusFilhos gravada no kit
  const skusOrdenadosHier = useMemo(() => {
    const pais = skus.filter((s) => s.tipo === 'pai');
    const filhos = skus.filter((s) => s.tipo === 'filho');
    const filhosPorPai = new Map<string, SKU[]>();
    
    for (const f of filhos) {
      if (!f.skuPai) continue;
      if (!filhosPorPai.has(f.skuPai)) filhosPorPai.set(f.skuPai, []);
      filhosPorPai.get(f.skuPai)!.push(f);
    }
    
    const usados = new Set<string>();
    const resultado: SKU[] = [];
    for (const p of pais) {
      resultado.push(p);
      const viaFilho = filhosPorPai.get(p.sku) || [];
      let listaKit: string[] = [];
      const rawSkusFilhos = (p as any).skusFilhos as any;
      if (Array.isArray(rawSkusFilhos)) {
        listaKit = rawSkusFilhos as string[];
      } else if (typeof rawSkusFilhos === 'string') {
        try {
          const parsed = JSON.parse(rawSkusFilhos);
          if (Array.isArray(parsed)) listaKit = parsed as string[];
        } catch {}
      }
      
      const viaKitLista = filhos.filter((f) => listaKit.includes(f.sku));
      const combinados: SKU[] = [];
      const pushUnique = (arr: SKU[]) => {
        for (const item of arr) {
          if (!combinados.find((x) => x.id === item.id)) combinados.push(item);
        }
      };
      pushUnique(viaFilho);
      pushUnique(viaKitLista);
      
      for (const f of combinados.sort((a, b) => a.sku.localeCompare(b.sku))) {
        resultado.push(f);
        usados.add(f.id);
      }
    }
    for (const f of filhos) {
      if (!usados.has(f.id)) resultado.push(f);
    }
    
    return resultado;
  }, [skus]);
  const [novoSku, setNovoSku] = useState<NovoSkuState>({
    sku: "",
    produto: "",
    tipo: "filho",
    skuPai: "",
    custoUnitario: 0,
    quantidade: 1, // Itens individuais sempre começam com quantidade 1
    hierarquia1: "",
    hierarquia2: "",
    ativo: true,
    temEstoque: true, // Sempre true conforme solicitado
    skusFilhos: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const produtoInputRef = useRef<HTMLInputElement>(null);
  const filhosDropdownRef = useRef<HTMLDivElement>(null);
  const [isOpenFilhos, setIsOpenFilhos] = useState(false);
  const [filhosFilter, setFilhosFilter] = useState("");
  const [collapsedKits, setCollapsedKits] = useState<Record<string, boolean>>({});

  // Animações GSAP
  useEffect(() => {
    if (tableRef.current) {
      gsap.fromTo(tableRef.current.querySelectorAll('tbody tr'), 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [skus]);

  useEffect(() => {
    if (!prefillNovoSku) return;
    setNovoSku((prev) => ({
      ...prev,
      ...prefillNovoSku,
      sku: prefillNovoSku.sku ?? prev.sku,
      produto: prefillNovoSku.produto ?? prev.produto,
      tipo: (prefillNovoSku.tipo as ('pai'|'filho')) ?? prev.tipo,
      custoUnitario: prefillNovoSku.custoUnitario ?? prev.custoUnitario,
      quantidade: prefillNovoSku.quantidade ?? prev.quantidade,
      skuPai: prefillNovoSku.skuPai ?? prev.skuPai,
      hierarquia1: prefillNovoSku.hierarquia1 ?? prev.hierarquia1,
      hierarquia2: prefillNovoSku.hierarquia2 ?? prev.hierarquia2,
      ativo: prefillNovoSku.ativo ?? prev.ativo,
      temEstoque: prefillNovoSku.temEstoque ?? prev.temEstoque,
      skusFilhos: prefillNovoSku.skusFilhos ?? prev.skusFilhos,
    }));

    // Foco/scroll para facilitar preenchimento
    skuInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    if (prefillNovoSku.sku && produtoInputRef.current) {
      produtoInputRef.current.focus();
    } else if (skuInputRef.current) {
      skuInputRef.current.focus();
    }

    onPrefillConsumed?.();
  }, [prefillNovoSku, onPrefillConsumed]);

  // Fecha o dropdown de filhos ao clicar fora
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!filhosDropdownRef.current) return;
      if (!filhosDropdownRef.current.contains(e.target as Node)) {
        setIsOpenFilhos(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const resetForm = () => {
    setNovoSku({
      sku: "",
      produto: "",
      tipo: "filho",
      skuPai: "",
      custoUnitario: 0,
      quantidade: 1, // Itens individuais sempre têm quantidade 1
      hierarquia1: "",
      hierarquia2: "",
      ativo: true,
      temEstoque: true, // Sempre true conforme solicitado
      skusFilhos: [],
    });
    setFormErrors({});
  };

  useEffect(() => {
    // Sempre resetar o formulário quando necessário
    resetForm();
  }, []);

  const handleSelectSKU = (skuId: string) => {
    if (!isMultiSelect) return;
    const isSelected = selectedSKUs.includes(skuId);
    onSelectSKU?.(skuId, !isSelected);
  };

  const handleSelectAll = () => {
    if (!isMultiSelect) return;
    const allSelected = selectedSKUs.length === skus.length;
    onSelectAll?.(!allSelected);
  };

  const handleBulkDelete = () => {
    if (selectedSKUs.length === 0) return;
    setSkusToDelete(selectedSKUs);
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = () => {
    onBulkDelete?.(skusToDelete);
    setShowDeleteModal(false);
    setSkusToDelete([]);
    toast({
      variant: "success",
      title: "SKUs excluídos",
      description: `${skusToDelete.length} SKU(s) foram excluídos com sucesso`,
    });
  };

  const handleBulkToggleStatus = (ativo: boolean) => {
    if (selectedSKUs.length === 0) return;
    onToggleStatus?.(selectedSKUs, ativo);
    toast({
      variant: "success",
      title: "Status atualizado",
      description: `${selectedSKUs.length} SKU(s) foram ${ativo ? 'ativados' : 'inativados'}`,
    });
  };

  const handleBulkToggleEstoque = (temEstoque: boolean) => {
    if (selectedSKUs.length === 0) return;
    onToggleEstoque?.(selectedSKUs, temEstoque);
    toast({
      variant: "success",
      title: "Status de estoque atualizado",
      description: `${selectedSKUs.length} SKU(s) foram marcados como ${temEstoque ? 'com estoque' : 'sem estoque'}`,
    });
  };

  const handleFormChange = (
    campo: keyof NovoSkuState,
    valor: string | number | boolean | string[]
  ) => {
    setNovoSku((prev) => {
      const updated = { ...prev, [campo]: valor };
      
      // Quando mudar para "pai" (kit), zera a quantidade
      if (campo === 'tipo') {
        if (valor === 'pai') {
          updated.quantidade = 0;
          updated.skuPai = ''; // Kits não podem ter pai
        } else if (valor === 'filho') {
          updated.quantidade = 1; // Individuais sempre têm quantidade 1
          updated.skusFilhos = []; // Individuais não podem ter filhos
        }
      }
      
      return updated;
    });
    
    if (formErrors[campo as string]) {
      setFormErrors((prev) => ({ ...prev, [campo as string]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!novoSku.sku.trim()) errors.sku = "Informe o SKU";
    if (!novoSku.produto.trim()) errors.produto = "Informe o produto";
    if (Number.isNaN(novoSku.custoUnitario) || novoSku.custoUnitario < 0)
      errors.custoUnitario = "Custo deve ser maior ou igual a 0";
    
    // Validação de quantidade apenas para individuais (filho)
    if (novoSku.tipo === "filho") {
      if (Number.isNaN(novoSku.quantidade) || novoSku.quantidade <= 0)
        errors.quantidade = "Quantidade deve ser maior que 0";
    }

    if (novoSku.tipo === "pai") {
      if (novoSku.skuPai) {
        errors.skuPai = "Um kit não pode ter SKU pai";
      }
      if (novoSku.skusFilhos.length === 0) {
        errors.skusFilhos = "Selecione ao menos um SKU filho";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSku = async () => {
    console.log('handleCreateSku chamado', { novoSku, onCreateSKU: !!onCreateSKU });
    
    if (!onCreateSKU) {
      console.log('onCreateSKU não está definido');
      return;
    }
    
    if (!validateForm()) {
      console.log('Validação falhou', formErrors);
      return;
    }

    try {
      setIsSaving(true);
      console.log('Enviando dados:', {
        sku: novoSku.sku.trim(),
        produto: novoSku.produto.trim(),
        tipo: novoSku.tipo,
        custoUnitario: novoSku.custoUnitario,
        quantidade: novoSku.tipo === 'pai' ? 0 : 1,
        skuPai: novoSku.skuPai.trim() || undefined,
        hierarquia1: novoSku.hierarquia1.trim() || undefined,
        hierarquia2: novoSku.hierarquia2.trim() || undefined,
        ativo: novoSku.ativo,
        temEstoque: true,
        skusFilhos: novoSku.tipo === "pai" && novoSku.skusFilhos.length > 0 ? novoSku.skusFilhos : undefined,
      });
      
      await onCreateSKU({
        sku: novoSku.sku.trim(),
        produto: novoSku.produto.trim(),
        tipo: novoSku.tipo,
        custoUnitario: novoSku.custoUnitario,
        quantidade: novoSku.tipo === 'pai' ? 0 : 1, // Kits não têm quantidade, individuais sempre 1
        skuPai: novoSku.skuPai.trim() || undefined,
        hierarquia1: novoSku.hierarquia1.trim() || undefined,
        hierarquia2: novoSku.hierarquia2.trim() || undefined,
        ativo: novoSku.ativo,
        temEstoque: true, // Sempre true conforme solicitado
        skusFilhos:
          novoSku.tipo === "pai" && novoSku.skusFilhos.length > 0
            ? novoSku.skusFilhos
            : undefined,
      });

      console.log('SKU criado com sucesso');
      // Mensagem de sucesso com informação sobre vínculos criados
      const numFilhos = novoSku.tipo === 'pai' ? novoSku.skusFilhos.length : 0;
      toast({
        variant: "success",
        title: novoSku.tipo === 'pai' ? "Kit criado" : "SKU criado",
        description: novoSku.tipo === 'pai' && numFilhos > 0
          ? `Kit ${novoSku.sku} criado com ${numFilhos} ${numFilhos === 1 ? 'item atrelado' : 'itens atrelados'}`
          : `SKU ${novoSku.sku} adicionado com sucesso`,
      });

      resetForm();
    } catch (error) {
      console.error('Erro ao criar SKU:', error);
      toast({
        variant: "error",
        title: "Erro ao salvar",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o SKU.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (sku: SKU) => {
    if (!sku.ativo) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inativo</span>;
    }
    if (!sku.temEstoque) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Sem Estoque</span>;
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativo</span>;
  };

  const getTipoBadge = (sku: SKU) => {
    if (sku.tipo === 'pai') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Kit</span>;
    }
    // Item filho - verificar se tem pai
    if (sku.skuPai) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Item do Kit</span>;
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Individual Solto</span>;
  };

  // Ícones para o empty state
  const emptyStateIcons = [
    <svg key="1" className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>,
    <svg key="2" className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>,
    <svg key="3" className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
    </svg>
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Barra de ações em lote */}
      {isMultiSelect && selectedSKUs.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800">
                {selectedSKUs.length} SKU(s) selecionado(s)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkToggleStatus(true)}
                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
              >
                Ativar
              </button>
              <button
                onClick={() => handleBulkToggleStatus(false)}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
              >
                Inativar
              </button>
              <button
                onClick={() => handleBulkToggleEstoque(true)}
                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
              >
                Com Estoque
              </button>
              <button
                onClick={() => handleBulkToggleEstoque(false)}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Sem Estoque
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Checkbox para seleção múltipla */}
              {isMultiSelect && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSKUs.length === skus.length && skus.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                </th>
              )}
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Custo Unitário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <span>Quantidade</span>
                  <span 
                    className="text-blue-500 cursor-help" 
                    title="Kits não têm quantidade. Itens individuais sempre têm quantidade 1."
                  >
                    
                  </span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proporção
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hierarquia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
            {true && (
              <tr className="bg-white">
                {isMultiSelect && <th className="px-6 py-2" />}

                {/* SKU */}
                <th className="px-6 py-2">
                  <input
                    type="text"
                    value={novoSku.sku}
                    onChange={(e) => handleFormChange("sku", e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSku(); }}
                    className={`w-full px-2 py-1 border rounded text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      formErrors.sku ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Ex: SKU-123"
                    disabled={isSaving}
                    ref={skuInputRef}
                  />
                </th>

                {/* Produto */}
                <th className="px-6 py-2">
                  <input
                    type="text"
                    value={novoSku.produto}
                    onChange={(e) => handleFormChange("produto", e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSku(); }}
                    className={`w-full px-2 py-1 border rounded text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      formErrors.produto ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nome do produto"
                    disabled={isSaving}
                    ref={produtoInputRef}
                  />
                </th>

                {/* Tipo */}
                <th className="px-6 py-2">
                  <select
                    value={novoSku.tipo}
                    onChange={(e) => handleFormChange("tipo", e.target.value as "pai" | "filho")}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={isSaving}
                  >
                    <option value="filho">Individual</option>
                    <option value="pai">Kit</option>
                  </select>
                </th>

                {/* Status (Ativo / Estoque) */}
                <th className="px-6 py-2">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={novoSku.ativo}
                        onChange={(e) => handleFormChange("ativo", e.target.checked)}
                        className="h-4 w-4 text-orange-600 accent-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        disabled={isSaving}
                      />
                    </label>
                  </div>
                </th>

                {/* Custo unitário */}
                <th className="px-6 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={novoSku.custoUnitario}
                    onChange={(e) => handleFormChange("custoUnitario", parseFloat(e.target.value || '0'))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSku(); }}
                    className={`w-full px-2 py-1 border rounded text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      formErrors.custoUnitario ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0,00"
                    disabled={isSaving}
                  />
                </th>
                {/* Proporção (sempre 100% para SKUs filhos) */}
                <th className="px-6 py-2 text-sm text-gray-400">100%</th>

                {/* Quantidade */}
                <th className="px-6 py-2">
                  {novoSku.tipo === 'pai' ? (
                    <div className="text-sm text-gray-400 text-center">-</div>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      max={1}
                      value={novoSku.quantidade}
                      onChange={(e) => {
                        const val = parseInt(e.target.value || '1', 10);
                        // Sempre força quantidade = 1 para individuais
                        handleFormChange("quantidade", val === 0 ? 1 : 1);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSku(); }}
                      className={`w-full px-2 py-1 border rounded text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        formErrors.quantidade ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="1"
                      disabled={isSaving}
                      readOnly
                      title="Itens individuais sempre têm quantidade 1"
                    />
                  )}
                </th>

                {/* Vendas - não editável ao criar */}
                <th className="px-6 py-2 text-sm text-gray-400">-</th>

                {/* Hierarquia (categoria/subcategoria) */}
                <th className="px-6 py-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={novoSku.hierarquia1}
                      onChange={(e) => handleFormChange("hierarquia1", e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSku(); }}
                      className="w-1/2 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Hierarquia 1"
                      disabled={isSaving}
                    />
                    <input
                      type="text"
                      value={novoSku.hierarquia2}
                      onChange={(e) => handleFormChange("hierarquia2", e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSku(); }}
                      className="w-1/2 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Hierarquia 2"
                      disabled={isSaving}
                    />
                  </div>
                </th>

                {/* Ações: vínculo de kit/individual + salvar */}
                <th className="px-6 py-2">
                  <div className="flex items-start gap-2">
                    {novoSku.tipo === 'filho' ? (
                      <select
                        value={ novoSku.skuPai }
                        onChange={(e) => handleFormChange('skuPai', e.target.value)}
                        className={`min-w-[160px] px-2 py-1 border rounded text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          formErrors.skuPai ? 'border-red-300' : 'border-gray-300'
                        }`}
                        disabled={isSaving}
                      >
                        <option value="">SKU Pai (opcional)</option>
                        {skus
                          .filter((s) => s.tipo === 'pai')
                          .map((s) => (
                            <option key={s.id} value={s.sku}>
                              {s.sku} - {s.produto}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div ref={filhosDropdownRef} className={`relative min-w-[180px] ${isSaving || filhosDisponiveis.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Campo compacto com tags dentro */}
                        <div
                          className="flex items-center flex-wrap gap-1 px-2 py-1 border rounded text-xs bg-white text-gray-900 min-h-[30px] max-h-[60px] overflow-y-auto cursor-pointer"
                          onClick={() => setIsOpenFilhos((v) => !v)}
                        >
                          {novoSku.skusFilhos.length === 0 ? (
                            <span className="text-gray-500">Adicionar SKU(s)</span>
                          ) : (
                            novoSku.skusFilhos.map((filho) => (
                              <span key={filho} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                {filho}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFormChange('skusFilhos', novoSku.skusFilhos.filter((i) => i !== filho));
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  disabled={isSaving}
                                  aria-label={`Remover ${filho}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                          <svg className="ml-auto w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
                        </div>

                        {/* Dropdown de opções */}
                        {isOpenFilhos && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg">
                            <div className="p-1 border-b sticky top-0 bg-white">
                              <input
                                type="text"
                                value={filhosFilter}
                                onChange={(e) => setFilhosFilter(e.target.value)}
                                placeholder="Pesquisar..."
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                                onKeyDown={(e) => { if (e.key === 'Escape') setIsOpenFilhos(false); }}
                              />
                            </div>
                            <ul className="max-h-48 overflow-auto py-1">
                              {filhosDisponiveis
                                .filter((f) => !novoSku.skusFilhos.includes(f.sku))
                                .filter((f) => {
                                  const q = filhosFilter.trim().toLowerCase();
                                  if (!q) return true;
                                  return (
                                    f.sku.toLowerCase().includes(q) ||
                                    f.produto.toLowerCase().includes(q)
                                  );
                                })
                                .map((f) => (
                                  <li
                                    key={f.id}
                                    className="px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      if (!novoSku.skusFilhos.includes(f.sku)) {
                                        handleFormChange('skusFilhos', [...novoSku.skusFilhos, f.sku]);
                                      }
                                    }}
                                  >
                                    <span className="font-mono mr-2">{f.sku}</span>
                                    <span className="text-gray-600">- {f.produto}</span>
                                  </li>
                                ))}
                              {filhosDisponiveis.filter((f) => !novoSku.skusFilhos.includes(f.sku)).length === 0 && (
                                <li className="px-2 py-2 text-xs text-gray-500">Sem opções disponíveis</li>
                              )}
                            </ul>
                            <div className="flex items-center justify-between px-2 py-1 border-t bg-gray-50">
                              <button
                                type="button"
                                onClick={() => handleFormChange('skusFilhos', [])}
                                className="text-xs text-gray-600 hover:text-gray-800"
                                disabled={isSaving || novoSku.skusFilhos.length === 0}
                              >
                                Limpar
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsOpenFilhos(false)}
                                className="text-xs text-orange-600 hover:text-orange-700"
                              >
                                OK
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCreateSku}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      title="Salvar SKU"
                    >
                      {isSaving ? 'Salvando...' : 'Adicionar'}
                    </button>
                  </div>
                </th>
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {skusOrdenadosHier.map((sku) => {
              const isSelected = selectedSKUs.includes(sku.id);
              const isHovered = hoveredRow === sku.id;
              const isHiddenByParent = sku.skuPai ? !!collapsedKits[sku.skuPai] : false;
              if (isHiddenByParent) return null;

              return (
                <tr 
                  key={sku.id} 
                  className={`transition-colors ${
                    isSelected ? 'bg-blue-50' : sku.skuPai ? '' : 'hover:bg-gray-50'
                  } ${sku.skuPai ? 'border-l-4 border-blue-300' : ''}`}
                  onMouseEnter={() => setHoveredRow(sku.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Checkbox de seleção */}
                  {isMultiSelect && (
                    <td className={`px-6 py-4 ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectSKU(sku.id)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </td>
                  )}

                  {/* SKU */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex items-center">
                      {/* Hierarquia Visual */}
                      {sku.tipo === 'pai' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCollapsedKits(prev => ({ ...prev, [sku.sku]: !prev[sku.sku] }))}
                            className="text-orange-500 hover:text-orange-700 transition-colors"
                            title={collapsedKits[sku.sku] ? 'Expandir filhos' : 'Recolher filhos'}
                          >
                            <svg className={`w-5 h-5 transform transition-transform ${collapsedKits[sku.sku] ? '' : 'rotate-90'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                            </svg>
                          </button>
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900">{sku.sku}</span>
                              {(() => {
                                let numFilhos = 0;
                                const rawSkusFilhos = (sku as any).skusFilhos as any;
                                if (Array.isArray(rawSkusFilhos)) {
                                  numFilhos = rawSkusFilhos.length;
                                } else if (typeof rawSkusFilhos === 'string') {
                                  try {
                                    const parsed = JSON.parse(rawSkusFilhos);
                                    if (Array.isArray(parsed)) numFilhos = parsed.length;
                                  } catch {}
                                }
                                if (numFilhos > 0) {
                                  return (
                                    <span 
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                      title={`Este kit contém ${numFilhos} ${numFilhos === 1 ? 'item' : 'itens'}`}
                                    >
                                      {numFilhos} {numFilhos === 1 ? 'item' : 'itens'}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      ) : sku.skuPai ? (
                        <div className="flex items-center gap-2 pl-7">
                          <div className="flex items-center">
                            <div className="w-6 h-px bg-gray-300"></div>
                            <svg className="w-4 h-4 text-blue-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="3"/>
                            </svg>
                          </div>
                          <span className="font-mono text-gray-700">{sku.sku}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <span className="font-mono text-gray-700">{sku.sku}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Produto */}
                  <td className={`px-6 py-4 text-sm ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    <div className={`flex items-center ${sku.skuPai ? 'pl-14' : ''}`}>
                      <div className="max-w-xs">
                        <p className={`truncate ${sku.tipo === 'pai' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {sku.produto}
                        </p>
                        {sku.skuPai && (
                          <p className="text-xs text-blue-600 truncate mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                            </svg>
                            <span>Pertence ao kit: <span className="font-medium">{sku.skuPai}</span></span>
                          </p>
                        )}
                        {sku.observacoes && (
                          <p className="text-xs text-gray-500 truncate mt-1">{sku.observacoes}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className={`px-6 py-4 whitespace-nowrap ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex items-center gap-2">
                      {getTipoBadge(sku)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className={`px-6 py-4 whitespace-nowrap ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    {getStatusBadge(sku)}
                  </td>

                  {/* Custo Unitário */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    <div>
                      <span className="font-medium text-gray-900">{formatCurrency(sku.custoUnitario)}</span>
                      {sku.custoHistorico && sku.custoHistorico.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Última alteração: {formatDate(sku.custoHistorico[0].createdAt)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Quantidade */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    {sku.tipo === 'pai' ? (
                      <span className="text-gray-400" title="Kits não possuem quantidade própria">-</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-900">{sku.quantidade}</span>
                        {sku.quantidade === 1 && (
                          <span className="text-xs text-gray-400" title="Itens individuais sempre têm quantidade 1"></span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Proporção */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    {sku.tipo === 'filho' ? (
                      <span className="text-gray-900 font-medium">100%</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  {/* Vendas */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    {sku.statusVendas ? (
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="font-medium text-gray-900">{sku.statusVendas.totalVendas}</span> vendas
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(sku.statusVendas.totalValorVendido)}
                        </div>
                        {sku.statusVendas.ultimaVenda && (
                          <div className="text-xs text-gray-500">
                            Última: {formatDate(sku.statusVendas.ultimaVenda.data)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  {/* Hierarquia */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    {sku.hierarquia1 && sku.hierarquia2
                      ? `${sku.hierarquia1} > ${sku.hierarquia2}`
                      : sku.hierarquia1 || '-'
                    }
                  </td>

                  {/* Ações */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sku.skuPai ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEditSKU?.(sku)}
                        className="text-orange-600 hover:text-orange-900 transition-colors"
                        title="Editar SKU"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteSKU?.(sku)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Excluir SKU"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {skus.length === 0 && (
        <div className="relative z-20">
          <EmptyState
            title="Nenhum SKU encontrado"
            description="Comece adicionando seu primeiro SKU ou ajuste os filtros para encontrar o que procura."
            icons={emptyStateIcons}
            variant="default"
            size="default"
            theme="light"
            isIconAnimated={true}
            className="w-full min-h-[320px]"
          />
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja excluir {skusToDelete.length} SKU(s)? Esta ação não pode ser desfeita.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBulkDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

