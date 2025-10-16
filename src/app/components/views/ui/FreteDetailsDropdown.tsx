"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  formatCurrency,
  formatarFreteShopee,
  detectarSubsidioFrete,
} from "@/lib/frete";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";

interface FreteDetailsDropdownProps {
  venda: {
    frete: number;
    plataforma: string;
    shipmentDetails?: any;
    paymentDetails?: any;
  };
  children: React.ReactNode;
}

export default function FreteDetailsDropdown({
  venda,
  children,
}: FreteDetailsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Usar o hook inteligente de dropdown
  const dropdown = useSmartDropdown<HTMLDivElement>({
    isOpen,
    onClose: () => setIsOpen(false),
    preferredPosition: "bottom-right",
    offset: 8,
    minDistanceFromEdge: 16,
  });

  if (venda.plataforma !== "Shopee") {
    return <>{children}</>;
  }

  // Extrair dados do frete para análise inteligente
  const shipmentDetails = venda.shipmentDetails || {};
  const paymentDetails = venda.paymentDetails || {};

  // Preparar dados para análise de subsídio
  const freteData = {
    actual_shipping_fee: shipmentDetails.actual_shipping_fee || 0,
    shopee_shipping_rebate: shipmentDetails.shopee_shipping_rebate || 0,
    buyer_paid_shipping_fee: shipmentDetails.buyer_paid_shipping_fee || 0,
    shipping_fee_discount_from_3pl:
      shipmentDetails.shipping_fee_discount_from_3pl || 0,
    reverse_shipping_fee: shipmentDetails.reverse_shipping_fee || 0,
    productSubtotal:
      paymentDetails.product_subtotal || paymentDetails.order_cost || 0,
    totalTaxas: paymentDetails.total_taxas || 0,
    rendaLiquida: paymentDetails.renda_liquida || 0,
  };

  // Usar a nova lógica inteligente de detecção de subsídio
  const freteFormatado = formatarFreteShopee(freteData);
  const { isSubsidized, tipoSubsidio } = detectarSubsidioFrete(freteData);

  return (
    <>
      <div
        ref={dropdown.triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer hover:bg-gray-50 rounded px-1 py-1 transition-colors"
      >
        {children}
      </div>

      {dropdown.isVisible && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdown.dropdownRef}
          className={`smart-dropdown w-80 ${
            dropdown.isOpen ? "dropdown-enter" : "dropdown-exit"
          }`}
          style={{
            ...dropdown.position,
            zIndex: 999999, // Z-index extremamente alto para ficar acima de TUDO
            position: "fixed", // Usar fixed para escapar do contexto da tabela
            backgroundColor: "white", // Fundo branco sólido
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", // Sombra mais forte
            border: "1px solid #e5e7eb", // Borda para definir melhor o dropdown
            borderRadius: "0.5rem", // Bordas arredondadas
            pointerEvents: "auto", // Garantir que o dropdown seja clicável
          }}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Detalhes do Frete
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Mensagem especial para frete subsidiado */}
            {freteFormatado.mensagemEspecial && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                <div className="text-xs text-green-800 font-medium">
                  🎉 {freteFormatado.mensagemEspecial}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Custo Real do Frete */}
              <div className="border-l-3 border-blue-500 pl-2">
                <div className="text-xs font-medium text-gray-700">
                  Custo Real
                </div>
                <div className="text-sm font-semibold text-blue-600">
                  {formatCurrency(freteFormatado.detalhes.custoReal)}
                </div>
              </div>

              {/* Breakdown dos Subsídios */}
              {isSubsidized && (
                <div className="space-y-2">
                  {/* Subsídio da Shopee */}
                  {freteFormatado.detalhes.subsidioShopee > 0 && (
                    <div className="border-l-3 border-green-500 pl-2">
                      <div className="text-xs font-medium text-gray-700">
                        Subsídio Shopee
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        -
                        {formatCurrency(freteFormatado.detalhes.subsidioShopee)}
                      </div>
                    </div>
                  )}

                  {/* Pago pelo Comprador */}
                  {freteFormatado.detalhes.pagoComprador > 0 && (
                    <div className="border-l-3 border-purple-500 pl-2">
                      <div className="text-xs font-medium text-gray-700">
                        Pago Comprador
                      </div>
                      <div className="text-sm font-semibold text-purple-600">
                        -{formatCurrency(freteFormatado.detalhes.pagoComprador)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Custo Líquido Final */}
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">
                    Custo Líquido:
                  </span>
                  <span
                    className={`text-sm font-bold ${freteFormatado.className}`}
                  >
                    {freteFormatado.valorPrincipal}
                  </span>
                </div>
                {isSubsidized && (
                  <div className="text-xs text-gray-500 mt-1">
                    Subsídio: {tipoSubsidio}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
