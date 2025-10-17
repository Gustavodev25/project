import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

type MesInfo = { key: string; label: string; ano: number; mes: number };

function parseMesKey(key: string): { start: Date; end: Date; ano: number; mes: number } | null {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(key);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null;
  const start = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const end = new Date(ano, mes, 0, 23, 59, 59, 999);
  return { start, end, ano, mes };
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(ano: number, mes: number): string {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

function isCMVCategory(nome?: string | null, descricao?: string | null): boolean {
  const s = `${nome || ""} ${descricao || ""}`.toLowerCase();
  return s.includes("cmv") || s.includes("cpv") || s.includes("csp");
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  let session;
  try {
    session = await assertSessionToken(sessionCookie);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const mesesParam = (url.searchParams.get("meses") || "").split(",").map(s => s.trim()).filter(Boolean);
    const categoriasParam = (url.searchParams.get("categorias") || "").split(",").map(s => s.trim()).filter(Boolean);
    const tipoParam = (url.searchParams.get("tipo") || "competencia").toLowerCase() as 'caixa' | 'competencia';

    console.log('[DRE API] ===== INÍCIO DA REQUISIÇÃO =====');
    console.log('[DRE API] Usuário:', session.sub);
    console.log('[DRE API] Meses solicitados:', mesesParam);
    console.log('[DRE API] Categorias filtradas:', categoriasParam.length > 0 ? categoriasParam : 'TODAS');
    console.log('[DRE API] Tipo de visualização:', tipoParam);

    if (mesesParam.length === 0) {
      return NextResponse.json({ error: "Meses não informados" }, { status: 400 });
    }

    // Build month windows
    const parsed = mesesParam.map(parseMesKey).filter(Boolean) as Array<{ start: Date; end: Date; ano: number; mes: number }>;
    if (parsed.length === 0) {
      return NextResponse.json({ error: "Meses inválidos" }, { status: 400 });
    }
    // Sort ascending by ano/mes
    parsed.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
    const meses: MesInfo[] = parsed.map(({ ano, mes }) => ({
      key: `${ano}-${String(mes).padStart(2, "0")}`,
      label: monthLabel(ano, mes),
      ano,
      mes,
    }));

    const rangeStart = parsed[0].start;
    const rangeEnd = parsed[parsed.length - 1].end;

    // Load categorias de despesa do usuário (limitadas às selecionadas se houver filtro)
    const whereCategoria: any = { userId: session.sub };
    if (categoriasParam.length > 0) whereCategoria.id = { in: categoriasParam };
    const categorias = await prisma.categoria.findMany({
      where: whereCategoria,
      select: { id: true, nome: true, descricao: true, tipo: true },
    });
    console.log('[DRE API] Categorias encontradas no banco:', categorias.length);
    
    // Focar em DESPESA para o DRE (lista de categorias para tabela)
    const categoriasDespesa = categorias.filter(c => (c.tipo || "").toUpperCase() === "DESPESA");
    const categoriaIdsDespesa = new Set(categoriasDespesa.map(c => c.id));
    console.log('[DRE API] Categorias de DESPESA:', categoriasDespesa.length);

    // Definir critérios de data baseado no tipo de visualização
    // Por enquanto, ambos usam a mesma lógica (dataPagamento/dataRecebimento)
    // No futuro, caixa usará dataPagamento e competência usará dataVencimento
    const getDateCriteria = (tipo: 'caixa' | 'competencia') => {
      if (tipo === 'caixa') {
        // Caixa: usar data de pagamento/recebimento (efetivo)
        return {
          pagar: [
            { dataPagamento: { gte: rangeStart, lte: rangeEnd } },
            { AND: [{ dataPagamento: null }, { dataVencimento: { gte: rangeStart, lte: rangeEnd } }] },
          ],
          receber: [
            { dataRecebimento: { gte: rangeStart, lte: rangeEnd } },
            { AND: [{ dataRecebimento: null }, { dataVencimento: { gte: rangeStart, lte: rangeEnd } }] },
          ],
        };
      } else {
        // Competência: usar data de vencimento (competência)
        return {
          pagar: [
            { dataVencimento: { gte: rangeStart, lte: rangeEnd } },
          ],
          receber: [
            { dataVencimento: { gte: rangeStart, lte: rangeEnd } },
          ],
        };
      }
    };

    const dateCriteria = getDateCriteria(tipoParam);

    // ============================================
    // BUSCAR VENDAS (Mercado Livre + Shopee)
    // ============================================
    // IMPORTANTE: Buscar TODAS as vendas (incluindo canceladas) para o DRE
    // Canceladas vão para "DEDUÇÕES DA RECEITA BRUTA"
    const [vendasMeli, vendasShopee] = await Promise.all([
      prisma.meliVenda.findMany({
        where: {
          userId: session.sub,
          dataVenda: { gte: rangeStart, lte: rangeEnd }
        },
        select: {
          valorTotal: true,
          taxaPlataforma: true,
          frete: true,
          quantidade: true,
          sku: true,
          dataVenda: true,
          status: true
        },
        distinct: ['orderId'],
      }),
      prisma.shopeeVenda.findMany({
        where: {
          userId: session.sub,
          dataVenda: { gte: rangeStart, lte: rangeEnd }
        },
        select: {
          valorTotal: true,
          taxaPlataforma: true,
          frete: true,
          quantidade: true,
          sku: true,
          dataVenda: true,
          status: true
        },
        distinct: ['orderId'],
      }),
    ]);

    // Separar vendas confirmadas vs canceladas
    const isCanceled = (status?: string | null) =>
      status ? status.toLowerCase().includes('cancel') : false;

    const vendasMeliConfirmadas = vendasMeli.filter(v => !isCanceled(v.status));
    const vendasMeliCanceladas = vendasMeli.filter(v => isCanceled(v.status));
    const vendasShopeeConfirmadas = vendasShopee.filter(v => !isCanceled(v.status));
    const vendasShopeeCanceladas = vendasShopee.filter(v => isCanceled(v.status));

    const todasVendasConfirmadas = [...vendasMeliConfirmadas, ...vendasShopeeConfirmadas];
    const todasVendasCanceladas = [...vendasMeliCanceladas, ...vendasShopeeCanceladas];

    console.log('[DRE API] Vendas encontradas:', {
      mercadoLivre: { confirmadas: vendasMeliConfirmadas.length, canceladas: vendasMeliCanceladas.length },
      shopee: { confirmadas: vendasShopeeConfirmadas.length, canceladas: vendasShopeeCanceladas.length }
    });

    // Buscar custos dos SKUs para calcular CMV (apenas vendas confirmadas)
    const skusUnicos = Array.from(new Set(todasVendasConfirmadas.map(v => v.sku).filter((s): s is string => Boolean(s))));
    const skuCustos = skusUnicos.length
      ? await prisma.sKU.findMany({
          where: { userId: session.sub, sku: { in: skusUnicos } },
          select: { sku: true, custoUnitario: true }
        })
      : [];
    const mapaCustos = new Map(skuCustos.map(s => [s.sku, Number(s.custoUnitario || 0)]));
    console.log('[DRE API] SKUs com custo encontrados:', skuCustos.length);

    // Contas a pagar (despesas)
    const wherePagar: any = {
      userId: session.sub,
      OR: dateCriteria.pagar,
    };
    if (categoriasParam.length > 0) wherePagar.categoriaId = { in: categoriasParam };

    const contasPagar = await prisma.contaPagar.findMany({
      where: wherePagar,
      select: {
        valor: true,
        dataPagamento: true,
        dataVencimento: true,
        categoriaId: true,
        categoria: { select: { id: true, nome: true, descricao: true } },
      },
    });
    console.log('[DRE API] Contas a Pagar encontradas:', contasPagar.length);
    if (contasPagar.length > 0) {
      console.log('[DRE API] Exemplo de Conta a Pagar:', {
        valor: contasPagar[0].valor,
        dataVencimento: contasPagar[0].dataVencimento,
        dataPagamento: contasPagar[0].dataPagamento,
        categoria: contasPagar[0].categoria?.nome
      });
    }

    // IMPORTANTE: Contas a receber NÃO entram na RECEITA BRUTA do DRE
    // A RECEITA BRUTA é composta APENAS por vendas (Mercado Livre + Shopee)
    // Este código foi removido para seguir o mesmo cálculo do faturamento do dashboard
    console.log('[DRE API] ⚠️ Contas a Receber NÃO são incluídas na RECEITA BRUTA');

    // Prepare outputs keyed by month
    const receitaBrutaMeliPorMes: Record<string, number> = {};
    const receitaBrutaShopeePorMes: Record<string, number> = {};
    const deducoesMeliPorMes: Record<string, number> = {};
    const deducoesShopeePorMes: Record<string, number> = {};
    const taxasMeliPorMes: Record<string, number> = {};
    const taxasShopeePorMes: Record<string, number> = {};
    const freteMeliPorMes: Record<string, number> = {};
    const freteShopeePorMes: Record<string, number> = {};
    const despesasPorMes: Record<string, number> = {};
    const cmvPorMes: Record<string, number> = {};
    const valoresPorCategoriaMes: Record<string, Record<string, number>> = {};

    for (const m of meses) {
      receitaBrutaMeliPorMes[m.key] = 0;
      receitaBrutaShopeePorMes[m.key] = 0;
      deducoesMeliPorMes[m.key] = 0;
      deducoesShopeePorMes[m.key] = 0;
      taxasMeliPorMes[m.key] = 0;
      taxasShopeePorMes[m.key] = 0;
      freteMeliPorMes[m.key] = 0;
      freteShopeePorMes[m.key] = 0;
      despesasPorMes[m.key] = 0;
      cmvPorMes[m.key] = 0;
    }

    // Helper map for category CMV detection
    const cmvCategoryIds = new Set<string>();
    for (const c of categoriasDespesa) {
      if (isCMVCategory(c.nome, c.descricao)) cmvCategoryIds.add(c.id);
    }

    // Aggregate despesas (contas a pagar) por categoria e mês
    for (const row of contasPagar) {
      // Escolher data baseada no tipo de visualização
      const d = tipoParam === 'caixa'
        ? (row.dataPagamento || row.dataVencimento)  // Caixa: prioriza dataPagamento
        : row.dataVencimento;                        // Competência: sempre dataVencimento

      if (!d) continue;
      const key = monthKey(new Date(d));
      if (!despesasPorMes.hasOwnProperty(key)) continue; // fora dos meses solicitados
      const catId = row.categoriaId || row.categoria?.id || "sem_categoria";
      if (!valoresPorCategoriaMes[catId]) valoresPorCategoriaMes[catId] = {};
      valoresPorCategoriaMes[catId][key] = (valoresPorCategoriaMes[catId][key] || 0) + Number(row.valor || 0);
      despesasPorMes[key] += Number(row.valor || 0);

      // CMV adicional de categorias específicas (CMV/CPV/CSP)
      // Soma ao CMV das vendas calculado anteriormente
      if (cmvCategoryIds.has(catId)) cmvPorMes[key] += Number(row.valor || 0);
    }

    // ============================================
    // PROCESSAR TODAS AS VENDAS (RECEITA OPERACIONAL BRUTA)
    // ============================================
    // IMPORTANTE: Receita Operacional Bruta = TODAS as vendas (incluindo canceladas)
    // As canceladas serão deduzidas posteriormente
    
    // Processar Mercado Livre - TODAS as vendas
    for (const venda of vendasMeli) {
      const d = venda.dataVenda;
      if (!d) continue;
      const key = monthKey(new Date(d));
      if (!receitaBrutaMeliPorMes.hasOwnProperty(key)) continue;

      const valorTotal = Number(venda.valorTotal || 0);
      receitaBrutaMeliPorMes[key] += valorTotal;
      
      // Taxas e frete apenas para vendas confirmadas
      if (!isCanceled(venda.status)) {
        const taxaPlataforma = Math.abs(Number(venda.taxaPlataforma || 0));
        const frete = Math.abs(Number(venda.frete || 0));
        taxasMeliPorMes[key] += taxaPlataforma;
        freteMeliPorMes[key] += frete;

        // CMV = custo unitário × quantidade (apenas vendas confirmadas)
        const quantidade = Number(venda.quantidade || 0);
        const custoUnit = venda.sku && mapaCustos.has(venda.sku) ? mapaCustos.get(venda.sku)! : 0;
        const cmvVenda = custoUnit * quantidade;
        cmvPorMes[key] += cmvVenda;
      }
    }

    // Processar Shopee - TODAS as vendas
    for (const venda of vendasShopee) {
      const d = venda.dataVenda;
      if (!d) continue;
      const key = monthKey(new Date(d));
      if (!receitaBrutaShopeePorMes.hasOwnProperty(key)) continue;

      const valorTotal = Number(venda.valorTotal || 0);
      receitaBrutaShopeePorMes[key] += valorTotal;
      
      // Taxas e frete apenas para vendas confirmadas
      if (!isCanceled(venda.status)) {
        const taxaPlataforma = Math.abs(Number(venda.taxaPlataforma || 0));
        const frete = Math.abs(Number(venda.frete || 0));
        taxasShopeePorMes[key] += taxaPlataforma;
        freteShopeePorMes[key] += frete;

        // CMV = custo unitário × quantidade (apenas vendas confirmadas)
        const quantidade = Number(venda.quantidade || 0);
        const custoUnit = venda.sku && mapaCustos.has(venda.sku) ? mapaCustos.get(venda.sku)! : 0;
        const cmvVenda = custoUnit * quantidade;
        cmvPorMes[key] += cmvVenda;
      }
    }

    // ============================================
    // PROCESSAR VENDAS CANCELADAS (DEDUÇÕES)
    // ============================================
    // Processar Mercado Livre - Canceladas
    for (const venda of vendasMeliCanceladas) {
      const d = venda.dataVenda;
      if (!d) continue;
      const key = monthKey(new Date(d));
      if (!deducoesMeliPorMes.hasOwnProperty(key)) continue;

      const valorTotal = Number(venda.valorTotal || 0);
      deducoesMeliPorMes[key] += valorTotal;
    }

    // Processar Shopee - Canceladas
    for (const venda of vendasShopeeCanceladas) {
      const d = venda.dataVenda;
      if (!d) continue;
      const key = monthKey(new Date(d));
      if (!deducoesShopeePorMes.hasOwnProperty(key)) continue;

      const valorTotal = Number(venda.valorTotal || 0);
      deducoesShopeePorMes[key] += valorTotal;
    }

    // Filter categorias to those present in DESPESA set or that appear in valores
    const categoriasOut = categoriasDespesa.filter(c => {
      return valoresPorCategoriaMes[c.id] || categoriasParam.length === 0 || categoriaIdsDespesa.has(c.id);
    }).map(c => ({ id: c.id, nome: c.nome, descricao: c.descricao }));

    // Totals
    const totalReceitaBrutaMeli = Object.values(receitaBrutaMeliPorMes).reduce((a, b) => a + b, 0);
    const totalReceitaBrutaShopee = Object.values(receitaBrutaShopeePorMes).reduce((a, b) => a + b, 0);
    const totalReceitaBruta = totalReceitaBrutaMeli + totalReceitaBrutaShopee;
    const totalDeducoesMeli = Object.values(deducoesMeliPorMes).reduce((a, b) => a + b, 0);
    const totalDeducoesShopee = Object.values(deducoesShopeePorMes).reduce((a, b) => a + b, 0);
    const totalDeducoes = totalDeducoesMeli + totalDeducoesShopee;
    const totalTaxasMeli = Object.values(taxasMeliPorMes).reduce((a, b) => a + b, 0);
    const totalTaxasShopee = Object.values(taxasShopeePorMes).reduce((a, b) => a + b, 0);
    const totalTaxas = totalTaxasMeli + totalTaxasShopee;
    const totalFreteMeli = Object.values(freteMeliPorMes).reduce((a, b) => a + b, 0);
    const totalFreteShopee = Object.values(freteShopeePorMes).reduce((a, b) => a + b, 0);
    const totalFrete = totalFreteMeli + totalFreteShopee;
    const totalDespesas = Object.values(despesasPorMes).reduce((a, b) => a + b, 0);
    const totalCMV = Object.values(cmvPorMes).reduce((a, b) => a + b, 0);

    console.log('[DRE API] ===== RESULTADO =====');
    console.log('[DRE API] 💰 RECEITA BRUTA TOTAL:', totalReceitaBruta);
    console.log('[DRE API]    - Mercado Livre:', totalReceitaBrutaMeli);
    console.log('[DRE API]    - Shopee:', totalReceitaBrutaShopee);
    console.log('[DRE API] ❌ DEDUÇÕES (Canceladas):', totalDeducoes);
    console.log('[DRE API]    - Mercado Livre:', totalDeducoesMeli);
    console.log('[DRE API]    - Shopee:', totalDeducoesShopee);
    console.log('[DRE API] 💳 TAXAS E COMISSÕES:', totalTaxas);
    console.log('[DRE API]    - Mercado Livre:', totalTaxasMeli);
    console.log('[DRE API]    - Shopee:', totalTaxasShopee);
    console.log('[DRE API] 📦 CUSTO DE FRETE:', totalFrete);
    console.log('[DRE API]    - Mercado Livre:', totalFreteMeli);
    console.log('[DRE API]    - Shopee:', totalFreteShopee);
    console.log('[DRE API] 🏭 CMV:', totalCMV);
    console.log('[DRE API] 💸 DESPESAS OPERACIONAIS:', totalDespesas);
    console.log('[DRE API] ===== FIM =====');

    return NextResponse.json({
      months: meses,
      categorias: categoriasOut,
      valoresPorCategoriaMes,
      receitaBrutaMeliPorMes,
      receitaBrutaShopeePorMes,
      deducoesMeliPorMes,
      deducoesShopeePorMes,
      taxasMeliPorMes,
      taxasShopeePorMes,
      freteMeliPorMes,
      freteShopeePorMes,
      despesasPorMes,
      cmvPorMes,
      totals: {
        receitaBrutaMeli: totalReceitaBrutaMeli,
        receitaBrutaShopee: totalReceitaBrutaShopee,
        receitaBrutaTotal: totalReceitaBruta,
        deducoesMeli: totalDeducoesMeli,
        deducoesShopee: totalDeducoesShopee,
        deducoesTotal: totalDeducoes,
        taxasMeli: totalTaxasMeli,
        taxasShopee: totalTaxasShopee,
        taxasTotal: totalTaxas,
        freteMeli: totalFreteMeli,
        freteShopee: totalFreteShopee,
        freteTotal: totalFrete,
        cmv: totalCMV,
        despesas: totalDespesas,
      },
    });
  } catch (err) {
    console.error("Erro ao calcular séries do DRE:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

