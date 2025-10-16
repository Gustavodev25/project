"use client";

import { useEffect, useState } from "react";
import type { FiltroPeriodo } from "./FiltrosDashboard";
import type { FiltroCanal, FiltroStatus } from "./FiltrosDashboardExtra";

interface EstadoData {
  uf: string;
  quantidade: number;
  valor: number;
  percentual: number;
}

interface MapaCalorProps {
  periodoAtivo: FiltroPeriodo;
  dataInicioPersonalizada: Date | null;
  dataFimPersonalizada: Date | null;
  canalAtivo: FiltroCanal;
  statusAtivo: FiltroStatus;
  refreshKey: number;
}

export default function MapaCalorBrasil({
  periodoAtivo,
  dataInicioPersonalizada,
  dataFimPersonalizada,
  canalAtivo,
  statusAtivo,
  refreshKey,
}: MapaCalorProps) {
  const [estados, setEstados] = useState<EstadoData[]>([]);
  const [totals, setTotals] = useState({ vendas: 0, valor: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredEstado, setHoveredEstado] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          periodo: periodoAtivo,
          canal: canalAtivo,
          status: statusAtivo,
        });

        if (periodoAtivo === "personalizado" && dataInicioPersonalizada && dataFimPersonalizada) {
          params.append("dataInicio", dataInicioPersonalizada.toISOString());
          params.append("dataFim", dataFimPersonalizada.toISOString());
        }

        const res = await fetch(`/api/dashboard/vendas-por-estado?${params}`);
        if (res.ok) {
          const data = await res.json();
          setEstados(data.estados || []);
          setTotals(data.totals || { vendas: 0, valor: 0 });
        }
      } catch (error) {
        console.error("[MapaCalorBrasil] Erro ao buscar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [periodoAtivo, dataInicioPersonalizada, dataFimPersonalizada, canalAtivo, statusAtivo, refreshKey]);

  // Função para obter cor baseada na quantidade de vendas
  const getHeatColor = (uf: string): string => {
    const estadoData = estados.find(e => e.uf === uf);
    if (!estadoData || estadoData.quantidade === 0) return "#E5E7EB"; // Cinza claro

    const maxVendas = Math.max(...estados.map(e => e.quantidade));
    const intensidade = estadoData.quantidade / maxVendas;

    // Gradiente de amarelo a vermelho
    if (intensidade >= 0.8) return "#DC2626"; // Vermelho escuro
    if (intensidade >= 0.6) return "#EF4444"; // Vermelho
    if (intensidade >= 0.4) return "#F97316"; // Laranja
    if (intensidade >= 0.2) return "#FBBF24"; // Amarelo
    return "#FDE68A"; // Amarelo claro
  };

  const handleMouseMove = (e: React.MouseEvent, uf: string) => {
    setHoveredEstado(uf);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const estadoHovered = estados.find(e => e.uf === hoveredEstado);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Mapa de Calor - Vendas por Estado</h2>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{totals.vendas}</span> vendas • 
          <span className="font-semibold ml-1">R$ {totals.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Mapa SVG */}
        <div className="flex-1 relative">
          <svg
            viewBox="0 0 600 650"
            className="w-full h-auto"
            style={{ maxHeight: "600px" }}
          >
            {/* Estados do Brasil - SVG simplificado */}
            
            {/* Acre (AC) */}
            <path
              d="M 80 180 L 140 180 L 140 240 L 80 240 Z"
              fill={getHeatColor("AC")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "AC")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="110" y="215" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">AC</text>

            {/* Amazonas (AM) */}
            <path
              d="M 100 80 L 220 80 L 220 180 L 140 180 L 140 150 L 100 150 Z"
              fill={getHeatColor("AM")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "AM")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="160" y="135" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">AM</text>

            {/* Roraima (RR) */}
            <path
              d="M 180 20 L 260 20 L 260 80 L 220 80 L 180 80 Z"
              fill={getHeatColor("RR")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "RR")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="220" y="55" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">RR</text>

            {/* Pará (PA) */}
            <path
              d="M 220 80 L 380 80 L 380 200 L 320 200 L 320 180 L 220 180 Z"
              fill={getHeatColor("PA")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "PA")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="300" y="140" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">PA</text>

            {/* Amapá (AP) */}
            <path
              d="M 380 50 L 440 50 L 440 120 L 380 120 L 380 80 Z"
              fill={getHeatColor("AP")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "AP")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="410" y="90" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">AP</text>

            {/* Maranhão (MA) */}
            <path
              d="M 380 120 L 480 120 L 480 220 L 380 220 L 380 200 Z"
              fill={getHeatColor("MA")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "MA")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="430" y="175" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">MA</text>

            {/* Tocantins (TO) */}
            <path
              d="M 320 200 L 380 200 L 380 310 L 320 310 Z"
              fill={getHeatColor("TO")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "TO")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="350" y="260" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">TO</text>

            {/* Piauí (PI) */}
            <path
              d="M 380 220 L 480 220 L 480 300 L 420 300 L 380 300 L 380 260 Z"
              fill={getHeatColor("PI")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "PI")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="430" y="265" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">PI</text>

            {/* Ceará (CE) */}
            <path
              d="M 480 220 L 560 220 L 560 280 L 480 280 Z"
              fill={getHeatColor("CE")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "CE")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="520" y="255" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">CE</text>

            {/* Rio Grande do Norte (RN) */}
            <path
              d="M 520 280 L 560 280 L 560 310 L 520 310 Z"
              fill={getHeatColor("RN")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "RN")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="540" y="300" fontSize="11" textAnchor="middle" fill="#333" pointerEvents="none">RN</text>

            {/* Paraíba (PB) */}
            <path
              d="M 520 310 L 560 310 L 560 340 L 520 340 Z"
              fill={getHeatColor("PB")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "PB")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="540" y="330" fontSize="11" textAnchor="middle" fill="#333" pointerEvents="none">PB</text>

            {/* Pernambuco (PE) */}
            <path
              d="M 480 300 L 520 300 L 520 350 L 480 350 Z"
              fill={getHeatColor("PE")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "PE")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="500" y="330" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">PE</text>

            {/* Alagoas (AL) */}
            <path
              d="M 520 350 L 550 350 L 550 380 L 520 380 Z"
              fill={getHeatColor("AL")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "AL")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="535" y="370" fontSize="11" textAnchor="middle" fill="#333" pointerEvents="none">AL</text>

            {/* Sergipe (SE) */}
            <path
              d="M 500 380 L 530 380 L 530 410 L 500 410 Z"
              fill={getHeatColor("SE")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "SE")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="515" y="400" fontSize="11" textAnchor="middle" fill="#333" pointerEvents="none">SE</text>

            {/* Bahia (BA) */}
            <path
              d="M 380 310 L 480 310 L 480 430 L 380 430 Z"
              fill={getHeatColor("BA")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "BA")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="430" y="375" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">BA</text>

            {/* Rondônia (RO) */}
            <path
              d="M 140 200 L 200 200 L 200 280 L 140 280 L 140 240 Z"
              fill={getHeatColor("RO")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "RO")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="170" y="245" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">RO</text>

            {/* Mato Grosso (MT) */}
            <path
              d="M 200 200 L 320 200 L 320 340 L 200 340 Z"
              fill={getHeatColor("MT")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "MT")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="260" y="275" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">MT</text>

            {/* Goiás (GO) */}
            <path
              d="M 320 310 L 380 310 L 380 410 L 320 410 Z"
              fill={getHeatColor("GO")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "GO")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="350" y="365" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">GO</text>

            {/* Distrito Federal (DF) */}
            <circle
              cx="360"
              cy="380"
              r="8"
              fill={getHeatColor("DF")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "DF")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="360" y="385" fontSize="10" textAnchor="middle" fill="#333" pointerEvents="none">DF</text>

            {/* Mato Grosso do Sul (MS) */}
            <path
              d="M 200 340 L 300 340 L 300 440 L 200 440 Z"
              fill={getHeatColor("MS")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "MS")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="250" y="395" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">MS</text>

            {/* Minas Gerais (MG) */}
            <path
              d="M 320 410 L 420 410 L 420 490 L 320 490 Z"
              fill={getHeatColor("MG")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "MG")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="370" y="455" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">MG</text>

            {/* Espírito Santo (ES) */}
            <path
              d="M 420 450 L 460 450 L 460 490 L 420 490 Z"
              fill={getHeatColor("ES")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "ES")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="440" y="475" fontSize="11" textAnchor="middle" fill="#333" pointerEvents="none">ES</text>

            {/* Rio de Janeiro (RJ) */}
            <path
              d="M 380 490 L 440 490 L 440 525 L 380 525 Z"
              fill={getHeatColor("RJ")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "RJ")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="410" y="512" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">RJ</text>

            {/* São Paulo (SP) */}
            <path
              d="M 280 490 L 380 490 L 380 545 L 280 545 Z"
              fill={getHeatColor("SP")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "SP")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="330" y="522" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">SP</text>

            {/* Paraná (PR) */}
            <path
              d="M 220 490 L 300 490 L 300 560 L 220 560 Z"
              fill={getHeatColor("PR")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "PR")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="260" y="530" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">PR</text>

            {/* Santa Catarina (SC) */}
            <path
              d="M 220 560 L 300 560 L 300 600 L 220 600 Z"
              fill={getHeatColor("SC")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "SC")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="260" y="585" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">SC</text>

            {/* Rio Grande do Sul (RS) */}
            <path
              d="M 180 600 L 280 600 L 280 630 L 240 630 L 180 630 Z"
              fill={getHeatColor("RS")}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseMove={(e) => handleMouseMove(e, "RS")}
              onMouseLeave={() => setHoveredEstado(null)}
            />
            <text x="230" y="620" fontSize="12" textAnchor="middle" fill="#333" pointerEvents="none">RS</text>
          </svg>

          {/* Tooltip */}
          {hoveredEstado && estadoHovered && (
            <div
              className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none text-sm"
              style={{
                left: tooltipPos.x + 10,
                top: tooltipPos.y + 10,
              }}
            >
              <div className="font-semibold">{hoveredEstado}</div>
              <div>Vendas: {estadoHovered.quantidade}</div>
              <div>Total: R$ {estadoHovered.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-300">{estadoHovered.percentual.toFixed(1)}% do total</div>
            </div>
          )}
        </div>

        {/* Legenda */}
        <div className="w-48 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Intensidade</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: "#DC2626" }}></div>
                <span className="text-xs text-gray-600">Muito alto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: "#EF4444" }}></div>
                <span className="text-xs text-gray-600">Alto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: "#F97316" }}></div>
                <span className="text-xs text-gray-600">Médio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: "#FBBF24" }}></div>
                <span className="text-xs text-gray-600">Baixo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: "#FDE68A" }}></div>
                <span className="text-xs text-gray-600">Muito baixo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded bg-gray-200"></div>
                <span className="text-xs text-gray-600">Sem vendas</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Top 5 Estados</h3>
            <div className="space-y-1">
              {estados.slice(0, 5).map((estado, index) => (
                <div key={estado.uf} className="text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">
                      {index + 1}. {estado.uf}
                    </span>
                    <span className="text-gray-600">{estado.quantidade}</span>
                  </div>
                  <div className="text-gray-500">
                    R$ {estado.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
