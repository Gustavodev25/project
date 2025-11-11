import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteContext,
) {
  const sessionCookie = req.cookies.get("session")?.value;
  let session: Awaited<ReturnType<typeof assertSessionToken>>;

  try {
    session = await assertSessionToken(sessionCookie);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const accountId = params?.id;

  if (!accountId) {
    return NextResponse.json(
      { error: "Conta inválida" },
      { status: 400 },
    );
  }

  try {
    const account = await prisma.meliAccount.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, nickname: true, ml_user_id: true },
    });

    if (!account || account.userId !== session.sub) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 },
      );
    }

    await prisma.meliAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({
      success: true,
      accountId,
    });
  } catch (error) {
    console.error("[meli][accounts] erro ao excluir conta:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta" },
      { status: 500 },
    );
  }
}
