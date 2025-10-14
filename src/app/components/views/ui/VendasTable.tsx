"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { openVendaDetails } from "./VendaDetailsModal";
import { classifyFrete, formatCurrency, formatarFreteShopee } from "@/lib/frete";
import FreteDetailsDropdown from "./FreteDetailsDropdown";

// Tipos para as vendas conforme especificação da API ML
export interface Venda {
  // 1. Dados Básicos da Venda
  id: string; // pedido - ID da venda/pedido
  dataVenda: string; // data - Data da venda
  status: string; // status - Status da venda (paid, cancelled, payment_required)
  conta?: string | null; // conta - Nome da conta ML
  
  // 2. Dados Financeiros
  valorTotal: number; // valor - Valor total da venda
  quantidade: number; // quantidade - Quantidade de itens
  unitario: number; // unit_price - Preço unitário
  taxaPlataforma?: number | null; // taxas - Taxa da plataforma ML
  frete: number; // frete - Valor do frete
  freteAjuste?: number | null; // frete_ajuste - Ajuste de frete calculado pelo banco
  cmv?: number | null; // cmv - Custo da Mercadoria Vendida
  
  // 3. Dados do Produto
  titulo: string; // items[].title - Título do produto
  sku?: string | null; // items[].sku ou items[].seller_sku - SKU do produto
  
  // 4. Dados de Envio
  logisticType?: string | null; // logistic_type - Tipo de logística
  envioMode?: string | null; // envio_mode - Modo de envio
  
  // 4.1. Dados Detalhados do Frete
  freteBaseCost?: number | null; // frete_base_cost - Custo base do frete
  freteListCost?: number | null; // frete_list_cost - Custo listado do frete
  freteFinalCost?: number | null; // frete_final_cost - Custo final do frete
  freteAdjustment?: number | null; // frete_adjustment - Ajuste do frete
  freteCalculation?: any; // frete_calculation - Dados completos do cálculo
  
  // 5. Dados de Anúncio (Internal Tags)
  exposicao?: string | null; // baseado no listing_type_id
  tipoAnuncio?: string | null; // baseado nas tags[]
  ads?: string | null; // "ADS" se tem tag "ads" nas internal_tags, null se não tem
  
  // 6. Dados Raw (JSON Completo)
  raw?: any; // raw - Objeto JSON completo da venda da API ML
  
  // Campos legados mantidos para compatibilidade
  preco: number;
  comprador: string;
  plataforma: string;
  canal: string;
  tags: string[];
  internalTags: string[];
  shippingStatus?: string;
  shippingId?: string;
  margemContribuicao?: number | null;
  isMargemReal?: boolean; // true = margem real (com CMV), false = receita líquida
  
  // Dados de frete detalhados
  shipping: {
    mode?: string;
    cost?: number;
    totalAmount?: number;
    logisticType?: string;
    baseCost?: number;
    finalCost?: number;
    listCost?: number;
    logisticTypeSource?: string | null;
    finalCostSource?: string | null;
    orderCostFallback?: number | null;
    quantity?: number | null;
    unitPrice?: number | null;
    diffBaseList?: number | null;
    adjustedCost?: number | null;
    adjustmentSource?: string | null;
  };
}

export type ProcessedVenda = {
  venda: Venda;
  isCalculating: boolean;
};

interface VendasTableProps {
  vendas: ProcessedVenda[];
  isLoading?: boolean;
  currentPage: number;
  itemsPerPage: number;
  colunasVisiveis?: import('./FiltrosVendas').ColunasVisiveis;
}

// Skeleton para carregamento
function TabelaVendasSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* CSS para ocultar scrollbars */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .table-scroll-container {
            overflow: auto;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE and Edge */
          }
          .table-scroll-container::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `
      }} />
      
      {/* Container com scroll horizontal e vertical - scrollbar oculta */}
      <div className="flex-1 table-scroll-container relative">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {[...Array(16)].map((_, index) => (
                <th key={index} className="px-6 py-3 bg-gray-50">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(10)].map((_, index) => (
              <tr key={index}>
                {[...Array(16)].map((_, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VendasTable({ 
  vendas, 
  isLoading, 
  currentPage, 
  itemsPerPage,
  colunasVisiveis = {
    data: true,
    canal: true,
    conta: true,
    pedido: true, // id venda
    ads: true,
    exposicao: true,
    tipo: true, // tipo de anuncio
    produto: true,
    sku: true,
    quantidade: true,
    unitario: true,
    valor: true, // valor total
    taxa: true, // taxa plataforma
    frete: true,
    cmv: true,
    margem: true, // margem contribuição
  }
}: VendasTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  const paginatedVendas = vendas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Animações da tabela
  useEffect(() => {
    if (!isLoading && paginatedVendas.length > 0 && tableRef.current) {
      const rows = tableRef.current.querySelectorAll("tbody tr");
      
      gsap.set(rows, {
        opacity: 0,
        y: 20,
      });

      gsap.to(rows, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      });
    }
  }, [isLoading, paginatedVendas, currentPage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendente":
        return "bg-yellow-100 text-yellow-800";
      case "Pago":
        return "bg-blue-100 text-blue-800";
      case "Enviado":
        return "bg-purple-100 text-purple-800";
      case "Entregue":
        return "bg-green-100 text-green-800";
      case "Cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return { data: "-", hora: "-" };
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return { data: "-", hora: "-" };
    return {
      data: date.toLocaleDateString("pt-BR"),
      hora: date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })
    };
  };

  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'paid': 'Pago',
      'pago': 'Pago',
      'pending': 'Pendente',
      'pendente': 'Pendente',
      'cancelled': 'Cancelado',
      'cancelado': 'Cancelado',
      'payment_required': 'Pagamento Pendente',
      'waiting_for_payment': 'Aguardando Pagamento',
      'payment_approved': 'Pagamento Aprovado',
      'confirmed': 'Confirmado',
      'delivered': 'Entregue',
      'shipped': 'Enviado',
      'ready_to_ship': 'Pronto para Envio',
      'handling': 'Em Preparação',
      'invoiced': 'Faturado',
    };
    return statusMap[status.toLowerCase()] || status;
  };


  if (isLoading) {
    return <TabelaVendasSkeleton />;
  }

  return (
    <div ref={tableRef} className="h-full flex flex-col">
      {/* CSS para ocultar scrollbars e animação de gradiente */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .table-scroll-container {
            overflow: auto;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE and Edge */
          }
          .table-scroll-container::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
          /* Garantir que dropdowns não sejam cortados */
          .table-scroll-container .smart-dropdown {
            position: fixed !important;
          }
          @keyframes gradient-animation {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          .frete-positivo {
            color: #27ae60; /* Green */
            font-weight: 500;
          }
          .frete-negativo {
            color: #c0392b; /* Red */
            font-weight: 500;
          }
          .negative-value {
            color: #c0392b; /* Red */
            font-weight: 500;
          }
          .frete-neutro {
            color: #6b7280;
            font-weight: 400;
          }
        `
      }} />
      
      {/* Container com scroll horizontal e vertical - scrollbar completamente oculta */}
      <div className="flex-1 table-scroll-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {colunasVisiveis.data && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] bg-gray-50">
                  Data
                </th>
              )}
              {colunasVisiveis.canal && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                  Canal
                </th>
              )}
              {colunasVisiveis.conta && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                  Conta
                </th>
              )}
              {colunasVisiveis.pedido && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                  Id venda
                </th>
              )}
              {colunasVisiveis.ads && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] bg-gray-50">
                  ADS
                </th>
              )}
              {colunasVisiveis.exposicao && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                  Exposição
                </th>
              )}
              {colunasVisiveis.tipo && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                  Tipo de anúncio
                </th>
              )}
              {colunasVisiveis.produto && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] bg-gray-50">
                  Produto
                </th>
              )}
              {colunasVisiveis.sku && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                  SKU
                </th>
              )}
              {colunasVisiveis.quantidade && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                  Quantidade
                </th>
              )}
              {colunasVisiveis.unitario && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                  Unitário
                </th>
              )}
              {colunasVisiveis.valor && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                  Valor total
                </th>
              )}
              {colunasVisiveis.taxa && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                  Taxa plataforma
                </th>
              )}
              {colunasVisiveis.frete && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                  Frete
                </th>
              )}
              {colunasVisiveis.cmv && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                  CMV
                </th>
              )}
              {colunasVisiveis.margem && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] bg-gray-50">
                  Margem contribuição
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedVendas.map((item) => {
              const { venda, isCalculating } = item;
              return (
              <tr key={venda.id} className="hover:bg-gray-50 transition-colors duration-200">
                {/* Data */}
                {colunasVisiveis.data && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">{formatDateTime(venda.dataVenda).data}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(venda.dataVenda).hora}</div>
                    </div>
                  </td>
                )}
                {/* Canal */}
                {colunasVisiveis.canal && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                    <div className="text-sm text-gray-900">
                      {venda.canal || <span className="text-xs text-gray-400">-</span>}
                    </div>
                  </td>
                )}
                {/* Conta */}
                {colunasVisiveis.conta && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                    <div 
                      className="text-sm text-gray-900 cursor-pointer hover:text-orange-600 hover:underline transition-colors duration-200"
                      onClick={() => openVendaDetails(venda)}
                      title="Clique para ver detalhes completos da venda"
                    >
                      {venda.conta ?? "-"}
                    </div>
                  </td>
                )}
                {/* Id venda */}
                {colunasVisiveis.pedido && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                    <div className="text-sm font-mono text-gray-900">{venda.id}</div>
                  </td>
                )}
                {/* ADS - Apenas para Mercado Livre */}
                {colunasVisiveis.ads && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[80px]">
                    {venda.plataforma === "Mercado Livre" ? (
                      <div className="text-sm text-gray-900">
                        {venda.ads === "ADS" ? (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            ADS
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                )}
                {/* Exposição - Apenas para Mercado Livre */}
                {colunasVisiveis.exposicao && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                    {venda.plataforma === "Mercado Livre" ? (
                      <div className="text-sm text-gray-900">
                        {venda.exposicao ? (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            venda.exposicao === 'Premium' ? 'bg-yellow-100 text-yellow-800' :
                            venda.exposicao === 'Clássico' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {venda.exposicao}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                )}
                {/* Tipo de anúncio - Apenas para Mercado Livre */}
                {colunasVisiveis.tipo && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                    {venda.plataforma === "Mercado Livre" ? (
                      <div className="text-sm text-gray-900">
                        {venda.tipoAnuncio ? (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            venda.tipoAnuncio === 'Catálogo' ? 'bg-purple-100 text-purple-800' :
                            venda.tipoAnuncio === 'Próprio' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {venda.tipoAnuncio}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                )}
                {/* Produto */}
                {colunasVisiveis.produto && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                    <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate" title={venda.titulo}>
                      {venda.titulo}
                    </div>
                  </td>
                )}
                {/* SKU */}
                {colunasVisiveis.sku && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                    <div className="text-sm text-gray-900">
                      {venda.sku || <span className="text-xs text-gray-400">-</span>}
                    </div>
                  </td>
                )}
                {/* Quantidade */}
                {colunasVisiveis.quantidade && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                    <div className="text-sm text-gray-900">{venda.quantidade}</div>
                  </td>
                )}
                {/* Unitário */}
                {colunasVisiveis.unitario && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(venda.unitario)}
                    </div>
                  </td>
                )}
                {/* Valor total */}
                {colunasVisiveis.valor && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(venda.valorTotal)}
                    </div>
                  </td>
                )}
                {/* Taxa plataforma */}
                {colunasVisiveis.taxa && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                    <div className="text-sm">
                      {venda.taxaPlataforma ? (
                        <span className="negative-value">
                          {formatCurrency(venda.taxaPlataforma)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                )}
                {/* Frete */}
                {colunasVisiveis.frete && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                    <div className={`transition-all duration-300 ${isCalculating ? 'filter blur-sm' : ''}`}>
                      {isCalculating ? (
                        <div className="flex items-center justify-center">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500"></div>
                        </div>
                      ) : (
                        <FreteDetailsDropdown venda={venda}>
                          <div className="text-sm">
                            {venda.plataforma === "Shopee" ? (
                              (() => {
                                // Usar lógica inteligente para Shopee
                                const shipmentDetails = venda.raw?.shipment_details || {};
                                const paymentDetails = venda.raw?.payment_details || {};
                                const freteData = {
                                  actual_shipping_fee: shipmentDetails.actual_shipping_fee || 0,
                                  shopee_shipping_rebate: shipmentDetails.shopee_shipping_rebate || 0,
                                  buyer_paid_shipping_fee: shipmentDetails.buyer_paid_shipping_fee || 0,
                                  shipping_fee_discount_from_3pl: shipmentDetails.shipping_fee_discount_from_3pl || 0,
                                  reverse_shipping_fee: shipmentDetails.reverse_shipping_fee || 0,
                                  productSubtotal: paymentDetails.product_subtotal || paymentDetails.order_cost || 0,
                                  totalTaxas: paymentDetails.total_taxas || 0,
                                  rendaLiquida: paymentDetails.renda_liquida || 0
                                };
                                
                                const freteFormatado = formatarFreteShopee(freteData);
                                
                                return (
                                  <>
                                    <div className={freteFormatado.className}>
                                      {freteFormatado.valorPrincipal}
                                    </div>
                                    {freteFormatado.mensagemEspecial && (
                                      <div className="text-xs text-green-600 mt-1 font-medium">
                                        🎉 Frete subsidiado!
                                      </div>
                                    )}
                                    <div className="text-xs text-blue-500 mt-1">
                                      Clique para detalhes
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <div className={classifyFrete(venda.frete).className}>
                                  {classifyFrete(venda.frete).displayValue}
                                </div>
                                {venda.logisticType && (
                                  <div className="text-xs text-gray-500 capitalize">
                                    {venda.logisticType.replace(/_/g, ' ')}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </FreteDetailsDropdown>
                      )}
                    </div>
                  </td>
                )}
                {/* CMV */}
                {colunasVisiveis.cmv && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                    <div className="text-sm text-gray-900">
                      {venda.cmv ? (
                        <span className="negative-value">
                          {formatCurrency(venda.cmv)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                )}
                {/* Margem contribuição */}
                {colunasVisiveis.margem && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                    <div className="text-sm text-gray-900">
                      {venda.margemContribuicao !== null && venda.margemContribuicao !== undefined ? (
                        <div>
                          <div className="font-medium">
                            {formatCurrency(venda.margemContribuicao)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {venda.isMargemReal ? "Margem Real" : "Receita Líquida"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
              )}
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
