"use client";

import { Venda } from './VendasTable';
import { classifyFrete, formatCurrency } from '@/lib/frete';
import { useToast } from './toaster';

interface VendaDetailsModalProps {
  venda: Venda;
}

const adjustmentLabels: Record<string, string> = {
  flex_diff: "Diferença base/listado",
  flex_default_low_ticket: "FLEX padrão ticket baixo",
  flex_default_high_ticket: "FLEX padrão ticket alto",
  high_ticket_discount: "Desconto frete ticket alto",
  ticket_below_minimum: "Ticket abaixo do mínimo",
  "Agência": "Ajuste de Agência (ex-xd_drop_off)",
  "FLEX": "Ajuste FLEX (ex-self_service)",
};

export function openVendaDetails(venda: Venda) {
  const tagsHtml = venda.tags?.map((tag: string) => `<span class="tag">${tag}</span>`).join('') || '';
  const internalTagsHtml = venda.internalTags?.map((tag: string) => `<span class="tag internal">${tag}</span>`).join('') || '';
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detalhes da Venda - ${venda.titulo}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 40px 30px;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 400px;
            height: 400px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: -30%;
            left: -5%;
            width: 300px;
            height: 300px;
            background: rgba(255,255,255,0.08);
            border-radius: 50%;
        }
        
        .header-content {
            position: relative;
            z-index: 1;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.95;
            font-weight: 400;
        }
        
        .content {
            padding: 40px 30px;
            background: #fafbfc;
        }
        
        .section {
            margin-bottom: 40px;
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .section:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        
        .section h2 {
            color: #2d3748;
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid transparent;
            background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            position: relative;
        }
        
        .section h2::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }
        
        .info-item {
            background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #f5576c;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .info-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(240, 147, 251, 0.05) 0%, rgba(245, 87, 108, 0.05) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .info-item:hover::before {
            opacity: 1;
        }
        
        .info-item:hover {
            transform: translateX(5px);
            border-left-width: 6px;
            box-shadow: 0 4px 15px rgba(245, 87, 108, 0.15);
        }
        
        .info-item strong {
            display: block;
            color: #4a5568;
            margin-bottom: 8px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
        }
        
        .info-item span {
            color: #1a202c;
            font-size: 18px;
            font-weight: 600;
            position: relative;
            z-index: 1;
        }
        
        .json-container {
            background: #1a202c;
            border-radius: 12px;
            padding: 25px;
            overflow-x: auto;
            position: relative;
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
        }
        
        .json-content {
            color: #e2e8f0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .tag {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin: 4px;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .tag:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .tag.internal {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            box-shadow: 0 2px 8px rgba(240, 147, 251, 0.3);
        }
        
        .tag.internal:hover {
            box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
        }
        
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        
        .status-badge:hover {
            transform: scale(1.05);
        }
        
        .status-ativa { 
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
            color: #065f46;
        }
        .status-pago { 
            background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
            color: #1e40af;
        }
        .status-enviado { 
            background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%);
            color: #6b21a8;
        }
        .status-entregue { 
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            color: #065f46;
        }
        .status-cancelado { 
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            color: #991b1b;
        }
        .status-pendente { 
            background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
            color: #92400e;
        }
        
        .positive { 
            color: #059669; 
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(5, 150, 105, 0.2);
        }
        
        .negative { 
            color: #dc2626; 
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(220, 38, 38, 0.2);
        }
        
        .copy-btn {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 30px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .copy-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(245, 87, 108, 0.4);
        }
        
        .copy-btn:active {
            transform: translateY(0);
        }
        
        @media (max-width: 768px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            body {
                padding: 10px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .content {
                padding: 20px 15px;
            }
            
            .section {
                padding: 20px;
            }
            
            .section h2 {
                font-size: 18px;
            }
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
            }
            
            .copy-btn {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>📦 ${venda.titulo}</h1>
                <p>Detalhes completos da venda • ${venda.plataforma}</p>
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📊 Informações Principais</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>ID da Venda</strong>
                        <span>${venda.id}</span>
                    </div>
                    <div class="info-item">
                        <strong>Conta</strong>
                        <span>${venda.conta || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Quantidade</strong>
                        <span>${venda.quantidade}</span>
                    </div>
                    <div class="info-item">
                        <strong>Preço</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.preco)}</span>
                    </div>
                    <div class="info-item">
                        <strong>Status</strong>
                        <span class="status-badge status-${venda.status.toLowerCase().replace(' ', '-')}">${venda.status}</span>
                    </div>
                    <div class="info-item">
                        <strong>Comprador</strong>
                        <span>${venda.comprador}</span>
                    </div>
                    <div class="info-item">
                        <strong>Data da Venda</strong>
                        <span>${new Date(venda.dataVenda).toLocaleString('pt-BR')}</span>
                    </div>
                    <div class="info-item">
                        <strong>Plataforma</strong>
                        <span>${venda.plataforma}</span>
                    </div>
                </div>
            </div>

            ${venda.tags && venda.tags.length > 0 ? `
            <div class="section">
                <h2>🏷️ Tags</h2>
                <div>
                    ${tagsHtml}
                </div>
            </div>
            ` : ''}

            ${venda.internalTags && venda.internalTags.length > 0 ? `
            <div class="section">
                <h2>🔖 Tags Internas</h2>
                <div>
                    ${internalTagsHtml}
                </div>
            </div>
            ` : ''}

            ${venda.shippingStatus ? `
            <div class="section">
                <h2>📦 Informações de Envio</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Status do Envio</strong>
                        <span class="status-badge">${venda.shippingStatus}</span>
                    </div>
                    ${venda.shippingId ? `
                    <div class="info-item">
                        <strong>ID do Envio</strong>
                        <span>#${venda.shippingId}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            ${venda.shipping && (venda.shipping.finalCost !== undefined || venda.shipping.cost !== undefined || venda.shipping.logisticType) ? `
            <div class="section">
                <h2>💰 Informações de Frete</h2>
                <div class="info-grid">
                    ${venda.shipping.finalCost !== undefined ? `
                    <div class="info-item">
                        <strong>Custo Final do Frete</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.finalCost)}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.baseCost !== undefined ? `
                    <div class="info-item">
                        <strong>Custo Base do Frete</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.baseCost)}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.cost !== undefined ? `
                    <div class="info-item">
                        <strong>Custo do Frete (Fallback)</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.cost)}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.listCost !== undefined ? `
                    <div class="info-item">
                        <strong>Custo Listado</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.listCost)}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.adjustedCost !== undefined ? `
                    <div class="info-item">
                        <strong>Frete Ajustado</strong>
                        <span>${venda.shipping.adjustedCost !== null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.adjustedCost) : 'R$ 0,00'}</span>
                    </div>
                    ` : ''}
                    ${venda.freteAjuste !== undefined && venda.freteAjuste !== null && venda.freteAjuste !== 0 ? `
                    <div class="info-item">
                        <strong>Frete Ajuste (Calculado)</strong>
                        <span class="${venda.freteAjuste > 0 ? 'negative' : venda.freteAjuste < 0 ? 'positive' : ''}">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.freteAjuste)}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.adjustmentSource ? `
                    <div class="info-item">
                        <strong>Motivo do Ajuste</strong>
                        <span>${adjustmentLabels[venda.shipping.adjustmentSource] ?? venda.shipping.adjustmentSource}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.logisticType ? `
                    <div class="info-item">
                        <strong>Tipo Logístico</strong>
                        <span class="status-badge">${venda.shipping.logisticType.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.logisticTypeSource ? `
                    <div class="info-item">
                        <strong>Fonte Tipo Logístico</strong>
                        <span>${venda.shipping.logisticTypeSource === 'shipment' ? 'Shipment' : 'Pedido'}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.finalCostSource ? `
                    <div class="info-item">
                        <strong>Fonte Custo Final</strong>
                        <span>${venda.shipping.finalCostSource === 'shipment' ? 'Shipment' : 'Pedido'}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.mode ? `
                    <div class="info-item">
                        <strong>Modo de Envio</strong>
                        <span>${venda.shipping.mode}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.diffBaseList !== undefined && venda.shipping.diffBaseList !== null ? `
                    <div class="info-item">
                        <strong>Diferença Base - Listado</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.diffBaseList)}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.quantity !== undefined && venda.shipping.quantity !== null ? `
                    <div class="info-item">
                        <strong>Quantidade Consolidada</strong>
                        <span>${venda.shipping.quantity}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.unitPrice !== undefined && venda.shipping.unitPrice !== null ? `
                    <div class="info-item">
                        <strong>Preço Unitário Calculado</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.unitPrice)}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping.totalAmount !== undefined ? `
                    <div class="info-item">
                        <strong>Valor Total do Pedido</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.totalAmount)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            ${venda.margemContribuicao !== null && venda.margemContribuicao !== undefined ? `
            <div class="section">
                <h2>💰 Análise Financeira</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>${venda.isMargemReal ? 'Margem de Contribuição' : 'Receita Líquida'}</strong>
                        <span class="${venda.margemContribuicao >= 0 ? 'positive' : 'negative'}">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.margemContribuicao)}</span>
                    </div>
                    <div class="info-item">
                        <strong>Tipo de Cálculo</strong>
                        <span class="status-badge">${venda.isMargemReal ? 'Margem Real (com CMV)' : 'Receita Líquida (sem CMV)'}</span>
                    </div>
                    ${venda.taxaPlataforma ? `
                    <div class="info-item">
                        <strong>Taxa da Plataforma</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.taxaPlataforma)}</span>
                    </div>
                    ` : ''}
                    ${venda.shipping && venda.shipping.adjustedCost !== undefined && venda.shipping.adjustedCost !== null ? `
                    <div class="info-item">
                        <strong>Ajuste de Frete Aplicado</strong>
                        <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.shipping.adjustedCost)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h2>💻 Dados JSON Completos</h2>
                <button class="copy-btn" onclick="copyToClipboard()">📋 Copiar JSON</button>
                <div class="json-container">
                    <pre class="json-content" id="jsonContent">${JSON.stringify(venda, null, 2)}</pre>
                </div>
            </div>
        </div>
    </div>

    <script>
        function copyToClipboard() {
            const jsonContent = document.getElementById('jsonContent').textContent;
            navigator.clipboard.writeText(jsonContent).then(() => {
                const btn = document.querySelector('.copy-btn');
                const originalText = btn.textContent;
                btn.textContent = '✅ Copiado!';
                btn.style.background = 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                }, 2000);
            }).catch(err => {
                console.error('Erro ao copiar:', err);
                alert('Erro ao copiar para a área de transferência');
            });
        }
    </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  
  // Limpar a URL do blob após um tempo para liberar memória
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function VendaDetailsModal({ venda }: VendaDetailsModalProps) {
  // Este componente pode ser expandido para renderizar um modal em React se necessário
  return null;
}
