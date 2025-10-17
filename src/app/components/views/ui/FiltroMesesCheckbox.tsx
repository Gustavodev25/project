"use client";

import { useState, useMemo } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";

interface FiltroMesesCheckboxProps {
  mesesSelecionados: Set<string>; // formato: "YYYY-MM"
  onMesesChange: (meses: Set<string>) => void;
}

export default function FiltroMesesCheckbox({
  mesesSelecionados,
  onMesesChange,
}: FiltroMesesCheckboxProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showDropdown,
    onClose: () => setShowDropdown(false),
    preferredPosition: "bottom-right",
    offset: 8,
    minDistanceFromEdge: 16,
  });

  // Gerar lista de meses (últimos 24 meses)
  const mesesDisponiveis = useMemo(() => {
    const hoje = new Date();
    const meses: Array<{ key: string; label: string; ano: number; mes: number }> = [];

    for (let i = 0; i < 24; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = data.getFullYear();
      const mes = data.getMonth() + 1;
      const key = `${ano}-${String(mes).padStart(2, "0")}`;
      const label = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      meses.push({ key, label, ano, mes });
    }

    return meses;
  }, []);

  const toggleMes = (key: string) => {
    const next = new Set(mesesSelecionados);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onMesesChange(next);
  };

  const selecionarUltimos12Meses = () => {
    const ultimos12 = new Set(mesesDisponiveis.slice(0, 12).map(m => m.key));
    onMesesChange(ultimos12);
    setShowDropdown(false);
  };

  const selecionarUltimos6Meses = () => {
    const ultimos6 = new Set(mesesDisponiveis.slice(0, 6).map(m => m.key));
    onMesesChange(ultimos6);
    setShowDropdown(false);
  };

  const selecionarMesAtual = () => {
    const mesAtual = new Set([mesesDisponiveis[0].key]);
    onMesesChange(mesAtual);
    setShowDropdown(false);
  };

  const selecionarTodos = () => {
    const todos = new Set(mesesDisponiveis.map(m => m.key));
    onMesesChange(todos);
    setShowDropdown(false);
  };

  const limpar = () => {
    onMesesChange(new Set());
    setShowDropdown(false);
  };

  // Texto do botão
  const getTextoFiltro = (): string => {
    const total = mesesSelecionados.size;
    if (total === 0) return "Selecionar Meses";
    if (total === 1) {
      const mesKey = Array.from(mesesSelecionados)[0];
      const mes = mesesDisponiveis.find(m => m.key === mesKey);
      return mes?.label || "1 mês";
    }
    return `${total} meses`;
  };

  return (
    <div className="relative">
      <button
        ref={dropdown.triggerRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
          showDropdown
            ? "border-gray-400 bg-gray-50 text-gray-900"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>{getTextoFiltro()}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}>
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      {dropdown.isVisible && (
        <div
          ref={dropdown.dropdownRef}
          className={`smart-dropdown w-80 ${dropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
          style={dropdown.position}
        >
          <div className="p-2">
            {/* Ações rápidas */}
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-gray-200">
              <button
                onClick={selecionarMesAtual}
                className="text-xs px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
              >
                Mês Atual
              </button>
              <button
                onClick={selecionarUltimos6Meses}
                className="text-xs px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
              >
                Últimos 6 meses
              </button>
              <button
                onClick={selecionarUltimos12Meses}
                className="text-xs px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
              >
                Últimos 12 meses
              </button>
              <button
                onClick={selecionarTodos}
                className="text-xs px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
              >
                Todos (24 meses)
              </button>
            </div>

            {/* Ações de seleção */}
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-xs font-medium text-gray-700">
                {mesesSelecionados.size} de {mesesDisponiveis.length} selecionados
              </span>
              <button
                onClick={limpar}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Limpar
              </button>
            </div>

            {/* Lista de meses */}
            <div className="max-h-80 overflow-y-auto mt-1 space-y-1">
              {mesesDisponiveis.map((mes) => (
                <label
                  key={mes.key}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    checked={mesesSelecionados.has(mes.key)}
                    onChange={() => toggleMes(mes.key)}
                  />
                  <span className="text-gray-700 capitalize">{mes.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
