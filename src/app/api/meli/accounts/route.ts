import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  try {
    const {sub } = await assertSessionToken(sessionCookie);
    const rows = await prisma.meliAccount.findMany({
      where: { userId: sub },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(rows);
  } catch (e) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
}
