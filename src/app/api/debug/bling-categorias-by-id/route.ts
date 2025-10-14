import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { tryVerifySessionToken } from "@/lib/auth";
import {
  extractCategoriasFromContas,
  refreshBlingAccountToken,
} from "@/lib/bling";

export const runtime = "nodejs";

export async function GET(_request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const session = tryVerifySessionToken(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }
    const userId = session.sub;

    const blingAccount = await prisma.blingAccount.findFirst({
      where: { userId, expires_at: { gt: new Date() } },
    });
    if (!blingAccount) {
      return NextResponse.json(
        { error: "Nenhuma conta Bling ativa encontrada. Conecte sua conta primeiro." },
        { status: 404 },
      );
    }

    // Refresh se necessário
    let refreshedAccount;
    try {
      refreshedAccount = await refreshBlingAccountToken(blingAccount);
    } catch (error: any) {
      console.error("Erro ao renovar token Bling:", error);
      if (
        error instanceof Error &&
        (error.message?.includes("invalid_token") || error.message?.includes("invalid_grant"))
      ) {
        await prisma.blingAccount.delete({ where: { id: blingAccount.id } });
        return NextResponse.json(
          {
            error: "Tokens do Bling expirados. Reconecte sua conta Bling para continuar.",
            requiresReconnection: true,
          },
          { status: 401 },
        );
      }
      throw error;
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      userId,
      blingAccountId: refreshedAccount.id,
      extraction: {},
    };

    // Testar extração de categorias por ID das contas
    try {
      console.log("[Debug] Testando extração de categorias por ID das contas...");
      const startTime = Date.now();
      
      const categorias = await extractCategoriasFromContas(refreshedAccount.access_token);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Separar por tipo
      const receitas = categorias.filter(c => c.tipo === "RECEITA");
      const despesas = categorias.filter(c => c.tipo === "DESPESA");
      const outras = categorias.filter(c => !c.tipo || (c.tipo !== "RECEITA" && c.tipo !== "DESPESA"));
      
      results.extraction = {
        success: true,
        count: categorias.length,
        receitas: receitas.length,
        despesas: despesas.length,
        outras: outras.length,
        duration: `${duration}ms`,
        data: categorias,
        sampleReceita: receitas[0] || null,
        sampleDespesa: despesas[0] || null,
      };
    } catch (error: any) {
      console.error("[Debug] Erro na extração:", error);
      results.extraction = {
        success: false,
        error: error.message,
        count: 0,
      };
    }

    return NextResponse.json({
      success: true,
      message: "Teste de extração de categorias por ID concluído",
      data: results,
    });

  } catch (error) {
    console.error("Erro no teste de extração:", error);
    return NextResponse.json(
      { error: `Erro no teste: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    );
  }
}

