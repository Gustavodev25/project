#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Script para adicionar os subitens que faltaram

import re

# Ler o arquivo
with open('src/app/components/views/DRE.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Procurar e adicionar subitens de DEDUÇÕES
for i, line in enumerate(lines):
    # Encontrar a linha com "(-) DEDUÇÕES" ou "(-) Deducoes da Receita Bruta"
    if '(-) Deducoes da Receita Bruta' in line and i < len(lines) - 15:
        # Verificar se os subitens já não foram adicionados
        next_lines = ''.join(lines[i:i+20])
        if 'VENDAS CANCELADAS MERCADO LIVRE' not in next_lines:
            # Procurar o final dessa seção (onde termina a </tr>)
            j = i + 1
            while j < len(lines) and '</tr>' not in lines[j]:
                j += 1

            # Adicionar os subitens após </tr>
            if j < len(lines):
                indent = '                        '
                new_lines = [
                    indent + '{/* VENDAS CANCELADAS MERCADO LIVRE */}\n',
                    indent + '<tr className="border-t border-gray-100">\n',
                    indent + '  <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">\n',
                    indent + '    VENDAS CANCELADAS MERCADO LIVRE\n',
                    indent + '  </td>\n',
                    indent + '  {dreData.months.map((m) => {\n',
                    indent + '    const v = dreData.deducoesMeliPorMes[m.key] || 0;\n',
                    indent + '    return (\n',
                    indent + '      <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">\n',
                    indent + '        {currency(v)}\n',
                    indent + '      </td>\n',
                    indent + '    );\n',
                    indent + '  })}\n',
                    indent + '</tr>\n',
                    indent + '{/* VENDAS CANCELADAS SHOPEE */}\n',
                    indent + '<tr className="border-t border-gray-100">\n',
                    indent + '  <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">\n',
                    indent + '    VENDAS CANCELADAS SHOPEE\n',
                    indent + '  </td>\n',
                    indent + '  {dreData.months.map((m) => {\n',
                    indent + '    const v = dreData.deducoesShopeePorMes[m.key] || 0;\n',
                    indent + '    return (\n',
                    indent + '      <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">\n',
                    indent + '        {currency(v)}\n',
                    indent + '      </td>\n',
                    indent + '    );\n',
                    indent + '  })}\n',
                    indent + '</tr>\n',
                ]
                lines = lines[:j+1] + new_lines + lines[j+1:]
                print(f"OK - Adicionados subitens de DEDUCOES apos linha {j+1}")
                break

# Procurar e adicionar subitens de TAXAS
for i, line in enumerate(lines):
    # Encontrar a linha com "(-) Taxas e Comissoes de Marketplaces"
    if '(-) Taxas e Comissoes de Marketplaces' in line and i < len(lines) - 15:
        # Verificar se os subitens já não foram adicionados
        next_lines = ''.join(lines[i:i+20])
        if '→ Taxas Mercado Livre' not in next_lines:
            # Procurar o final dessa seção (onde termina a </tr>)
            j = i + 1
            while j < len(lines) and '</tr>' not in lines[j]:
                j += 1

            # Adicionar os subitens após </tr>
            if j < len(lines):
                indent = '                        '
                new_lines = [
                    indent + '{/* → Taxas Mercado Livre */}\n',
                    indent + '<tr className="border-t border-gray-100">\n',
                    indent + '  <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">\n',
                    indent + '    → Taxas Mercado Livre\n',
                    indent + '  </td>\n',
                    indent + '  {dreData.months.map((m) => {\n',
                    indent + '    const v = dreData.taxasMeliPorMes[m.key] || 0;\n',
                    indent + '    return (\n',
                    indent + '      <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">\n',
                    indent + '        {currency(v)}\n',
                    indent + '      </td>\n',
                    indent + '    );\n',
                    indent + '  })}\n',
                    indent + '</tr>\n',
                    indent + '{/* → Taxas Shopee */}\n',
                    indent + '<tr className="border-t border-gray-100">\n',
                    indent + '  <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">\n',
                    indent + '    → Taxas Shopee\n',
                    indent + '  </td>\n',
                    indent + '  {dreData.months.map((m) => {\n',
                    indent + '    const v = dreData.taxasShopeePorMes[m.key] || 0;\n',
                    indent + '    return (\n',
                    indent + '      <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">\n',
                    indent + '        {currency(v)}\n',
                    indent + '      </td>\n',
                    indent + '    );\n',
                    indent + '  })}\n',
                    indent + '</tr>\n',
                ]
                lines = lines[:j+1] + new_lines + lines[j+1:]
                print(f"OK - Adicionados subitens de TAXAS apos linha {j+1}")
                break

# Escrever arquivo modificado
with open('src/app/components/views/DRE.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\nArquivo DRE.tsx atualizado!")
print("Subitens de Deduções e Taxas adicionados com sucesso!")
