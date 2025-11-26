import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateSessionToken } from '@/lib/auth';

/**
 * POST /api/auth/register
 * Handles user registration with database
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, senha, name } = body;

        // Validate input
        if (!email || !senha) {
            return NextResponse.json(
                { ok: false, error: 'Email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        if (!name) {
            return NextResponse.json(
                { ok: false, error: 'Nome é obrigatório' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { ok: false, error: 'Email inválido' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (senha.length < 6) {
            return NextResponse.json(
                { ok: false, error: 'A senha deve ter pelo menos 6 caracteres' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { ok: false, error: 'Este email já está cadastrado' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(senha);

        // Create new user in database
        const newUser = await prisma.user.create({
            data: {
                email: normalizedEmail,
                name,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        // Create session token
        const sessionToken = await generateSessionToken({
            userId: newUser.id,
            email: newUser.email,
            name: newUser.name,
        });

        // Create response with session cookie
        const response = NextResponse.json({
            ok: true,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
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

        return response;
    } catch (error) {
        console.error('[API] Registration error:', error);
        return NextResponse.json(
            { ok: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
