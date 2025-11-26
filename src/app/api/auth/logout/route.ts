import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Handles user logout by clearing the session cookie
 */
export async function POST(request: NextRequest) {
    try {
        // Create response
        const response = NextResponse.json({
            ok: true,
            message: 'Logout realizado com sucesso',
        });

        // Clear session cookie
        response.cookies.delete('session');

        return response;
    } catch (error) {
        console.error('[API] Logout error:', error);
        return NextResponse.json(
            { ok: false, error: 'Erro ao fazer logout' },
            { status: 500 }
        );
    }
}
