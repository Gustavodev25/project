import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { tryVerifySessionToken } from '@/lib/auth';

/**
 * GET /api/auth/me
 * Returns the current authenticated user from database
 */
export async function GET(request: NextRequest) {
    try {
        // Get session cookie
        const sessionCookie = request.cookies.get('session');

        if (!sessionCookie) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Verify and decode JWT session token
        const sessionData = await tryVerifySessionToken(sessionCookie.value);

        if (!sessionData) {
            return NextResponse.json(
                { error: 'Sessão inválida' },
                { status: 401 }
            );
        }

        // Verify user still exists in database
        const user = await prisma.user.findUnique({
            where: {
                id: sessionData.sub,
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 401 }
            );
        }

        // Return user data
        return NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.name,
        });
    } catch (error) {
        console.error('[API] Auth check error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
