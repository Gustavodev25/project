import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { tryVerifySessionToken } from "@/lib/auth";
import {
  buildShopeeAuthUrl,
  resolveShopeeCookieSettings,
  resolveShopeeCallbackUrl,
  saveShopeeOauthState,
} from "@/lib/shopee";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await tryVerifySessionToken(req.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  if (!partnerId || !partnerKey) {
    return NextResponse.json(
      { error: "Credenciais Shopee ausentes (defina SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY)" },
      { status: 500 },
    );
  }

  const isPopupFlow = req.nextUrl.searchParams.get("popup") === "1";

  // State para CSRF
  const state = crypto.randomUUID();
  await saveShopeeOauthState(state, session.sub);

  // Shopee exige um redirect (URL completa onde ela vai devolver `code` e `shop_id`).
  // Use sempre a URL do callback para evitar carregar a raiz do app via ngrok (muitos assets/HMR).
  // Em ambientes NGROK, defina SHOPEE_REDIRECT_ORIGIN para garantir o domínio correto.
  const originCallback = resolveShopeeCallbackUrl(req);
  const { domain, secure } = resolveShopeeCookieSettings(req);

  // Monta URL de autorizacao
  const url = buildShopeeAuthUrl({
    partnerId,
    partnerKey,
    // Shopee recebe a URL completa de redirect (callback)
    redirect: originCallback,
  });

  const res = NextResponse.redirect(url, { status: 302 });
  res.cookies.set({
    name: "shopee_oauth_state",
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600,
    ...(domain ? { domain } : {}),
  });
  res.cookies.set({
    name: "shopee_oauth_mode",
    value: isPopupFlow ? "popup" : "redirect",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600,
    ...(domain ? { domain } : {}),
  });
  return res;
}
