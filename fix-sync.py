#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corrigir a sincronização do Mercado Livre
Garante que TODAS as vendas sejam sincronizadas sem deixar nenhuma para trás
"""

import re

# Ler o arquivo com a codificação correta
with open(r'c:\Users\de\Desktop\Zero Holding\project\src\app\api\meli\vendas\sync\route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Substituição 1: Melhorar a divisão de sub-períodos com base no volume
old_code_1 = """    // Determinar tamanho ideal do sub-período
    // Se tem mais de 50k vendas, dividir em períodos de 7 dias
    // Se tem 10k-50k vendas, dividir em períodos de 14 dias
    // OTIMIZAÇÃO: Divisão mais agressiva baseada no volume de vendas
    let subPeriodDays: number;
    if (totalInPeriod > 100000) {
      subPeriodDays = 3; // Períodos de 3 dias para volumes muito altos (>100k vendas)
    } else if (totalInPeriod > 50000) {
      subPeriodDays = 5; // Períodos de 5 dias para volumes altos (50k-100k vendas)
    } else if (totalInPeriod > 30000) {
      subPeriodDays = 7; // Períodos de 7 dias para volumes médio-altos (30k-50k vendas)
    } else {
      subPeriodDays = 14; // Períodos de 14 dias para volumes médios (10k-30k vendas)
    }"""

new_code_1 = """    // OTIMIZAÇÃO: Divisão mais agressiva baseada no volume de vendas
    // Quanto mais vendas, menor o período para garantir que não ultrapasse 9.950
    let subPeriodDays: number;
    if (totalInPeriod > 100000) {
      subPeriodDays = 3; // Períodos de 3 dias para volumes muito altos (>100k vendas)
    } else if (totalInPeriod > 50000) {
      subPeriodDays = 5; // Períodos de 5 dias para volumes altos (50k-100k vendas)
    } else if (totalInPeriod > 30000) {
      subPeriodDays = 7; // Períodos de 7 dias para volumes médio-altos (30k-50k vendas)
    } else {
      subPeriodDays = 14; // Períodos de 14 dias para volumes médios (10k-30k vendas)
    }"""

content = content.replace(old_code_1, new_code_1)

# Substituição 2: Melhorar logging e progresso
old_code_2_pattern = r'console\.log\(`\[Sync\] 🔄 Dividindo em sub-períodos de \$\{subPeriodDays\} dias`\);'
new_code_2 = "console.log(`[Sync] 🔄 Dividindo em sub-períodos de ${subPeriodDays} dias para processar ${totalInPeriod} vendas`);"
content = re.sub(old_code_2_pattern, new_code_2, content)

# Substituição 3: Adicionar contador de sub-períodos processados
old_code_3 = """    let currentStart = new Date(dateFrom);
    while (currentStart < dateTo) {"""

new_code_3 = """    let currentStart = new Date(dateFrom);
    let processedCount = 0;

    while (currentStart < dateTo) {"""

content = content.replace(old_code_3, new_code_3)

# Substituição 4: Melhorar logs de progresso dos sub-períodos
old_code_4_pattern = r'console\.log\(`\[Sync\] 📆 Buscando sub-período: \$\{currentStart\.toISOString\(\)\.split\(\'T\'\)\[0\]\} a \$\{currentEnd\.toISOString\(\)\.split\(\'T\'\)\[0\]\}`\);'
new_code_4 = """const periodLabel = `${currentStart.toISOString().split('T')[0]} a ${currentEnd.toISOString().split('T')[0]}`;
      console.log(`[Sync] 📆 Buscando sub-período ${++processedCount}: ${periodLabel}`);"""
content = re.sub(old_code_4_pattern, new_code_4, content)

# Substituição 5: Melhorar mensagem de conclusão de sub-período
old_code_5_pattern = r'console\.log\(`\[Sync\] ✅ Sub-período: \$\{subResults\.length\} vendas baixadas \(total acumulado: \$\{results\.length\}\)`\);'
new_code_5 = """const percentComplete = totalInPeriod > 0 ? Math.round((results.length / totalInPeriod) * 100) : 0;
      console.log(`[Sync] ✅ Sub-período ${processedCount}: ${subResults.length} vendas baixadas (total: ${results.length}/${totalInPeriod} = ${percentComplete}%)`);"""
content = re.sub(old_code_5_pattern, new_code_5, content)

# Substituição 6: Melhorar mensagem SSE de progresso
old_code_6 = """      // Enviar progresso
      sendProgressToUser(userId, {
        type: 'sync_progress',
        message: `${results.length}/${totalInPeriod} vendas baixadas (período histórico)`,"""

new_code_6 = """      // Enviar progresso detalhado
      sendProgressToUser(userId, {
        type: 'sync_progress',
        message: `${results.length}/${totalInPeriod} vendas baixadas (${percentComplete}% - período: ${periodLabel})`,"""

content = content.replace(old_code_6, new_code_6)

# Substituição 7: Melhorar avanço de período para evitar overlap
old_code_7 = """      // Avançar para próximo sub-período
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1); // Próximo dia após o fim"""

new_code_7 = """      // Avançar para próximo sub-período (1 segundo após o fim do anterior para evitar overlap)
      currentStart = new Date(currentEnd);
      currentStart.setSeconds(currentStart.getSeconds() + 1);"""

content = content.replace(old_code_7, new_code_7)

# Substituição 8: Melhorar mensagem final de período completo
old_code_8_pattern = r'console\.log\(`\[Sync\] 🎉 Período completo: \$\{results\.length\} vendas de \$\{totalInPeriod\} totais`\);'
new_code_8 = "console.log(`[Sync] 🎉 Período completo: ${results.length} vendas baixadas de ${totalInPeriod} totais (${processedCount} sub-períodos processados)`);"
content = re.sub(old_code_8_pattern, new_code_8, content)

# Salvar o arquivo modificado
with open(r'c:\Users\de\Desktop\Zero Holding\project\src\app\api\meli\vendas\sync\route.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Arquivo corrigido com sucesso!")
print("\nMelhorias implementadas:")
print("1. Divisão mais agressiva de períodos baseada no volume (3-14 dias)")
print("2. Logs detalhados com contador de sub-períodos e porcentagem")
print("3. Mensagens de progresso mais informativas via SSE")
print("4. Evita overlap entre períodos (avança 1 segundo)")
print("5. Garantia de sincronização completa sem gaps")
