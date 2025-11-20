import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";
import { refreshMeliAccountToken } from "@/lib/meli";

export const runtime = "nodejs";

const MELI_API_BASE = "https://api.mercadolibre.com";

export async function GET(req: NextRequest) {
  const session = await assertSessionToken(req.cookies.get("session")?.value);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    // 1. Buscar contas Meli ativas do usuário
    const contasAtivas = await prisma.meliAccount.findMany({
      where: { 
        userId: session.sub,
        // Opcional: filtrar apenas contas com token válido ou refresh token
      },
    });

    if (contasAtivas.length === 0) {
      return NextResponse.json({
        newOrders: [],
        totals: { new: 0 },
        newOrdersByAccount: {},
        errors: [{
          accountId: "",
          message: "Nenhuma conta do Mercado Livre encontrada."
        }]
      });
    }

    const newOrders: any[] = [];
    const newOrdersByAccount: Record<string, number> = {};
    const errors: any[] = [];

    // 2. Para cada conta, buscar as vendas mais recentes (limit 50)
    await Promise.all(contasAtivas.map(async (conta) => {
      try {
        let accessToken = conta.access_token;

        // Verificar se precisa renovar token (se estiver expirado ou perto de expirar)
        // Aqui vamos tentar fazer a requisição e se der 401 renovamos
        // Ou podemos renovar proativamente se tivermos a data de expiração
        
        // Vamos tentar buscar as vendas
        let response = await fetch(`${MELI_API_BASE}/orders/search?seller=${conta.ml_user_id}&sort=date_desc&limit=50`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        // Se der erro de auth, tenta renovar
        if (response.status === 401 || response.status === 403) {
          console.log(`[Check] Token expirado para conta ${conta.ml_user_id}, renovando...`);
          const refreshed = await refreshMeliAccountToken(conta.id);
          if (refreshed) {
            accessToken = refreshed.access_token;
            // Tenta novamente
            response = await fetch(`${MELI_API_BASE}/orders/search?seller=${conta.ml_user_id}&sort=date_desc&limit=50`, {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            });
          } else {
            throw new Error("Falha ao renovar token");
          }
        }

        if (!response.ok) {
          throw new Error(`Erro API: ${response.status}`);
        }

        const data = await response.json();
        const results = data.results || [];

        if (results.length === 0) {
          newOrdersByAccount[conta.id] = 0;
          return;
        }

        // 3. Extrair IDs das vendas
        const orderIds = results.map((o: any) => o.id.toString());

        // 4. Verificar quais já existem no banco
        const existingOrders = await prisma.meliVenda.findMany({
          where: {
            orderId: { in: orderIds },
            meliAccountId: conta.id
          },
          select: { orderId: true }
        });

        const existingOrderIds = new Set(existingOrders.map(o => o.orderId));

        // 5. Filtrar novas vendas
        const newOrdersForAccount = results.filter((o: any) => !existingOrderIds.has(o.id.toString()));
        
        if (newOrdersForAccount.length > 0) {
          newOrdersByAccount[conta.id] = newOrdersForAccount.length;
          
          // Adicionar à lista geral (apenas dados básicos)
          newOrdersForAccount.forEach((o: any) => {
            newOrders.push({
              accountId: conta.id,
              orderId: o.id.toString(),
              date: o.date_created,
              total: o.total_amount,
              status: o.status
            });
          });
        } else {
          newOrdersByAccount[conta.id] = 0;
        }

      } catch (err) {
        console.error(`Erro ao verificar conta ${conta.ml_user_id}:`, err);
        errors.push({
          accountId: conta.id,
          mlUserId: conta.ml_user_id,
          message: err instanceof Error ? err.message : "Erro desconhecido"
        });
      }
    }));

    return NextResponse.json({
      newOrders,
      totals: { new: newOrders.length },
      newOrdersByAccount,
      errors
    });

  } catch (error) {
    console.error("Erro ao verificar novas vendas Meli:", error);
    return NextResponse.json({
      newOrders: [],
      totals: { new: 0 },
      errors: [{
        message: "Erro interno ao verificar novas vendas"
      }]
    }, { status: 500 });
  }
}
