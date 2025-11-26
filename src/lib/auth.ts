import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";

export interface SessionPayload extends JWTPayload {
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

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a JWT session token
 */
export async function generateSessionToken(userData: {
  userId: string;
  email: string;
  name: string;
}): Promise<string> {
  const secret = new TextEncoder().encode(getAuthSecret());

  const token = await new SignJWT({
    sub: userData.userId,
    email: userData.email,
    name: userData.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // 7 days
    .sign(secret);

  return token;
}

export async function tryVerifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(getAuthSecret());
    const { payload } = await jwtVerify(token, secret);

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

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload> {
  const session = await tryVerifySessionToken(token);
  if (!session) throw new Error("Sessão inválida ou expirada.");
  return session;
}

export async function assertSessionToken(token: string | undefined): Promise<SessionPayload> {
  const session = await tryVerifySessionToken(token);
  if (!session) throw new Error("Sessão inválida ou expirada.");
  return session;
}
