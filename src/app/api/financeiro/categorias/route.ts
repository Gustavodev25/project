import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { tryVerifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Evita cache estático

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar o token JWT de sessão
    const session = await tryVerifySessionToken(sessionCookie.value);
    
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    const userId = session.sub;
    const body = await request.json();
    const { descricao, tipo, categoriaPaiId } = body;

    if (!descricao || !tipo) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Se categoriaPaiId for fornecido, validar que existe
    if (categoriaPaiId) {
      const categoriaPai = await prisma.categoria.findFirst({
        where: {
          id: categoriaPaiId,
          userId: userId,
        },
      });

      if (!categoriaPai) {
        return NextResponse.json(
          { error: "Categoria pai não encontrada" },
          { status: 404 }
        );
      }
    }

    const categoria = await prisma.categoria.create({
      data: {
        userId: userId,
        nome: descricao,
        descricao: descricao,
        tipo: tipo,
        categoriaPaiId: categoriaPaiId || null,
        ativo: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: categoria,
    });
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar o token JWT de sessão
    const session = await tryVerifySessionToken(sessionCookie.value);
    
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    const userId = session.sub;

    console.log(`[Categorias GET] Buscando categorias para userId: ${userId}`);

    // Buscar TODAS as categorias primeiro para debug
    const todasCategorias = await prisma.categoria.findMany({
      where: {
        userId: userId,
      },
    });
    
    console.log(`[Categorias GET] Total de categorias no banco: ${todasCategorias.length}`);
    console.log(`[Categorias GET] Categorias ativas: ${todasCategorias.filter(c => c.ativo).length}`);
    console.log(`[Categorias GET] Categorias inativas: ${todasCategorias.filter(c => !c.ativo).length}`);

    // Buscar apenas categorias ativas com relacionamentos
    const categorias = await prisma.categoria.findMany({
      where: {
        userId: userId,
        ativo: true,
      },
      include: {
        subCategorias: {
          where: {
            ativo: true,
          },
          orderBy: {
            nome: "asc",
          },
        },
        categoriaPai: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    console.log(`[Categorias GET] Retornando ${categorias.length} categorias ativas`);

    return NextResponse.json({
      success: true,
      data: categorias,
    });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar o token JWT de sessão
    const session = await tryVerifySessionToken(sessionCookie.value);
    
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    const userId = session.sub;
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const body = await request.json();
    const { descricao, tipo, categoriaPaiId } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID do registro não fornecido" },
        { status: 400 }
      );
    }

    if (!descricao || !tipo) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Verificar se o registro pertence ao usuário
    const categoria = await prisma.categoria.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { error: "Registro não encontrado ou não pertence ao usuário" },
        { status: 404 }
      );
    }

    // Se categoriaPaiId for fornecido, validar que existe e não é a própria categoria
    if (categoriaPaiId) {
      if (categoriaPaiId === id) {
        return NextResponse.json(
          { error: "Uma categoria não pode ser pai de si mesma" },
          { status: 400 }
        );
      }

      const categoriaPai = await prisma.categoria.findFirst({
        where: {
          id: categoriaPaiId,
          userId: userId,
        },
      });

      if (!categoriaPai) {
        return NextResponse.json(
          { error: "Categoria pai não encontrada" },
          { status: 404 }
        );
      }
    }

    // Atualizar o registro
    const categoriaAtualizada = await prisma.categoria.update({
      where: {
        id: id,
      },
      data: {
        descricao,
        tipo,
        categoriaPaiId: categoriaPaiId || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: categoriaAtualizada,
    });
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar categoria" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar o token JWT de sessão
    const session = await tryVerifySessionToken(sessionCookie.value);
    
    if (!session) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    const userId = session.sub;
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: "ID do registro não fornecido" },
        { status: 400 }
      );
    }

    // Verificar se o registro pertence ao usuário
    const categoria = await prisma.categoria.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { error: "Registro não encontrado ou não pertence ao usuário" },
        { status: 404 }
      );
    }

    // Verificar se a categoria tem subcategorias
    const subCategorias = await prisma.categoria.count({
      where: {
        categoriaPaiId: id,
      },
    });

    if (subCategorias > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir categoria que possui subcategorias" },
        { status: 400 }
      );
    }

    // Verificar se a categoria está sendo usada em contas
    const contasUsandoCategoria = await prisma.contaPagar.count({
      where: {
        categoriaId: id,
      },
    });

    const contasReceberUsandoCategoria = await prisma.contaReceber.count({
      where: {
        categoriaId: id,
      },
    });

    if (contasUsandoCategoria > 0 || contasReceberUsandoCategoria > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir categoria que está sendo usada em contas" },
        { status: 400 }
      );
    }

    // Excluir o registro
    await prisma.categoria.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Categoria excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return NextResponse.json(
      { error: "Erro ao excluir categoria" },
      { status: 500 }
    );
  }
}