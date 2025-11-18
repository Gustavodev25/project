#!/usr/bin/env node

/**
 * Script para preparar build do frontend (Vercel)
 * Cria um Prisma Client mock para evitar erros de build
 */

import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
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

// Remover Prisma Client existente se houver
const prismaClientDir = join(projectRoot, 'node_modules', '@prisma', 'client');

try {
  if (existsSync(prismaClientDir)) {
    rmSync(prismaClientDir, { recursive: true, force: true });
  }

  mkdirSync(prismaClientDir, { recursive: true });

  // Criar um index.js mock completo que não requer DATABASE_URL
  const mockContent = `
// Mock Prisma Client para build do frontend (Vercel)
// As rotas API não serão executadas na Vercel, apenas no Render

const mockProxy = new Proxy({}, {
  get(target, prop) {
    return mockProxy;
  }
});

class PrismaClient {
  constructor(options) {
    // Aceitar qualquer opção sem validação
    console.warn('[Mock] PrismaClient is mocked for frontend build');

    // Criar proxies para todos os modelos
    return new Proxy(this, {
      get(target, prop) {
        if (prop === '$connect') return () => Promise.resolve();
        if (prop === '$disconnect') return () => Promise.resolve();
        if (prop === '$transaction') return () => Promise.resolve();
        if (prop === '$on') return () => {};
        if (prop === '$use') return () => {};
        if (prop === '$executeRaw') return () => Promise.resolve(0);
        if (prop === '$queryRaw') return () => Promise.resolve([]);

        // Qualquer outro método retorna um proxy que aceita qualquer chamada
        return mockProxy;
      }
    });
  }
}

module.exports = {
  PrismaClient,
};

module.exports.PrismaClient = PrismaClient;
`;

  writeFileSync(join(prismaClientDir, 'index.js'), mockContent);

  // Criar index.d.ts mock com todas as propriedades possíveis
  const mockTypes = `
export class PrismaClient {
  constructor(options?: any);
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction(fn: any): Promise<any>;
  $on(event: string, callback: Function): void;
  $use(middleware: any): void;
  $executeRaw(query: any, ...values: any[]): Promise<number>;
  $queryRaw(query: any, ...values: any[]): Promise<any[]>;
  [key: string]: any;
}
`;

  writeFileSync(join(prismaClientDir, 'index.d.ts'), mockTypes);

  // Criar package.json para o mock
  const packageJson = {
    name: '@prisma/client',
    version: '0.0.0-mock',
    main: 'index.js',
    types: 'index.d.ts'
  };

  writeFileSync(join(prismaClientDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Criar runtime/library mock
  const runtimeDir = join(prismaClientDir, 'runtime');
  mkdirSync(runtimeDir, { recursive: true });

  const runtimeLibraryContent = `
// Mock runtime/library para build frontend
module.exports = {};
`;

  writeFileSync(join(runtimeDir, 'library.js'), runtimeLibraryContent);
  writeFileSync(join(runtimeDir, 'library.d.ts'), 'export {};');

  console.log('✅ Prisma Client mock criado para build frontend');
  console.log('   → As rotas API serão redirecionadas para o backend (Render)');

} catch (error) {
  console.error('❌ Erro ao criar Prisma Client mock:', error.message);
  process.exit(1);
}
