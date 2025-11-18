import { NextResponse } from "next/server";
import { withCors } from "@/lib/cors";

export const runtime = "nodejs";

export const POST = withCors(async (req: Request) => {
  const host = req.headers.get("host") || "";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const cookieSameSite = isLocalhost ? "lax" : "none";
  const cookieSecure = !isLocalhost;

  const response = NextResponse.json({ ok: true });

  response.cookies.set("session", "", {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: "/",
    maxAge: 0,
  });

  return response;
});
