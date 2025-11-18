#!/usr/bin/env node

/**
 * Script para verificar se todas as variáveis de ambiente necessárias estão configuradas
 * Uso: node scripts/verify-env.mjs [production|development]
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env.local
config({ path: resolve(__dirname, '../.env.local') });

const env = process.argv[2] || 'development';
const isProduction = env === 'production';

console.log(`\n🔍 Verificando ambiente: ${env.toUpperCase()}\n`);

// Variáveis obrigatórias para todos os ambientes
const REQUIRED_ALWAYS = [
  'DATABASE_URL',
  'JWT_SECRET',
];

// Variáveis obrigatórias apenas para backend (Render)
const REQUIRED_BACKEND = [
  'MELI_APP_ID',
  'MELI_CLIENT_SECRET',
  'MELI_REDIRECT_URI',
  'MELI_AUTH_BASE',
  'MELI_API_BASE',
  'SHOPEE_PARTNER_ID',
  'SHOPEE_PARTNER_KEY',
  'SHOPEE_REDIRECT_URI',
  'SHOPEE_API_BASE',
  'BLING_CLIENT_ID',
  'BLING_REDIRECT_URI',
  'CRON_SECRET',
];

// Variáveis obrigatórias apenas para frontend (Vercel) em produção
const REQUIRED_FRONTEND_PROD = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND',
];

// Variáveis opcionais
const OPTIONAL = [
  'MELI_REDIRECT_ORIGIN',
  'SHOPEE_REDIRECT_ORIGIN',
  'BLING_CLIENT_SECRET',
  'BLING_TIPO_INTEGRACAO',
  'BLING_ID_LOJA',
];

let errors = 0;
let warnings = 0;

function checkVar(name, required = true) {
  const value = process.env[name];
  const hasValue = value && value.length > 0;

  if (!hasValue && required) {
    console.log(`❌ ${name} - FALTANDO (obrigatória)`);
    errors++;
    return false;
  } else if (!hasValue) {
    console.log(`⚠️  ${name} - não configurada (opcional)`);
    warnings++;
    return false;
  } else {
    // Ocultar valores sensíveis
    const displayValue = name.includes('SECRET') || name.includes('KEY') || name.includes('PASSWORD')
      ? '***' + value.slice(-4)
      : value.length > 50
      ? value.slice(0, 30) + '...'
      : value;
    console.log(`✅ ${name} = ${displayValue}`);
    return true;
  }
}

// Determinar tipo de deploy baseado em variáveis
const hasApiUrl = process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.length > 0;
const isBackendDeploy = !hasApiUrl || process.env.NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND === 'false';
const isFrontendDeploy = hasApiUrl && isProduction;

console.log('📋 Tipo de deploy detectado:');
console.log(`   Backend (Render): ${isBackendDeploy ? '✅' : '❌'}`);
console.log(`   Frontend (Vercel): ${isFrontendDeploy ? '✅' : '❌'}`);
console.log('');

console.log('🔐 Variáveis sempre obrigatórias:');
REQUIRED_ALWAYS.forEach(name => checkVar(name, true));
console.log('');

if (isBackendDeploy) {
  console.log('🔧 Variáveis do backend (Render):');
  REQUIRED_BACKEND.forEach(name => checkVar(name, true));
  console.log('');
}

if (isFrontendDeploy) {
  console.log('🌐 Variáveis do frontend (Vercel):');
  REQUIRED_FRONTEND_PROD.forEach(name => checkVar(name, true));
  console.log('');
}

console.log('📦 Variáveis opcionais:');
OPTIONAL.forEach(name => checkVar(name, false));
console.log('');

// Verificações adicionais
console.log('🔍 Verificações adicionais:');

// 1. JWT_SECRET deve ter pelo menos 32 caracteres
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.log(`⚠️  JWT_SECRET muito curto (${process.env.JWT_SECRET.length} chars, recomendado: 32+)`);
  warnings++;
} else if (process.env.JWT_SECRET) {
  console.log(`✅ JWT_SECRET tem tamanho adequado (${process.env.JWT_SECRET.length} chars)`);
}

// 2. CRON_SECRET deve ter pelo menos 32 caracteres
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32) {
  console.log(`⚠️  CRON_SECRET muito curto (${process.env.CRON_SECRET.length} chars, recomendado: 32+)`);
  warnings++;
} else if (process.env.CRON_SECRET) {
  console.log(`✅ CRON_SECRET tem tamanho adequado (${process.env.CRON_SECRET.length} chars)`);
}

// 3. DATABASE_URL deve ser PostgreSQL
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
  console.log(`⚠️  DATABASE_URL não é PostgreSQL (recomendado para produção)`);
  warnings++;
} else if (process.env.DATABASE_URL) {
  console.log(`✅ DATABASE_URL usa PostgreSQL`);
}

// 4. REDIRECT_URI deve usar HTTPS em produção
if (isProduction) {
  const uris = [
    process.env.MELI_REDIRECT_URI,
    process.env.SHOPEE_REDIRECT_URI,
    process.env.BLING_REDIRECT_URI,
  ].filter(Boolean);

  uris.forEach(uri => {
    if (!uri.startsWith('https://')) {
      console.log(`❌ REDIRECT_URI deve usar HTTPS em produção: ${uri}`);
      errors++;
    }
  });

  if (uris.every(uri => uri.startsWith('https://'))) {
    console.log(`✅ Todas as REDIRECT_URIs usam HTTPS`);
  }
}

// 5. NEXT_PUBLIC_API_URL deve usar HTTPS em produção
if (isFrontendDeploy && process.env.NEXT_PUBLIC_API_URL) {
  if (!process.env.NEXT_PUBLIC_API_URL.startsWith('https://')) {
    console.log(`❌ NEXT_PUBLIC_API_URL deve usar HTTPS em produção`);
    errors++;
  } else {
    console.log(`✅ NEXT_PUBLIC_API_URL usa HTTPS`);
  }
}

// 6. Verificar se FORCE_EXTERNAL_BACKEND está configurado corretamente
if (isFrontendDeploy) {
  if (process.env.NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND !== 'true') {
    console.log(`❌ NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND deve ser "true" no frontend em produção`);
    errors++;
  } else {
    console.log(`✅ NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND = true`);
  }
}

console.log('');
console.log('═'.repeat(60));

if (errors > 0) {
  console.log(`\n❌ Encontrados ${errors} erro(s) e ${warnings} aviso(s)\n`);
  console.log('Corrija os erros antes de fazer deploy!\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n⚠️  Encontrados ${warnings} aviso(s), mas nenhum erro\n`);
  console.log('Você pode continuar, mas revise os avisos.\n');
  process.exit(0);
} else {
  console.log('\n✅ Todas as verificações passaram!\n');
  console.log('Ambiente configurado corretamente para deploy.\n');
  process.exit(0);
}
