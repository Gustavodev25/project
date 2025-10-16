"use client";

import { useState } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";

interface HeaderGestaoSKUProps {
  selectedCategory?: string;
  onBackClick?: () => void;
  onImportExcel?: () => void;
  onExportExcel?: () => void;
  onSKUsPendentes?: () => void;
  onNovoSKU?: () => void;
  isLoading?: boolean;
}

export default function HeaderGestaoSKU({ 
  selectedCategory, 
  onBackClick,
  onImportExcel,
  onExportExcel,
  onSKUsPendentes,
  onNovoSKU,
  isLoading = false
}: HeaderGestaoSKUProps) {
  const [showExcelDropdown, setShowExcelDropdown] = useState(false);

  const excelDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showExcelDropdown,
    onClose: () => setShowExcelDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  if (selectedCategory) {
    return (
      <div className="mb-6 text-left">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            SKUs - {selectedCategory}
          </h1>
          <button
            onClick={onBackClick}
            className="text-orange-600 hover:text-orange-800 text-sm font-medium flex items-center justify-center gap-2 px-3 py-2 rounded-md hover:bg-orange-50 transition-colors h-10"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M5 12l14 0" />
              <path d="M5 12l4 4" />
              <path d="M5 12l4 -4" />
            </svg>
            Voltar
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600 text-left">
          Gerencie os SKUs da categoria {selectedCategory}.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-gray-900">Gestão de SKU</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie seus produtos e SKUs de forma centralizada.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-3">
          {/* Botão Novo SKU */}
          <button
            onClick={onNovoSKU}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14m-7-7h14"/>
            </svg>
            <span>Novo SKU</span>
          </button>

          {/* Botão SKUs Pendentes */}
          <button
            onClick={onSKUsPendentes}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-yellow-500 bg-yellow-50 text-yellow-900 text-sm font-medium hover:bg-yellow-100 transition-all duration-200"
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>SKUs Pendentes</span>
          </button>

          {/* Botão Excel */}
          <div className="relative">
          <button
            ref={excelDropdown.triggerRef}
            onClick={() => setShowExcelDropdown(!showExcelDropdown)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
              showExcelDropdown 
                ? "border-gray-400 bg-gray-50 text-gray-900" 
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            }`}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Excel</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${showExcelDropdown ? 'rotate-180' : ''}`}
            >
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </button>

          {excelDropdown.isVisible && (
            <div 
              ref={excelDropdown.dropdownRef}
              className={`smart-dropdown w-48 ${
                excelDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
              }`}
              style={excelDropdown.position}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onImportExcel?.();
                    setShowExcelDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Importar Excel
                </button>
                <button
                  onClick={() => {
                    onExportExcel?.();
                    setShowExcelDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar Excel
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
