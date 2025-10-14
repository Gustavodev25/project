import jwt, { JwtPayload } from "jsonwebtoken";

export interface SessionPayload extends JwtPayload {
  sub: string;
  email?: string;
  name?: string;
}

export function getAuthSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET não configurado. Defina a variável de ambiente antes de usar autenticação.",
    );
  }
  return secret;
}

export function tryVerifySessionToken(
  token: string | undefined,
): SessionPayload | null {
  if (!token) return null;
  try {
    // Ajuste 'algorithms' se sua emissão usar algo diferente
    const payload = jwt.verify(token, getAuthSecret()) as JwtPayload;
    if (!payload || typeof payload === "string" || !payload.sub) return null;
    return payload as SessionPayload;
  } catch (error) {
    console.error(
      "Erro ao verificar token de sessão:",
      (error as Error)?.message,
    );
    return null;
  }
}

export function verifySessionToken(token: string | undefined): SessionPayload {
  const session = tryVerifySessionToken(token);
  if (!session) throw new Error("Sessão inválida ou expirada.");
  return session;
}

export function assertSessionToken(token: string | undefined): SessionPayload {
  const session = tryVerifySessionToken(token);
  if (!session) throw new Error("Sessão inválida ou expirada.");
  return session;
}
