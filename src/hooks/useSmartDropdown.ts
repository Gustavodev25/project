import { useEffect, useRef, useState, useCallback, RefObject } from 'react';

export interface DropdownPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  transform?: string;
}

export interface SmartDropdownOptions {
  isOpen: boolean;
  onClose: () => void;
  preferredPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  offset?: number;
  minDistanceFromEdge?: number;
}

export function useSmartDropdown<T extends HTMLElement = HTMLElement>({
  isOpen,
  onClose,
  preferredPosition = 'bottom-left',
  offset = 8,
  minDistanceFromEdge = 16
}: SmartDropdownOptions) {
  const triggerRef = useRef<T>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<DropdownPosition>({});
  const [isVisible, setIsVisible] = useState(false);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const dropdown = dropdownRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition: DropdownPosition = {};

    // Determinar posição vertical (relativa ao trigger)
    const spaceBelow = viewport.height - trigger.bottom - offset;
    const spaceAbove = trigger.top - offset;
    
    const shouldShowAbove = (preferredPosition.includes('top') || spaceBelow < dropdown.height) 
                          && spaceAbove >= dropdown.height;

    if (shouldShowAbove) {
      // Posicionar acima do trigger
      newPosition.bottom = trigger.height + offset;
    } else {
      // Posicionar abaixo do trigger
      newPosition.top = trigger.height + offset;
    }

    // Determinar posição horizontal (relativa ao trigger)
    const shouldAlignRight = preferredPosition.includes('right');
    
    if (shouldAlignRight) {
      // Alinhar pela direita do trigger
      newPosition.right = 0;
    } else {
      // Alinhar pela esquerda do trigger
      newPosition.left = 0;
    }

    setPosition(newPosition);
  }, [preferredPosition, offset, minDistanceFromEdge]);

  // Recalcular posição quando necessário
  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para garantir que o dropdown está renderizado
      const timer = setTimeout(calculatePosition, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen, calculatePosition]);

  // Recalcular posição no resize da janela
  useEffect(() => {
    if (!isOpen) return;
    
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculatePosition]);

  // Controlar visibilidade com animação
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // Delay para permitir animação de saída
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return {
    triggerRef,
    dropdownRef,
    position,
    isVisible,
    isOpen
  };
}
