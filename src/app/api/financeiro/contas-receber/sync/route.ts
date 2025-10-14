import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { tryVerifySessionToken } from "@/lib/auth";
import { getBlingContasReceber, getBlingContaReceberById, getBlingCategoriaById, refreshBlingAccountToken } from "@/lib/bling";
import { sendProgressToUser, closeUserConnection } from "../../sync-progress/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let userId = "";
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    // Verificar o token JWT de sessao
    const session = tryVerifySessionToken(sessionCookie.value);

    if (!session) {
      return NextResponse.json(
        { error: "Sessao invalida ou expirada" },
        { status: 401 },
      );
    }

    userId = session.sub;

    // Buscar conta do Bling (mesmo expirada) e tentar renovar automaticamente
    const blingAccount = await prisma.blingAccount.findFirst({
      where: { userId },
      orderBy: { updated_at: "desc" },
    });

    if (!blingAccount) {
      return NextResponse.json(
        {
          error: "Nenhuma conta Bling conectada. Conecte sua conta primeiro.",
        },
        { status: 404 },
      );
    }

    // Renovar token se necessario (força se expirado)
    let refreshedAccount;
    try {
      const isExpired = new Date(blingAccount.expires_at) <= new Date();
      refreshedAccount = await refreshBlingAccountToken(blingAccount, isExpired);
    } catch (error: unknown) {
      console.error("Erro ao renovar token Bling:", error);
      if (
        error instanceof Error &&
        (error.message?.includes("invalid_token") ||
          error.message?.includes("invalid_grant"))
      ) {
        await prisma.blingAccount.delete({ where: { id: blingAccount.id } });
        return NextResponse.json(
          {
            error:
              "Tokens do Bling expirados. Reconecte sua conta Bling para continuar.",
            requiresReconnection: true,
          },
          { status: 401 },
        );
      }
      if (error instanceof Error && (error.message?.includes("429") || error.message?.includes("rate") )) {
        return NextResponse.json(
          {
            error: "Limite de requisições do Bling atingido. Tente novamente em alguns segundos.",
          },
          { status: 429 },
        );
      }
      throw error;
    }

    // Helpers de parsing
    const parseMoney = (v: any): number => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = parseFloat(v.replace?.(".", "").replace?.(",", ".") || v);
        return isNaN(n) ? 0 : n;
      }
      return 0;
    };
    const parseDate = (v: any): Date | null => {
      if (!v) return null;
      try {
        if (typeof v === "number") return new Date(v);
        const d = new Date(String(v));
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };
    const normalizeName = (s: string): string =>
      s
        ?.toString()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    // Enviar progresso inicial
    sendProgressToUser(userId, {
      type: "sync_start",
      title: "Sincronizando Contas a Receber",
      message: "Iniciando sincronização com o Bling...",
      progressValue: 0,
      progressMax: 100,
      progressLabel: "Preparando sincronização"
    });

    // Buscar dados do Bling
    sendProgressToUser(userId, {
      type: "sync_progress",
      title: "Sincronizando Contas a Receber",
      message: "Buscando dados do Bling...",
      progressValue: 10,
      progressMax: 100,
      progressLabel: "Buscando contas a receber"
    });

    const contasBling: any[] = await getBlingContasReceber(
      refreshedAccount.access_token,
    );
    
    // Debug: verificar estrutura das primeiras contas
    if (contasBling.length > 0) {
      console.log(`[Sync CR] Estrutura da primeira conta a receber:`, contasBling[0]);
      console.log(`[Sync CR] Categoria da primeira conta:`, contasBling[0]?.categoria);
    }
    
    // Tentar obter o dicionário de categorias (id -> nome)
    sendProgressToUser(userId, {
      type: "sync_progress",
      title: "Sincronizando Contas a Receber",
      message: "Carregando categorias...",
      progressValue: 20,
      progressMax: 100,
      progressLabel: "Carregando categorias"
    });

    let categoriasMap = new Map<string, string>();
    try {
      const categorias = await (await import("@/lib/bling")).getBlingCategorias(
        refreshedAccount.access_token,
      );
      for (const c of categorias || []) {
        const cid = (c?.id ?? c?.idCategoria ?? c?.codigo)?.toString?.();
        const cname = c?.nome ?? c?.descricao;
        if (cid && cname) categoriasMap.set(cid, String(cname));
      }
    } catch {}

    // Prefetch caches de categorias e formas de pagamento
    const catByBlingId = new Map<string, string>();
    const catByNormName = new Map<string, string>();
    const fpByBlingId = new Map<string, string>();
    const fpByNormName = new Map<string, string>();
    try {
      const [cats, fps] = await Promise.all([
        prisma.categoria.findMany({ where: { userId }, select: { id: true, blingId: true, nome: true } }),
        prisma.formaPagamento.findMany({ where: { userId }, select: { id: true, blingId: true, nome: true } }),
      ]);
      for (const c of cats) {
        if (c.blingId) catByBlingId.set(String(c.blingId), c.id);
        if (c.nome) {
          const n = normalizeName(String(c.nome));
          if (n) catByNormName.set(n, c.id);
        }
      }
      for (const f of fps) {
        if (f.blingId) fpByBlingId.set(String(f.blingId), f.id);
        if ((f as any).nome) {
          const n = normalizeName(String((f as any).nome));
          if (n) fpByNormName.set(n, f.id);
        }
      }
    } catch {}

    let synced = 0;
    const errors: string[] = [];
    const totalContas = contasBling.length;

    sendProgressToUser(userId, {
      type: "sync_progress",
      title: "Sincronizando Contas a Receber",
      message: `Processando ${totalContas} contas a receber...`,
      progressValue: 30,
      progressMax: 100,
      progressLabel: `Processando ${totalContas} contas`
    });

    const batchSize = 5; // reduzir concorrência para diminuir risco de 429
    for (let start = 0; start < contasBling.length; start += batchSize) {
      const end = Math.min(start + batchSize, contasBling.length);
      const batch = contasBling.slice(start, end);

      const progressValue = 30 + Math.floor((start / contasBling.length) * 60);
      sendProgressToUser(userId, {
        type: "sync_progress",
        title: "Sincronizando Contas a Receber",
        message: `Processando ${end} de ${totalContas}...`,
        progressValue,
        progressMax: 100,
        progressLabel: `${end} de ${totalContas} contas processadas`
      });

      await Promise.all(batch.map(async (item) => {
        try {
          const blingId =
            item?.id?.toString?.() ||
            item?.numero?.toString?.() ||
            item?.codigo?.toString?.();
          if (!blingId) return;

        const descricao =
          item?.descricao || item?.historico || item?.observacao || "Receita";
        const valor = parseMoney(
          item?.valor || item?.valorOriginal || item?.total || item?.valor_titulo,
        );
        const dataVencimento =
          parseDate(item?.dataVencimento || item?.data || item?.vencimento) ||
          new Date();
        const dataRecebimento = parseDate(
          item?.dataRecebimento || item?.dataLiquidacao || item?.recebimento,
        );

        let categoriaBlingId =
          item?.categoria?.id?.toString?.() ||
          item?.categoria?.idCategoria?.toString?.() ||
          item?.categoriaId?.toString?.() ||
          item?.categoria_id?.toString?.() ||
          item?.idCategoria?.toString?.();

        // Se não encontrou categoria na lista, buscar conta individual
          // Limitar buscas individuais para evitar rate-limit do Bling
          const detailLimit = Number.MAX_SAFE_INTEGER;
          if (!categoriaBlingId && item?.id && (globalThis as any).__cz_cr_detailCount__ < detailLimit) {
            (globalThis as any).__cz_cr_detailCount__ = ((globalThis as any).__cz_cr_detailCount__ || 0) + 1;
            try {
              const contaIndividual = await getBlingContaReceberById(refreshedAccount.access_token, item.id);
              if (contaIndividual?.categoria?.id) {
                categoriaBlingId = contaIndividual.categoria.id.toString();
              }
            } catch {}
          }

        let formaBlingId =
          item?.formaPagamento?.id?.toString?.() ||
          item?.formaPagamentoId?.toString?.() ||
          item?.idFormaPagamento?.toString?.() ||
          item?.forma_pagamento_id?.toString?.();

          let categoriaId: string | null = null;
          let catNomeRaw = "";
          // 1) Resolver pelo blingId, se houver
          if (categoriaBlingId) {
            categoriaId = catByBlingId.get(categoriaBlingId) || null;
            if (!categoriaId) {
              catNomeRaw = (categoriasMap.get(categoriaBlingId) || String(
                item?.categoria?.descricao ||
                item?.categoria?.nome ||
                item?.categoriaDescricao ||
                item?.contaContabil?.descricao ||
                item?.contaContabil?.nome ||
                ""
              ).trim()) as string;
            }
          }
          // 2) Se não houver blingId ou não achou, tentar por nome
          if (!categoriaBlingId) {
            catNomeRaw = String(
              item?.categoria?.descricao ||
              item?.categoria?.nome ||
              item?.categoriaDescricao ||
              item?.contaContabil?.descricao ||
              item?.contaContabil?.nome ||
              ""
            ).trim();
          }
          if (!categoriaId && catNomeRaw) {
            const keyName = normalizeName(catNomeRaw);
            categoriaId = catByNormName.get(keyName) || null;
            if (!categoriaId) {
              try {
                console.log(`[Sync CR] Criando categoria: blingId=${categoriaBlingId || "(sem_blingId)"}, nome=${catNomeRaw}`);
                const created = await prisma.categoria.create({
                  data: { userId, blingId: categoriaBlingId || null, nome: catNomeRaw, descricao: catNomeRaw, ativo: true },
                  select: { id: true },
                });
                categoriaId = created.id;
                catByNormName.set(keyName, categoriaId);
                if (categoriaBlingId) {
                  catByBlingId.set(categoriaBlingId, categoriaId);
                }
                console.log(`[Sync CR] Categoria criada com sucesso: id=${categoriaId}`);
              } catch (error) {
                console.error(`[Sync CR] Erro ao criar categoria:`, error);
              }
            }
          }

          // Fallback final: temos categoriaBlingId mas ainda não resolvemos categoriaId
          if (!categoriaId && categoriaBlingId) {
            try {
              const catDetail = await getBlingCategoriaById(refreshedAccount.access_token, Number(categoriaBlingId));
              if (catDetail) {
                const blingIdStr = String(catDetail.id);
                const nomeCat = String(catDetail.nome || catDetail.descricao || "Categoria");
                const createdOrUpdated = await prisma.categoria.upsert({
                  where: { userId_blingId: { userId, blingId: blingIdStr } },
                  update: { nome: nomeCat, descricao: catDetail.descricao || null, ativo: (catDetail.situacao || "ativo") !== "inativo", atualizadoEm: new Date() },
                  create: { userId, blingId: blingIdStr, nome: nomeCat, descricao: catDetail.descricao || null, ativo: (catDetail.situacao || "ativo") !== "inativo" },
                  select: { id: true }
                });
                categoriaId = createdOrUpdated.id;
                catByBlingId.set(blingIdStr, categoriaId);
                const n = normalizeName(nomeCat);
                if (n) catByNormName.set(n, categoriaId);
                console.log(`[Sync CR] Categoria resolvida via getBlingCategoriaById: id=${categoriaId}, blingId=${blingIdStr}`);
              }
            } catch (e) {
              console.error(`[Sync CR] Erro ao buscar categoria por ID ${categoriaBlingId}:`, e);
            }
          }

          let formaPagamentoId: string | null = null;
          if (formaBlingId) {
            formaPagamentoId = fpByBlingId.get(formaBlingId) || null;
          } else if (item?.formaPagamento?.nome) {
            const n = normalizeName(String(item.formaPagamento.nome));
            if (n) formaPagamentoId = fpByNormName.get(n) || null;
          }

        const baseStatus = (item?.situacao || item?.status || "")
          .toString()
          .toLowerCase();
        let status: string = baseStatus.includes("receb")
          ? "recebido"
          : "pendente";
        if (status !== "recebido" && dataRecebimento) status = "recebido";
        if (
          status !== "recebido" &&
          dataVencimento &&
          dataVencimento.getTime() < Date.now()
        )
          status = "vencido";

        console.log(`[Sync CR] Salvando conta ${blingId}: categoriaId=${categoriaId}, categoriaBlingId=${categoriaBlingId}`);
        
        await prisma.contaReceber.upsert({
          where: { userId_blingId: { userId, blingId } },
          update: {
            descricao,
            valor,
            dataVencimento,
            dataRecebimento,
            status,
            categoriaId,
            formaPagamentoId,
            atualizadoEm: new Date(),
          },
          create: {
            userId,
            blingId,
            descricao,
            valor,
            dataVencimento,
            dataRecebimento,
            status,
            categoriaId,
            formaPagamentoId,
          },
        });
          synced++;
        } catch (e) {
          console.error("Falha ao sincronizar conta a receber:", e);
          errors.push(
            typeof item?.id !== "undefined"
              ? `ID ${item.id}: ${e}`
              : `Registro sem ID: ${e}`,
          );
        }
      }));
    }

    // Enviar progresso final
    sendProgressToUser(userId, {
      type: "sync_complete",
      title: "✅ Sincronização Concluída",
      message: `${synced} contas a receber sincronizadas com sucesso!`,
      progressValue: 100,
      progressMax: 100,
      progressLabel: "Sincronização concluída"
    });

    // Fechar conexão após um delay
    setTimeout(() => {
      closeUserConnection(userId);
    }, 3000);

    return NextResponse.json({
      success: true,
      message: "Contas a receber sincronizadas com sucesso",
      data: {
        synced,
        total: contasBling.length,
        errors,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Erro ao sincronizar contas a receber:", error);
    
    // Enviar erro via SSE
    if (userId) {
      sendProgressToUser(userId, {
        type: "sync_error",
        title: "❌ Erro na Sincronização",
        message: `Erro ao sincronizar contas a receber: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        progressValue: 0,
        progressMax: 100,
        progressLabel: "Erro na sincronização"
      });
      // Fechar conexão após erro
      setTimeout(() => {
        closeUserConnection(userId);
      }, 5000);
    }

    return NextResponse.json(
      { error: "Erro ao sincronizar contas a receber" },
      { status: 500 },
    );
  }
}
