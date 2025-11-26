"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "./CardsContas";

// Tipos para SKU
export interface SKU {
  id: number;
  usuario_id: number;
  sku: string;
  produto: string;
  sku_filho?: string;
  sku_pai?: string;
  tipo: "pai" | "filho";
  custo_unitario: number;
  proporcao?: number;
  quantidade: number;
  hierarquia_1?: string;
  hierarquia_2?: string;
  skus_filhos?: string[]; // Para kits, lista dos SKUs filhos
  created_at: string;
  updated_at: string;
}

interface TabelaSKUProps {
  isLoading?: boolean;
  skus?: SKU[];
  onAddSKU?: () => void;
  onEditSKU?: (sku: SKU) => void;
  onDeleteSKU?: (sku: SKU) => void;
}

// Componente da tabela de SKUs
function SKUTable({ 
  skus, 
  isLoading, 
  onEditSKU, 
  onDeleteSKU 
}: { 
  skus: SKU[]; 
  isLoading: boolean;
  onEditSKU?: (sku: SKU) => void;
  onDeleteSKU?: (sku: SKU) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
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
              Proporção
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantidade
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hierarquia
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {skus.map((sku) => (
            <tr key={sku.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {sku.sku}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {sku.produto}
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
                {sku.tipo === 'filho' && sku.proporcao != null
                  ? `${(Number(sku.proporcao) * 100).toFixed(2)}%`
                  : '-'}
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
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEditSKU?.(sku)}
                    className="text-orange-600 hover:text-orange-900"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDeleteSKU?.(sku)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Componente de paginação
function SKUPagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void; 
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center">
        <p className="text-sm text-gray-700">
          Página {currentPage} de {totalPages}
        </p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Anterior
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}

// Ícones para o empty state
const emptyStateIcons = [
  <svg key="1" className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>,
  <svg key="2" className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>,
  <svg key="3" className="w-4 h-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
  </svg>
];

// Botão de ação para o empty state
function EmptyStateActionButton({ onAddSKU }: { onAddSKU?: () => void }) {
  return (
    <button
      onClick={onAddSKU}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Adicionar SKU
    </button>
  );
}

export default function TabelaSKU({ 
  isLoading = false, 
  skus = [], 
  onAddSKU,
  onEditSKU,
  onDeleteSKU 
}: TabelaSKUProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.ceil(skus.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const skusPaginados = skus.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {skus.length === 0 ? (
        <div className="relative">
          <EmptyState
            title="Nenhum SKU encontrado"
            description="Comece adicionando seu primeiro SKU para gerenciar seus produtos."
            icons={emptyStateIcons}
            footer={<EmptyStateActionButton onAddSKU={onAddSKU} />}
            variant="default"
            size="default"
            theme="light"
            isIconAnimated={true}
            className="w-full min-h-[320px]"
          />
        </div>
      ) : (
        <div className="flex flex-col h-[600px]">
          <div className="flex-1 min-h-0">
            <SKUTable 
              skus={skusPaginados}
              isLoading={isLoading}
              onEditSKU={onEditSKU}
              onDeleteSKU={onDeleteSKU}
            />
          </div>
          <div className="border-t border-gray-200 bg-white">
            <SKUPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
