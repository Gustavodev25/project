#!/usr/bin/env node

/**
 * Script para preparar build na Vercel (frontend only)
 * Remove rotas API que serão servidas pelo Render
 */

import { rmSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Detectar se está na Vercel
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  console.log('✅ Não está na Vercel - pulando remoção de rotas API');
  process.exit(0);
}

console.log('🔧 Preparando build para Vercel (frontend only)...');

try {
  // Remover pasta de rotas API
  const apiDir = join(projectRoot, 'src', 'app', 'api');

  if (existsSync(apiDir)) {
    console.log('📂 Removendo rotas API (serão servidas pelo Render)...');
    rmSync(apiDir, { recursive: true, force: true });

    // Criar placeholder vazio para evitar erros
    mkdirSync(apiDir, { recursive: true });

    // Criar um arquivo .gitkeep
    writeFileSync(join(apiDir, '.gitkeep'), '');

    console.log('✅ Rotas API removidas - redirecionadas para Render via vercel.json');
  }

  console.log('✅ Build preparado para frontend (Vercel)');

} catch (error) {
  console.error('❌ Erro ao preparar build:', error.message);
  process.exit(1);
}
