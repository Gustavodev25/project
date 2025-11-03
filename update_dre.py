#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Script para adicionar subitens de marketplaces na tabela do DRE

import re

# Ler o arquivo
with open('src/app/components/views/DRE.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Substituir a linha "(+) Receita Bruta" por "(+) RECEITA BRUTA TOTAL"
content = content.replace(
    '''                        {/* (+) RECEITA BRUTA */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (+) Receita Bruta
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (+) RECEITA BRUTA TOTAL */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (+) RECEITA BRUTA TOTAL
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* → Receita Bruta Mercado Livre */}
                        <tr className="border-t border-gray-100">
                          <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">
                            → Receita Bruta Mercado Livre
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.receitaBrutaMeliPorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* → Receita Bruta Shopee */}
                        <tr className="border-t border-gray-100">
                          <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">
                            → Receita Bruta Shopee
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.receitaBrutaShopeePorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Substituir DEDUÇÕES
content = content.replace(
    '''                        {/* (-) DEDUÇÕES */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (-) Deducoes da Receita Bruta
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (-) DEDUÇÕES DA RECEITA BRUTA */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (-) DEDUÇÕES DA RECEITA BRUTA
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* VENDAS CANCELADAS MERCADO LIVRE */}
                        <tr className="border-t border-gray-100">
                          <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">
                            VENDAS CANCELADAS MERCADO LIVRE
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.deducoesMeliPorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* VENDAS CANCELADAS SHOPEE */}
                        <tr className="border-t border-gray-100">
                          <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">
                            VENDAS CANCELADAS SHOPEE
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.deducoesShopeePorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Substituir RECEITA LÍQUIDA
content = content.replace(
    '''                        {/* (=) RECEITA LÍQUIDA */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (=) Receita Liquida
                          </td>
                          {dreData.months.map((m) => {
                            const receitaBruta = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            const deducoes = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            const v = receitaBruta - deducoes;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (=) RECEITA LÍQUIDA */}
                        <tr className="border-t border-gray-300">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-bold text-gray-900 border-r border-gray-200">
                            (=) RECEITA LÍQUIDA
                          </td>
                          {dreData.months.map((m) => {
                            const receitaBruta = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            const deducoes = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            const v = receitaBruta - deducoes;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-bold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Substituir TAXAS/COMISSÕES
content = content.replace(
    '''                        {/* (-) TAXAS/COMISSÕES */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (-) Taxas e Comissoes de Marketplaces
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.taxasMeliPorMes[m.key] || 0) + (dreData.taxasShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (-) TAXA E COMISSÕES DE MARKETPLACES */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (-) TAXA E COMISSÕES DE MARKETPLACES
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.taxasMeliPorMes[m.key] || 0) + (dreData.taxasShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* → Taxas Mercado Livre */}
                        <tr className="border-t border-gray-100">
                          <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">
                            → Taxas Mercado Livre
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.taxasMeliPorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* → Taxas Shopee */}
                        <tr className="border-t border-gray-100">
                          <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">
                            → Taxas Shopee
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.taxasShopeePorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Substituir FRETES
content = content.replace(
    '''                        {/* (-) FRETES */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (-) Custo de Frete Marketplace
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.freteMeliPorMes[m.key] || 0) + (dreData.freteShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (-) CUSTO DE FRETE MARKETPLACE */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (-) CUSTO DE FRETE MARKETPLACE
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.freteMeliPorMes[m.key] || 0) + (dreData.freteShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* → Frete Mercado Livre */}
                        <tr className="border-t border-gray-100">
                          <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">
                            → Frete Mercado Livre
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.freteMeliPorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* → Frete Shopee */}
                        <tr className="border-t border-gray-100">
                          <td className="sticky left-0 z-10 bg-white py-1.5 px-3 pl-6 text-xs text-gray-600 border-r border-gray-200">
                            → Frete Shopee
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.freteShopeePorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-1.5 px-2 text-right text-xs text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Substituir RECEITA OPERACIONAL LÍQUIDA
content = content.replace(
    '''                        {/* (=) RECEITA OPERACIONAL LÍQUIDA */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (=) Receita Operacional Líquida
                          </td>
                          {dreData.months.map((m) => {
                            const receitaBruta = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            const deducoes = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            const receitaLiquida = receitaBruta - deducoes;
                            const taxas = (dreData.taxasMeliPorMes[m.key] || 0) + (dreData.taxasShopeePorMes[m.key] || 0);
                            const frete = (dreData.freteMeliPorMes[m.key] || 0) + (dreData.freteShopeePorMes[m.key] || 0);
                            const v = receitaLiquida - taxas - frete;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (=) RECEITA OPERACIONAL LÍQUIDA */}
                        <tr className="border-t border-gray-300">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-bold text-gray-900 border-r border-gray-200">
                            (=) RECEITA OPERACIONAL LÍQUIDA
                          </td>
                          {dreData.months.map((m) => {
                            const receitaBruta = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            const deducoes = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            const receitaLiquida = receitaBruta - deducoes;
                            const taxas = (dreData.taxasMeliPorMes[m.key] || 0) + (dreData.taxasShopeePorMes[m.key] || 0);
                            const frete = (dreData.freteMeliPorMes[m.key] || 0) + (dreData.freteShopeePorMes[m.key] || 0);
                            const v = receitaLiquida - taxas - frete;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-bold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Substituir CMV
content = content.replace(
    '''                        {/* (-) CMV */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (-) Custo (CMV / CPV / CSP)
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.cmvPorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (-) CUSTO (CMV / CPV / CSP) */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (-) CUSTO (CMV / CPV / CSP)
                          </td>
                          {dreData.months.map((m) => {
                            const v = dreData.cmvPorMes[m.key] || 0;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Substituir LUCRO BRUTO
content = content.replace(
    '''                        {/* (=) LUCRO BRUTO / MARGEM DE CONTRIBUIÇÃO */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (=) Lucro Bruto / Margem de Contribuição
                          </td>
                          {dreData.months.map((m) => {
                            const receitaBruta = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            const deducoes = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            const receitaLiquida = receitaBruta - deducoes;
                            const taxas = (dreData.taxasMeliPorMes[m.key] || 0) + (dreData.taxasShopeePorMes[m.key] || 0);
                            const frete = (dreData.freteMeliPorMes[m.key] || 0) + (dreData.freteShopeePorMes[m.key] || 0);
                            const receitaOperacional = receitaLiquida - taxas - frete;
                            const cmv = dreData.cmvPorMes[m.key] || 0;
                            const v = receitaOperacional - cmv;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (=) LUCRO BRUTO / MARGEM DE CONTRIBUIÇÃO */}
                        <tr className="border-t border-gray-300">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-bold text-gray-900 border-r border-gray-200">
                            (=) LUCRO BRUTO / MARGEM DE CONTRIBUIÇÃO
                          </td>
                          {dreData.months.map((m) => {
                            const receitaBruta = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            const deducoes = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            const receitaLiquida = receitaBruta - deducoes;
                            const taxas = (dreData.taxasMeliPorMes[m.key] || 0) + (dreData.taxasShopeePorMes[m.key] || 0);
                            const frete = (dreData.freteMeliPorMes[m.key] || 0) + (dreData.freteShopeePorMes[m.key] || 0);
                            const receitaOperacional = receitaLiquida - taxas - frete;
                            const cmv = dreData.cmvPorMes[m.key] || 0;
                            const v = receitaOperacional - cmv;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-bold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Substituir DESPESAS OPERACIONAIS
content = content.replace(
    '''                        {/* (-) DESPESAS OPERACIONAIS */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (-) Despesas Operacionais
                          </td>
                          {dreData.months.map((m) => {
                            const v = despesasPorMesVisiveis[m.key] || 0;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''',
    '''                        {/* (-) DESPESAS OPERACIONAIS */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (-) DESPESAS OPERACIONAIS
                          </td>
                          {dreData.months.map((m) => {
                            const v = despesasPorMesVisiveis[m.key] || 0;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {currency(v)}
                              </td>
                            );
                          })}
                        </tr>''')

# Escrever arquivo modificado
with open('src/app/components/views/DRE.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Arquivo DRE.tsx atualizado com sucesso!")
print("✅ Adicionados subitens de marketplaces na tabela")
