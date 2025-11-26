"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { API_CONFIG } from "@/lib/api-config";

interface ContaInfo {
  id: string;
  nickname?: string | null;
  ml_user_id?: number;
  shop_id?: string;
  shop_name?: string | null;
  platform: 'meli' | 'shopee';
  newOrdersCount?: number;
}

interface SyncStep {
  accountId: string;
  accountName: string;
  platform: 'meli' | 'shopee';
  status: 'pending' | 'syncing' | 'completed' | 'error';
  progress: number;
  count?: number;
  error?: string;
}

interface ModalSyncVendasDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlatform: 'todos' | 'mercado_livre' | 'shopee';
  onSyncComplete?: () => void;
}

export default function ModalSyncVendasDashboard({
  isOpen,
  onClose,
  selectedPlatform,
  onSyncComplete,
}: ModalSyncVendasDashboardProps) {
  const [step, setStep] = useState<"verify" | "select" | "syncing">("verify");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [verificationLog, setVerificationLog] = useState<string>('');
  const [contas, setContas] = useState<ContaInfo[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([]);

  // Animações de abertura/fechamento
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setStep("verify");
      setError(null);
      setVerificationLog('');
      setSelectedAccountIds([]);
      setSyncSteps([]);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Bloquear scroll do body quando modal aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setVerificationLog('Buscando contas conectadas...');

    try {
      const contasCarregadas: ContaInfo[] = [];

      // Mercado Livre
      if (selectedPlatform === 'todos' || selectedPlatform === 'mercado_livre') {
        const resML = await API_CONFIG.fetch('/api/meli/accounts', { cache: 'no-store', credentials: 'include' });
        if (resML.ok) {
          const accountsML = await resML.json();
          accountsML.forEach((acc: any) => {
            contasCarregadas.push({
              id: acc.id,
              nickname: acc.nickname,
              ml_user_id: acc.ml_user_id,
              platform: 'meli',
              newOrdersCount: 0
            });
          });
        }
      }

      // Shopee
      if (selectedPlatform === 'todos' || selectedPlatform === 'shopee') {
        const resShopee = await API_CONFIG.fetch('/api/shopee/accounts', { cache: 'no-store', credentials: 'include' });
        if (resShopee.ok) {
          const accountsShopee = await resShopee.json();
          accountsShopee.forEach((acc: any) => {
            contasCarregadas.push({
              id: acc.id,
              shop_id: acc.shop_id,
              shop_name: acc.shop_name,
              platform: 'shopee',
              newOrdersCount: 0
            });
          });
        }
      }

      if (contasCarregadas.length === 0) {
        setError('Nenhuma conta conectada encontrada');
        setIsVerifying(false);
        return;
      }

      setVerificationLog(`${contasCarregadas.length} conta(s) encontrada(s)`);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verificar vendas novas para cada conta
      setVerificationLog('Verificando novas vendas...');
      
      for (const conta of contasCarregadas) {
        if (conta.platform === 'meli') {
          try {
            const res = await fetch('/api/meli/vendas/check', { cache: 'no-store', credentials: 'include' });
            if (res.ok) {
              const data = await res.json();
              // Aproximação - divide total por número de contas ML
              const contasML = contasCarregadas.filter(c => c.platform === 'meli');
              conta.newOrdersCount = Math.floor((data?.totals?.new || 0) / contasML.length);
            }
          } catch {
            conta.newOrdersCount = 0;
          }
        } else if (conta.platform === 'shopee') {
          try {
            const res = await fetch('/api/shopee/vendas/check', { cache: 'no-store', credentials: 'include' });
            if (res.ok) {
              const data = await res.json();
              // Aproximação - divide total por número de contas Shopee
              const contasShopee = contasCarregadas.filter(c => c.platform === 'shopee');
              conta.newOrdersCount = Math.floor((data?.totals?.new || 0) / contasShopee.length);
            }
          } catch {
            conta.newOrdersCount = 0;
          }
        }
      }

      const totalNew = contasCarregadas.reduce((sum, c) => sum + (c.newOrdersCount || 0), 0);
      setContas(contasCarregadas);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (totalNew > 0) {
        setVerificationLog(`${totalNew} venda(s) nova(s) encontrada(s)!`);
        await new Promise(resolve => setTimeout(resolve, 500));
        setStep("select");
      } else {
        setVerificationLog('Nenhuma venda nova encontrada');
        await new Promise(resolve => setTimeout(resolve, 1500));
        onClose();
      }
    } catch (err) {
      console.error("Erro ao verificar vendas:", err);
      setError("Erro ao verificar vendas. Tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAccountIds.length === contas.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(contas.map(c => c.id));
    }
  };

  const handleStartSync = async () => {
    if (selectedAccountIds.length === 0) return;

    setStep("syncing");
    setIsSyncing(true);
    
    // Inicializar steps
    const steps: SyncStep[] = contas
      .filter(c => selectedAccountIds.includes(c.id))
      .map(c => ({
        accountId: c.id,
        accountName: c.platform === 'meli' ? (c.nickname || `Usuário ${c.ml_user_id}`) : (c.shop_name || `Shop ${c.shop_id}`),
        platform: c.platform,
        status: 'pending' as const,
        progress: 0
      }));
    
    setSyncSteps(steps);

    // Sincronizar cada conta
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const conta = contas.find(c => c.id === step.accountId);
      if (!conta) continue;

      // Atualizar status para syncing
      setSyncSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'syncing', progress: 10 } : s
      ));

      try {
        const apiUrl = conta.platform === 'meli' ? '/api/cron/meli-sync/trigger' : '/api/shopee/vendas/sync';
        const body = { accountIds: [conta.id] };

        const res = await fetch(apiUrl, {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          const count = (Array.isArray((data as any)?.results) ? (data as any).results.find((r: any) => r.accountId === conta.id)?.vendas : undefined)
            || (data as any)?.totals?.saved
            || (data as any)?.totals?.fetched
            || 0;
          
          // Completado com sucesso
          setSyncSteps(prev => prev.map((s, idx) =>
            idx === i ? { ...s, status: 'completed', progress: 100, count } : s
          ));
        } else {
          throw new Error(`Erro ${res.status}`);
        }
      } catch (err) {
        setSyncSteps(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'error', progress: 100, error: 'Erro na sincronização' } : s
        ));
      }

      // Pequeno delay entre contas
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsSyncing(false);
    onSyncComplete?.();
    
    // Fechar após 2 segundos
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const getDisplayName = (conta: ContaInfo) => {
    if (conta.platform === 'meli') {
      return conta.nickname || `Usuário ${conta.ml_user_id}`;
    }
    return conta.shop_name || `Shop ${conta.shop_id}`;
  };

  const getPlatformBadge = (platform: 'meli' | 'shopee') => {
    if (platform === 'meli') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Mercado Livre
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
        Shopee
      </span>
    );
  };

  const getStepStatusIcon = (status: SyncStep['status']) => {
    switch (status) {
      case 'pending':
        return (
          <div className="h-5 w-5 rounded-full bg-gray-200"></div>
        );
      case 'syncing':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
        );
      case 'completed':
        return (
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </div>
        );
    }
  };

  if (!shouldRender) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] transition-all duration-300 ease-out ${
          isAnimating
            ? "backdrop-blur-md bg-black/40"
            : "backdrop-blur-none bg-black/0"
        }`}
        style={{
          backdropFilter: isAnimating ? "blur(8px)" : "blur(0px)",
          WebkitBackdropFilter: isAnimating ? "blur(8px)" : "blur(0px)",
        }}
        onClick={() => !isSyncing && !isVerifying && onClose()}
      />

      {/* Container do modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
        onClick={() => !isSyncing && !isVerifying && onClose()}
      >
        <div
          className={`relative w-full max-w-2xl pointer-events-auto transition-all duration-350 ease-out ${
            isAnimating
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-8"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200/70 bg-gradient-to-r from-orange-50/50 to-white/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
                      <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Sincronizar Vendas
                    </h2>
                    <p className="text-xs text-gray-600">
                      {selectedPlatform === 'todos' ? 'Mercado Livre + Shopee' : 
                       selectedPlatform === 'mercado_livre' ? 'Mercado Livre' : 'Shopee'}
                    </p>
                  </div>
                </div>
                {!isSyncing && !isVerifying && (
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-200 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-500"
                    >
                      <path d="M18 6l-12 12" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Step 1: Verificação */}
              {step === "verify" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-600"
                      >
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-medium text-gray-900 mb-2">
                      Verificar e Sincronizar
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Vamos verificar quantas vendas novas existem em cada conta.
                    </p>

                    {error && (
                      <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    <div className="space-y-3">
                      <button
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVerifying ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Verificando...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20,6 9,17 4,12"/>
                            </svg>
                            <span>Verificar Vendas Novas</span>
                          </>
                        )}
                      </button>

                      {isVerifying && verificationLog && (
                        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="relative h-5 w-5">
                                <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
                                <div className="relative flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {verificationLog}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Seleção de Contas */}
              {step === "select" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Selecione as contas para sincronizar
                      </h3>
                      <button
                        onClick={handleSelectAll}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        {selectedAccountIds.length === contas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {contas.map((conta) => (
                        <label
                          key={conta.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAccountIds.includes(conta.id)}
                            onChange={() => handleToggleAccount(conta.id)}
                            className="h-4 w-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {getDisplayName(conta)}
                              </span>
                              {getPlatformBadge(conta.platform)}
                            </div>
                            {conta.newOrdersCount !== undefined && conta.newOrdersCount > 0 && (
                              <p className="text-xs text-gray-600">
                                {conta.newOrdersCount} venda(s) nova(s)
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={onClose}
                      className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleStartSync}
                      disabled={selectedAccountIds.length === 0}
                      className="flex-1 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sincronizar ({selectedAccountIds.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Sincronizando */}
              {step === "syncing" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {syncSteps.map((syncStep, index) => (
                      <div
                        key={syncStep.accountId}
                        className="rounded-lg border border-gray-200 p-4 bg-white"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {getStepStatusIcon(syncStep.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {syncStep.accountName}
                              </span>
                              {getPlatformBadge(syncStep.platform)}
                            </div>
                            <p className="text-xs text-gray-600">
                              {syncStep.status === 'pending' && 'Aguardando...'}
                              {syncStep.status === 'syncing' && 'Sincronizando...'}
                              {syncStep.status === 'completed' && `${syncStep.count || 0} vendas sincronizadas`}
                              {syncStep.status === 'error' && `${syncStep.error || 'Erro'}`}
                            </p>
                          </div>
                        </div>
                        
                        {/* Barra de progresso */}
                        {syncStep.status !== 'pending' && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  syncStep.status === 'completed' ? 'bg-green-500' :
                                  syncStep.status === 'error' ? 'bg-red-500' :
                                  'bg-orange-500'
                                }`}
                                style={{ width: `${syncStep.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!isSyncing && (
                    <div className="text-center pt-2">
                      <p className="text-sm text-green-600 font-medium mb-2">
                        Sincronização concluída!
                      </p>
                      <p className="text-xs text-gray-500">
                        Fechando automaticamente...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
