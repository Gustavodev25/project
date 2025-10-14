"use client";

import { useState } from "react";
import { type SKU } from "./TabelaSKU";

interface FormularioSKUInlineProps {
  onAddSKU: (sku: Omit<SKU, 'id' | 'created_at' | 'updated_at'>) => void;
}

export default function FormularioSKUInline({ onAddSKU }: FormularioSKUInlineProps) {
  const [formData, setFormData] = useState({
    sku: '',
    produto: '',
    sku_pai: '',
    tipo: 'filho' as 'pai' | 'filho',
    custo_unitario: 0,
    quantidade: 0,
    hierarquia_1: '',
    hierarquia_2: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    const newErrors: Record<string, string> = {};
    if (!formData.sku.trim()) newErrors.sku = 'SKU é obrigatório';
    if (!formData.produto.trim()) newErrors.produto = 'Nome do produto é obrigatório';
    if (formData.custo_unitario < 0) newErrors.custo_unitario = 'Custo não pode ser negativo';
    if (formData.quantidade < 0) newErrors.quantidade = 'Quantidade não pode ser negativa';
    if (formData.tipo === 'pai' && formData.sku_pai) {
      newErrors.sku_pai = 'SKU pai não pode ter um SKU pai';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Adicionar SKU
    onAddSKU({
      usuario_id: 1, // Em produção viria do contexto de autenticação
      sku: formData.sku.trim(),
      produto: formData.produto.trim(),
      sku_pai: formData.sku_pai.trim() || undefined,
      tipo: formData.tipo,
      custo_unitario: formData.custo_unitario,
      quantidade: formData.quantidade,
      hierarquia_1: formData.hierarquia_1.trim() || undefined,
      hierarquia_2: formData.hierarquia_2.trim() || undefined
    });

    // Reset form
    setFormData({
      sku: '',
      produto: '',
      sku_pai: '',
      tipo: 'filho',
      custo_unitario: 0,
      quantidade: 0,
      hierarquia_1: '',
      hierarquia_2: ''
    });
    setErrors({});
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Novo SKU</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU *
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.sku ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: SKU001"
            />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
          </div>

          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              value={formData.produto}
              onChange={(e) => handleChange('produto', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.produto ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: Smartphone Samsung Galaxy A54"
            />
            {errors.produto && <p className="text-red-500 text-xs mt-1">{errors.produto}</p>}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value as 'pai' | 'filho')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="filho">Individual</option>
              <option value="pai">Kit</option>
            </select>
          </div>

          {/* SKU Pai */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU Pai
            </label>
            <input
              type="text"
              value={formData.sku_pai}
              onChange={(e) => handleChange('sku_pai', e.target.value)}
              disabled={formData.tipo === 'pai'}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                formData.tipo === 'pai' ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${errors.sku_pai ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Ex: KIT001"
            />
            {errors.sku_pai && <p className="text-red-500 text-xs mt-1">{errors.sku_pai}</p>}
          </div>

          {/* Custo Unitário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custo Unitário (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.custo_unitario}
              onChange={(e) => handleChange('custo_unitario', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.custo_unitario ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {errors.custo_unitario && <p className="text-red-500 text-xs mt-1">{errors.custo_unitario}</p>}
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade
            </label>
            <input
              type="number"
              min="0"
              value={formData.quantidade}
              onChange={(e) => handleChange('quantidade', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.quantidade ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {errors.quantidade && <p className="text-red-500 text-xs mt-1">{errors.quantidade}</p>}
          </div>

          {/* Hierarquia 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria Principal
            </label>
            <input
              type="text"
              value={formData.hierarquia_1}
              onChange={(e) => handleChange('hierarquia_1', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ex: Eletrônicos"
            />
          </div>

          {/* Hierarquia 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategoria
            </label>
            <input
              type="text"
              value={formData.hierarquia_2}
              onChange={(e) => handleChange('hierarquia_2', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ex: Smartphones"
            />
          </div>
        </div>

        {/* Botão Adicionar */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Adicionar SKU
          </button>
        </div>
      </form>
    </div>
  );
}
