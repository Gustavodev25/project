#!/usr/bin/env node

/**
 * Script que roda prisma generate apenas no backend (Render)
 * Na Vercel (frontend), pula o Prisma
 */

import { execSync } from 'child_process';

// Detectar se está na Vercel
const isVercel = process.env.VERCEL === '1';

// Detectar se tem DATABASE_URL (indica backend)
const hasDatabase = !!process.env.DATABASE_URL;

console.log('🔍 Ambiente detectado:');
console.log(`   VERCEL: ${isVercel ? 'Sim' : 'Não'}`);
console.log(`   DATABASE_URL: ${hasDatabase ? 'Configurado' : 'Não configurado'}`);

// Se está na Vercel (frontend), pular Prisma
if (isVercel && !hasDatabase) {
  console.log('✅ Frontend (Vercel) - Pulando Prisma generate');
  process.exit(0);
}

// Se tem DATABASE_URL ou não está na Vercel, rodar Prisma
if (hasDatabase || !isVercel) {
  console.log('🔧 Backend (Render) - Executando Prisma generate');
  try {
    execSync('prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma generate concluído');
  } catch (error) {
    console.error('❌ Erro ao executar Prisma generate:', error.message);
    process.exit(1);
  }
} else {
  console.log('⚠️  Ambiente desconhecido - Pulando Prisma');
}
