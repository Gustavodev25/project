#!/usr/bin/env node

/**
 * Script para preparar build do frontend (Vercel)
 * Cria um Prisma Client mock para evitar erros de build
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Detectar se está na Vercel
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  console.log('✅ Não está na Vercel - pulando setup');
  process.exit(0);
}

console.log('🔧 Configurando build para Vercel (frontend)...');

// Criar diretório do Prisma Client mock
const prismaClientDir = join(projectRoot, 'node_modules', '@prisma', 'client');

try {
  mkdirSync(prismaClientDir, { recursive: true });

  // Criar um index.js mock que exporta um PrismaClient fake
  const mockContent = `
// Mock Prisma Client para build do frontend (Vercel)
// As rotas API não serão executadas na Vercel, apenas no Render

class PrismaClient {
  constructor() {
    console.warn('[Mock] PrismaClient is mocked for frontend build');
  }

  $connect() {
    return Promise.resolve();
  }

  $disconnect() {
    return Promise.resolve();
  }
}

module.exports = {
  PrismaClient,
};

module.exports.PrismaClient = PrismaClient;
`;

  writeFileSync(join(prismaClientDir, 'index.js'), mockContent);

  // Criar index.d.ts mock
  const mockTypes = `
export class PrismaClient {
  constructor();
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}
`;

  writeFileSync(join(prismaClientDir, 'index.d.ts'), mockTypes);

  console.log('✅ Prisma Client mock criado para build frontend');
  console.log('   → As rotas API serão redirecionadas para o backend (Render)');

} catch (error) {
  console.error('❌ Erro ao criar Prisma Client mock:', error.message);
  process.exit(1);
}
