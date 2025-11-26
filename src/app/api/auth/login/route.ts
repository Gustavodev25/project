import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, generateSessionToken } from '@/lib/auth';

/**
 * POST /api/auth/login
 * Handles user login with database authentication
 */
export async function POST(request: NextRequest) {
    try {
        console.log('[Login] 📝 Recebendo requisição de login...');
        const body = await request.json();
        const { email, senha } = body;
        console.log('[Login] 📧 Email:', email);

        // Validate input
        if (!email || !senha) {
            console.log('[Login] ❌ Email ou senha não fornecidos');
            return NextResponse.json(
                { ok: false, error: 'Email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        // Find user in database
        console.log('[Login] 🔍 Buscando usuário no banco...');
        const user = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase().trim(),
            },
            select: {
                id: true,
                email: true,
                name: true,
                passwordHash: true,
            },
        });

        if (!user) {
            console.log('[Login] ❌ Usuário não encontrado');
            return NextResponse.json(
                { ok: false, error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        console.log('[Login] ✅ Usuário encontrado:', user.email);

        // Verify password
        console.log('[Login] 🔐 Verificando senha...');
        const isPasswordValid = await comparePassword(senha, user.passwordHash);

        if (!isPasswordValid) {
            console.log('[Login] ❌ Senha inválida');
            return NextResponse.json(
                { ok: false, error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        console.log('[Login] ✅ Senha válida');

        // Create session token
        console.log('[Login] 🎫 Gerando token JWT...');
        const sessionToken = await generateSessionToken({
            userId: user.id,
            email: user.email,
            name: user.name,
        });
        console.log('[Login] ✅ Token JWT gerado');

        // Create response with session cookie
        const response = NextResponse.json({
            ok: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });

        // Set HTTP-only cookie for session
        response.cookies.set('session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        console.log('[Login] ✅ Login bem-sucedido!');
        return response;
    } catch (error) {
        console.error('[Login] ❌ ERRO:', error);
        console.error('[Login] Stack:', error instanceof Error ? error.stack : 'N/A');
        console.error('[Login] Message:', error instanceof Error ? error.message : String(error));
        return NextResponse.json(
            { ok: false, error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
