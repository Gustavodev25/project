"use client";

import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";

// Função para gerar cor RGB baseada no nome do usuário
function generateColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Gerar cores mais vibrantes e legíveis
  const hue = Math.abs(hash) % 360;
  const saturation = 70 + (Math.abs(hash) % 15); // 70-85% - mais saturado
  const lightness = 50 + (Math.abs(hash) % 10); // 50-60% - mais escuro para melhor contraste
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Função para obter a inicial do nome
function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export default function UserAvatar() {
  const { user, logout } = useAuthContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { triggerRef, dropdownRef, position, isVisible, isOpen } = useSmartDropdown<HTMLButtonElement>({
    isOpen: isDropdownOpen,
    onClose: () => setIsDropdownOpen(false),
    preferredPosition: 'bottom-right',
    offset: 12,
    minDistanceFromEdge: 16
  });

  if (!user) {
    return null;
  }

  const backgroundColor = generateColorFromName(user.name);
  const initial = getInitial(user.name);

  return (
    <div className="relative">
      {/* Avatar circular */}
      <button
        ref={triggerRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all focus:outline-none ${
          isDropdownOpen 
            ? "ring-2 ring-gray-400 scale-105" 
            : "hover:ring-2 hover:ring-gray-300 hover:scale-105"
        }`}
        style={{ backgroundColor }}
        title={`${user.name} - ${user.email}`}
      >
        {initial}
      </button>


      {/* Dropdown */}
      {isVisible && (
        <div 
          ref={dropdownRef}
          className={`smart-dropdown w-72 sm:w-64 py-2 ${
            isOpen ? 'dropdown-enter' : 'dropdown-exit'
          }`}
          style={{
            ...position,
            minWidth: '256px'
          }}
        >
          {/* Informações do usuário */}
          <div className="px-4 py-3 border-b border-gray-100/80">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-lg"
                style={{ backgroundColor }}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm animate-pulse"></div>
              <span className="text-xs text-gray-600">Online</span>
            </div>
          </div>

          {/* Ações */}
          <div className="border-t border-gray-100/80 pt-2">
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                logout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50/80 transition-all duration-200 group"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sair
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
