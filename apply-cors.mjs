import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Encontrar todas as rotas
const routeFiles = await glob('src/app/api/**/route.ts', {
  ignore: ['**/node_modules/**'],
  absolute: true
});

console.log(`📂 Encontrados ${routeFiles.length} arquivos de rota`);

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const filePath of routeFiles) {
  try {
    let content = readFileSync(filePath, 'utf-8');

    // Verificar se já tem withCors importado
    if (content.includes('withCors')) {
      console.log(`⏭️  ${filePath.split('\\').pop()} - Já tem CORS`);
      skippedCount++;
      continue;
    }

    let modified = false;

    // 1. Adicionar import do withCors se não existir
    if (!content.includes('import { withCors }')) {
      // Encontrar a última linha de import
      const lines = content.split('\n');
      let lastImportIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') && !lines[i].includes('type {')) {
          lastImportIndex = i;
        }
      }

      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, 'import { withCors } from "@/lib/cors";');
        content = lines.join('\n');
        modified = true;
      }
    }

    // 2. Envolver funções GET, POST, PUT, DELETE, PATCH com withCors
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    for (const method of methods) {
      // Padrão: export async function METHOD(
      const asyncFunctionPattern = new RegExp(
        `export\\s+async\\s+function\\s+${method}\\s*\\(`,
        'g'
      );

      if (asyncFunctionPattern.test(content)) {
        // Substituir para: export const METHOD = withCors(async (
        content = content.replace(
          new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(([^)]*)\\)`, 'g'),
          `export const ${method} = withCors(async ($1) =>`
        );

        // Encontrar o fechamento da função e adicionar );
        // Isso é complexo, então vamos fazer manualmente depois
        modified = true;
      }
    }

    if (modified) {
      // Não vamos salvar automaticamente para evitar quebrar código
      // Apenas marcar para revisão manual
      console.log(`🔍 ${filePath} - PRECISA DE REVISÃO MANUAL`);
      updatedCount++;
    } else {
      skippedCount++;
    }

  } catch (error) {
    console.error(`❌ Erro em ${filePath}:`, error.message);
    errorCount++;
  }
}

console.log(`\n📊 Resumo:`);
console.log(`  ✅ Atualizados: ${updatedCount}`);
console.log(`  ⏭️  Ignorados: ${skippedCount}`);
console.log(`  ❌ Erros: ${errorCount}`);
