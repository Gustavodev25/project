"use client";

import { useState } from "react";
import { type SKU } from "./TabelaSKU";
import { useToast } from "./toaster";
import { EmptyState } from "./CardsContas";

interface TabelaSKUEditavelProps {
  skus: SKU[];
  onAddSKU: (sku: Omit<SKU, 'id' | 'created_at' | 'updated_at'>) => void;
  onEditSKU: (sku: SKU) => void;
  onDeleteSKU: (sku: SKU) => void;
  isLoading?: boolean;
}

export default function TabelaSKUEditavel({ 
  skus, 
  onAddSKU, 
  onEditSKU, 
  onDeleteSKU, 
  isLoading = false 
}: TabelaSKUEditavelProps) {
  const { toast } = useToast();
  
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


  const [novoItem, setNovoItem] = useState({
    sku: '',
    produto: '',
    sku_pai: '',
    tipo: 'filho' as 'pai' | 'filho',
    custo_unitario: 0,
    quantidade: 0,
    hierarquia_1: '',
    hierarquia_2: '',
    skus_filhos: [] as string[] // Para kits, armazena os SKUs filhos selecionados
  });

  const [editandoId, setEditandoId] = useState<number | null>(null);


  const handleAddNew = () => {
    console.log('Dados do novo item:', novoItem);
    
    // Validação
    if (!novoItem.sku.trim()) {
      toast({
        variant: "error",
        title: "Campo obrigatório",
        description: "SKU é obrigatório",
        duration: 4000
      });
      return;
    }

    if (!novoItem.produto.trim()) {
      toast({
        variant: "error",
        title: "Campo obrigatório",
        description: "Nome do produto é obrigatório",
        duration: 4000
      });
      return;
    }

    if (novoItem.custo_unitario < 0) {
      toast({
        variant: "error",
        title: "Valor inválido",
        description: "Custo não pode ser negativo",
        duration: 4000
      });
      return;
    }

    if (novoItem.quantidade < 0) {
      toast({
        variant: "error",
        title: "Valor inválido",
        description: "Quantidade não pode ser negativa",
        duration: 4000
      });
      return;
    }


    if (novoItem.tipo === 'pai' && novoItem.skus_filhos.length === 0) {
      toast({
        variant: "error",
        title: "Kit incompleto",
        description: "Um kit deve ter pelo menos um SKU filho selecionado",
        duration: 4000
      });
      return;
    }

    if (editandoId) {
      // Editar SKU existente
      const skuEditado = skus.find(s => s.id === editandoId);
      if (skuEditado) {
        onEditSKU({
          ...skuEditado,
          sku: novoItem.sku.trim(),
          produto: novoItem.produto.trim(),
          sku_pai: novoItem.sku_pai.trim() || undefined,
          tipo: novoItem.tipo,
          custo_unitario: novoItem.custo_unitario,
          quantidade: novoItem.quantidade,
          hierarquia_1: novoItem.hierarquia_1.trim() || undefined,
          hierarquia_2: novoItem.hierarquia_2.trim() || undefined,
          skus_filhos: novoItem.skus_filhos
        });
      }
    } else {
      // Adicionar novo SKU
      onAddSKU({
        usuario_id: 1,
        sku: novoItem.sku.trim(),
        produto: novoItem.produto.trim(),
        sku_pai: novoItem.sku_pai.trim() || undefined,
        tipo: novoItem.tipo,
        custo_unitario: novoItem.custo_unitario,
        quantidade: novoItem.quantidade,
        hierarquia_1: novoItem.hierarquia_1.trim() || undefined,
        hierarquia_2: novoItem.hierarquia_2.trim() || undefined
      });
    }

    // Mostrar toast de sucesso
    toast({
      variant: "success",
      title: editandoId ? "SKU atualizado" : "SKU adicionado",
      description: `SKU ${novoItem.sku} foi ${editandoId ? 'atualizado' : 'adicionado'} com sucesso`,
      duration: 3000
    });

    // Reset form
    setEditandoId(null);
    setNovoItem({
      sku: '',
      produto: '',
      sku_pai: '',
      tipo: 'filho',
      custo_unitario: 0,
      quantidade: 0,
      hierarquia_1: '',
      hierarquia_2: '',
      skus_filhos: []
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setNovoItem(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSKU = (sku: SKU) => {
    setEditandoId(sku.id);
    setNovoItem({
      sku: sku.sku,
      produto: sku.produto,
      sku_pai: sku.sku_pai || '',
      tipo: sku.tipo,
      custo_unitario: sku.custo_unitario,
      quantidade: sku.quantidade,
      hierarquia_1: sku.hierarquia_1 || '',
      hierarquia_2: sku.hierarquia_2 || '',
      skus_filhos: sku.skus_filhos || []
    });
  };

  const handleCancelEdit = () => {
    setEditandoId(null);
    setNovoItem({
      sku: '',
      produto: '',
      sku_pai: '',
      tipo: 'filho',
      custo_unitario: 0,
      quantidade: 0,
      hierarquia_1: '',
      hierarquia_2: '',
      skus_filhos: []
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                Custo Unitário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hierarquia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKUs Filhos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Linha para adicionar novo item - sempre visível */}
            <tr className="bg-white border-b border-gray-200">
              <td className="px-6 py-4">
                <input
                  type="text"
                  value={novoItem.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm placeholder-gray-600 text-gray-900"
                  placeholder="Ex: SKU001"
                />
              </td>
              <td className="px-6 py-4">
                <input
                  type="text"
                  value={novoItem.produto}
                  onChange={(e) => handleInputChange('produto', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm placeholder-gray-600 text-gray-900"
                  placeholder="Ex: Smartphone Samsung Galaxy A54"
                />
              </td>
              <td className="px-6 py-4">
                <select
                  value={novoItem.tipo}
                  onChange={(e) => handleInputChange('tipo', e.target.value as 'pai' | 'filho')}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                >
                  <option value="filho">Individual</option>
                  <option value="pai">Kit</option>
                </select>
              </td>
              <td className="px-6 py-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoItem.custo_unitario}
                  onChange={(e) => handleInputChange('custo_unitario', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm placeholder-gray-600 text-gray-900"
                  placeholder="Ex: 899.99"
                />
              </td>
              <td className="px-6 py-4">
                <input
                  type="number"
                  min="0"
                  value={novoItem.quantidade}
                  onChange={(e) => handleInputChange('quantidade', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm placeholder-gray-600 text-gray-900"
                  placeholder="Ex: 50"
                />
              </td>
              <td className="px-6 py-4">
                <div className="flex space-x-1">
                  <input
                    type="text"
                    value={novoItem.hierarquia_1}
                    onChange={(e) => handleInputChange('hierarquia_1', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm placeholder-gray-600 text-gray-900"
                    placeholder="Ex: Eletrônicos"
                  />
                  <input
                    type="text"
                    value={novoItem.hierarquia_2}
                    onChange={(e) => handleInputChange('hierarquia_2', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm placeholder-gray-600 text-gray-900"
                    placeholder="Ex: Smartphones"
                  />
                </div>
              </td>
              <td className="px-6 py-4">
                {novoItem.tipo === 'pai' ? (
                  <div className="space-y-2">
                    <select
                      value={novoItem.skus_filhos.length > 0 ? novoItem.skus_filhos[0] : ''}
                      onChange={(e) => {
                        const selectedSku = e.target.value;
                        if (selectedSku && !novoItem.skus_filhos.includes(selectedSku)) {
                          handleInputChange('skus_filhos', [...novoItem.skus_filhos, selectedSku]);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                    >
                      <option value="">Selecione um SKU individual</option>
                      {skus.filter(sku => sku.tipo === 'filho' && !novoItem.skus_filhos.includes(sku.sku)).map(sku => (
                        <option key={sku.id} value={sku.sku}>
                          {sku.sku} - {sku.produto}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={novoItem.sku_pai}
                      onChange={(e) => handleInputChange('sku_pai', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                    >
                      <option value="">Selecione um kit (opcional)</option>
                      {skus.filter(sku => sku.tipo === 'pai').map(sku => (
                        <option key={sku.id} value={sku.sku}>
                          {sku.sku} - {sku.produto}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddNew}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {editandoId ? 'Salvar' : 'Adicionar'}
                  </button>
                  {editandoId && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </td>
            </tr>

            {/* Dados existentes */}
            {skus.length > 0 && (
              (() => {
                // Ordenar SKUs: kits primeiro, depois seus filhos
                const kits = skus.filter(sku => sku.tipo === 'pai');
                const filhos = skus.filter(sku => sku.tipo === 'filho');
                const skusOrdenados: SKU[] = [];
                
                kits.forEach(kit => {
                  skusOrdenados.push(kit);
                  // Adicionar filhos deste kit
                  const filhosDesteKit = filhos.filter(filho => filho.sku_pai === kit.sku);
                  skusOrdenados.push(...filhosDesteKit);
                });
                
                // Adicionar SKUs independentes (filhos sem pai)
                const filhosIndependentes = filhos.filter(filho => !filho.sku_pai);
                skusOrdenados.push(...filhosIndependentes);
                
                return skusOrdenados.map((sku) => (
                <tr key={sku.id} className={`hover:bg-gray-50 ${sku.sku_pai ? 'bg-gray-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className={`flex items-center ${sku.sku_pai ? 'ml-4' : ''}`}>
                      {sku.sku_pai && (
                        <span className="text-gray-400 mr-2">└─</span>
                      )}
                      {sku.sku}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className={`flex items-center ${sku.sku_pai ? 'ml-4' : ''}`}>
                      {sku.sku_pai && (
                        <span className="text-gray-400 mr-2">└─</span>
                      )}
                      {sku.produto}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sku.tipo === 'pai' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {sku.tipo === 'pai' ? 'Kit' : 'Individual'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {sku.custo_unitario.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sku.quantidade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sku.hierarquia_1 && sku.hierarquia_2
                      ? `${sku.hierarquia_1} > ${sku.hierarquia_2}`
                      : sku.hierarquia_1 || '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sku.tipo === 'pai' ? (
                      <div className="flex flex-wrap gap-1">
                        {sku.skus_filhos && sku.skus_filhos.length > 0 ? (
                          sku.skus_filhos.map((filho, index) => (
                            <span 
                              key={index}
                              className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              {filho}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">Nenhum filho</span>
                        )}
                      </div>
                    ) : (
                      <div>
                        {sku.sku_pai ? (
                          <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            {sku.sku_pai}
                          </span>
                        ) : (
                          <span className="text-gray-400">Independente</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditSKU(sku)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDeleteSKU(sku)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
                ));
              })()
            )}
          </tbody>
        </table>
      </div>
      
      {/* Empty State quando não há SKUs */}
      {skus.length === 0 && (
        <div className="relative z-20">
          <EmptyState
            title="Nenhum SKU encontrado"
            description="Comece preenchendo os campos acima e clique em 'Adicionar' para criar seu primeiro SKU."
            icons={emptyStateIcons}
            variant="default"
            size="default"
            theme="light"
            isIconAnimated={true}
            className="w-full min-h-[320px]"
          />
        </div>
      )}
      
      {/* Mensagem informativa */}
      <div className="bg-blue-50 border-t border-blue-200 px-6 py-3 relative z-10 transform translate-y-0 transition-all duration-500 ease-out animate-slide-down">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            <span className="font-medium">Importante:</span> Os SKUs atrelados a kits influenciarão nos cálculos do dashboard e relatórios de vendas.
          </p>
        </div>
      </div>
    </div>
  );
}
