    "use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ContaInfo {
  id: string;
  nickname?: string | null;
  ml_user_id?: number;
  shop_id?: string;
  merchant_id?: string;
  newOrdersCount?: number;
}

interface SyncProgress {
  type: "sync_start" | "sync_progress" | "sync_complete" | "sync_error";
  message: string;
  fetched?: number;
  expected?: number;
  accountNickname?: string;
  accountId?: string;
  currentStep?: string;
  steps?: {
    accountId: string;
    accountName: string;
    currentStep: 'pending' | 'fetching' | 'saving' | 'completed' | 'error';
    progress: number;
    fetched?: number;
    expected?: number;
    error?: string;
  }[];
}

interface ModalSyncVendasProps {
  isOpen: boolean;
  onClose: () => void;
  platform: "Mercado Livre" | "Shopee";
  contas: ContaInfo[];
  onStartSync: (accountIds?: string[], orderIdsByAccount?: Record<string, string[]>) => void;
  isSyncing: boolean;
  progress?: SyncProgress;
  onSyncComplete?: () => void;
}

export default function ModalSyncVendas({
  isOpen,
  onClose,
  platform,
  contas,
  onStartSync,
  isSyncing,
  progress,
  onSyncComplete,
}: ModalSyncVendasProps) {
  const [step, setStep] = useState<"verify" | "select" | "syncing">("verify");
  const [isChecking, setIsChecking] = useState(false);
  const [contasInfo, setContasInfo] = useState<ContaInfo[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [totalNew, setTotalNew] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [orderIdsByAccount, setOrderIdsByAccount] = useState<Record<string, string[]>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [checkProgress, setCheckProgress] = useState<{
    page?: number;
    offset?: number;
    total?: number;
    fetched?: number;
    accountName?: string;
  } | null>(null);
  const [verificationLog, setVerificationLog] = useState<string>('');

  // Animações de abertura/fechamento
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
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

  // Gerenciar step baseado nos dados existentes
  useEffect(() => {
    if (isOpen) {
      if (contasInfo.length === 0) {
        // Primeira vez ou sem dados - vai para verificação
        setStep("verify");
        setError(null);
        setCheckProgress(null);
      } else if (!isSyncing) {
        // Já tem dados e não está sincronizando - vai direto para seleção
        setStep("select");
      }
    }
  }, [isOpen, contasInfo.length, isSyncing]);

  // Bloquear scroll do body quando modal aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Manter o modal no step "syncing" quando a sincronização está ativa
  useEffect(() => {
    if (isSyncing && step !== "syncing") {
      setStep("syncing");
    }
  }, [isSyncing, step]);

  // Atualizar para step de sucesso ao completar (mas NÃO fechar automaticamente)
  useEffect(() => {
    if (progress?.type === "sync_complete" && !isSyncing) {
      // Chamar callback de conclusão
      onSyncComplete?.();
      
      // Remover contas já sincronizadas da lista
      setTimeout(() => {
        const syncedAccountIds = progress?.steps?.filter(s => s.currentStep === 'completed').map(s => s.accountId) || [];
        
        // Atualizar contasInfo removendo contas sincronizadas
        setContasInfo(prev => prev.filter(c => !syncedAccountIds.includes(c.id)));
        
        // Atualizar orderIdsByAccount removendo contas sincronizadas
        setOrderIdsByAccount(prev => {
          const updated = { ...prev };
          syncedAccountIds.forEach(id => delete updated[id]);
          return updated;
        });
        
        // Se ainda há contas, volta para select. Se não, vai para verify
        setContasInfo(prev => {
          if (prev.length > 0) {
            setStep("select");
          } else {
            setStep("verify");
          }
          return prev;
        });
      }, 500);
    }
  }, [progress, isSyncing, onSyncComplete]);

  const handleVerify = async () => {
    setIsChecking(true);
    setError(null);
    setVerificationLog('');

    try {
      // 1. Buscar contas da API se as props contas estiverem vazias
      let contasDisponiveis = contas;
      
      if (!contasDisponiveis || contasDisponiveis.length === 0) {
        setVerificationLog('🔍 Buscando contas conectadas...');
        console.log('[ModalSync] Contas vazias nas props, buscando da API...');
        const accountsApiUrl =
          platform === "Mercado Livre"
            ? "/api/meli/accounts"
            : "/api/shopee/accounts";
        
        const accountsRes = await fetch(accountsApiUrl, {
          cache: "no-store",
          credentials: "include",
        });
        
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          contasDisponiveis = Array.isArray(accountsData) ? accountsData : [];
          console.log('[ModalSync] Contas carregadas da API:', contasDisponiveis);
          setVerificationLog(`✓ ${contasDisponiveis.length} conta(s) encontrada(s)`);
        }
      } else {
        setVerificationLog(`✓ ${contasDisponiveis.length} conta(s) conectada(s)`);
      }

      // Aguardar 300ms para mostrar a mensagem
      await new Promise(resolve => setTimeout(resolve, 300));

      // 2. Verificar vendas novas
      setVerificationLog('🔄 Verificando vendas das últimas 48 horas...');
      
      const apiUrl =
        platform === "Mercado Livre"
          ? "/api/meli/vendas/check"
          : "/api/shopee/vendas/check";

      const res = await fetch(apiUrl, {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }

      setVerificationLog('📊 Processando resultados...');
      const result = await res.json();
      const newCount = result.totals?.new || 0;
      const newOrdersByAccount = result.newOrdersByAccount || {};
      const newOrders = result.newOrders || [];

      // 3. Extrair IDs das vendas novas por conta
      setVerificationLog('🗂️ Organizando vendas por conta...');
      const ordersByAccount: Record<string, string[]> = {};
      newOrders.forEach((order: any) => {
        const accountId = order.accountId || order.shopId;
        if (accountId) {
          if (!ordersByAccount[accountId]) {
            ordersByAccount[accountId] = [];
          }
          ordersByAccount[accountId].push(order.orderId);
        }
      });
      
      console.log('[ModalSync] Order IDs por conta:', ordersByAccount);
      setOrderIdsByAccount(ordersByAccount);

      // 4. Mapear contas com quantidade de vendas novas
      const contasComInfo = contasDisponiveis.map((conta) => ({
        ...conta,
        newOrdersCount: newOrdersByAccount[conta.id] || 0,
      }));

      console.log('[ModalSync] Contas com info:', contasComInfo);
      
      // Mostrar resumo final
      if (newCount > 0) {
        const contasComVendas = contasComInfo.filter(c => (c.newOrdersCount || 0) > 0);
        setVerificationLog(`✅ ${newCount} venda(s) nova(s) encontrada(s) em ${contasComVendas.length} conta(s)!`);
      } else {
        setVerificationLog('ℹ️ Nenhuma venda nova encontrada');
      }
      
      // Aguardar 500ms para mostrar o resultado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setContasInfo(contasComInfo);
      setTotalNew(newCount);
      setStep("select");

      // 5. Pré-selecionar contas com vendas novas (ou todas se nenhuma tiver vendas)
      const contasComVendas = contasComInfo.filter((c) => (c.newOrdersCount || 0) > 0);
      if (contasComVendas.length > 0) {
        setSelectedAccountIds(contasComVendas.map((c) => c.id));
      } else {
        // Se não houver vendas novas, selecionar todas as contas
        setSelectedAccountIds(contasComInfo.map((c) => c.id));
      }
    } catch (err) {
      console.error("Erro ao verificar vendas:", err);
      setError("Erro ao verificar vendas. Tente novamente.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartSync = async () => {
    // Verificar novamente antes de sincronizar
    setIsChecking(true);
    try {
      const apiUrl =
        platform === "Mercado Livre"
          ? "/api/meli/vendas/check"
          : "/api/shopee/vendas/check";

      const res = await fetch(apiUrl, {
        cache: "no-store",
        credentials: "include",
      });

      if (res.ok) {
        const result = await res.json();
        const newCount = result.totals?.new || 0;
        
        // Atualizar contagem
        setTotalNew(newCount);
        
        // Se não houver vendas novas, mostrar mensagem
        if (newCount === 0) {
          setError("Nenhuma venda nova encontrada. As vendas podem já ter sido sincronizadas.");
          setIsChecking(false);
          return;
        }
      }
    } catch (err) {
      console.error("Erro ao verificar antes de sincronizar:", err);
    } finally {
      setIsChecking(false);
    }

    // Prosseguir com sincronização
    setStep("syncing");
    
    // Preparar dados para sincronização otimizada
    const accountsToSync = selectedAccountIds.length > 0 ? selectedAccountIds : undefined;
    
    // Filtrar IDs apenas das contas selecionadas
    const filteredOrderIds: Record<string, string[]> = {};
    if (accountsToSync) {
      accountsToSync.forEach(accountId => {
        if (orderIdsByAccount[accountId]) {
          filteredOrderIds[accountId] = orderIdsByAccount[accountId];
        }
      });
    } else {
      Object.assign(filteredOrderIds, orderIdsByAccount);
    }
    
    console.log('[ModalSync] Iniciando sincronização com IDs:', {
      accounts: accountsToSync,
      orderIds: filteredOrderIds
    });
    
    // Passar IDs específicos para a sincronização
    onStartSync(accountsToSync, filteredOrderIds);
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAccountIds.length === contasInfo.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(contasInfo.map((c) => c.id));
    }
  };

  const getAccountLabel = (conta: ContaInfo) => {
    if (conta.nickname) return conta.nickname;
    if (conta.ml_user_id) return `Conta ${conta.ml_user_id}`;
    if (conta.shop_id) return conta.shop_id;
    if (conta.merchant_id) return conta.merchant_id;
    return conta.id;
  };

  const calculateProgress = () => {
    if (!progress?.expected || !progress?.fetched) return 0;
    return Math.round((progress.fetched / progress.expected) * 100);
  };

  if (!shouldRender) return null;

  const modalContent = (
    <>
      {/* Backdrop com blur progressivo */}
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
        onClick={() => !isSyncing && onClose()}
      />

      {/* Container do modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
        onClick={() => !isSyncing && onClose()}
      >
        <div
          className={`relative w-full max-w-md pointer-events-auto transition-all duration-350 ease-out ${
            isAnimating
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-8"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
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
                    <path
                      stroke="none"
                      d="M0 0h24v24H0z"
                      fill="none"
                    />
                    <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
                    <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Sincronizar Vendas
                  </h2>
                  <p className="text-xs text-gray-600">{platform}</p>
                </div>
              </div>
              {!isSyncing && (
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
          <div className="px-6 py-5">
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
                    Verificar Novas Vendas
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Vamos verificar quantas vendas novas existem em cada conta
                    conectada.
                  </p>

                  {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={handleVerify}
                      disabled={isChecking}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChecking ? (
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
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>Verificar Agora</span>
                        </>
                      )}
                    </button>

                    {/* Log de verificação em tempo real */}
                    {isChecking && verificationLog && (
                      <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                        <div className="flex items-center gap-2">
                          <div className="animate-pulse">
                            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                          </div>
                          <p className="text-sm font-medium text-blue-900">
                            {verificationLog}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Progresso da verificação */}
                    {isChecking && checkProgress && (
                      <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                        <div className="space-y-1.5">
                          {checkProgress.accountName && (
                            <p className="text-xs font-medium text-blue-900">
                              {checkProgress.accountName}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-blue-700">
                            <span>
                              Página {checkProgress.page || 0} • Offset: {checkProgress.offset || 0}
                            </span>
                            <span className="font-semibold">
                              {checkProgress.fetched || 0}/{checkProgress.total || 0}
                            </span>
                          </div>
                          {checkProgress.total && checkProgress.fetched !== undefined && (
                            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, ((checkProgress.fetched / checkProgress.total) * 100))}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Seleção de contas */}
            {step === "select" && (
              <div className="space-y-4">
                {/* Resultado da verificação */}
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-600"
                    >
                      <path
                        stroke="none"
                        d="M0 0h24v24H0z"
                        fill="none"
                      />
                      <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
                      <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
                    </svg>
                    <span className="text-2xl font-bold text-blue-900">
                      {totalNew}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-blue-700">
                    {totalNew === 0
                      ? "Nenhuma venda nova encontrada"
                      : totalNew === 1
                      ? "Nova venda encontrada"
                      : "Novas vendas encontradas"}
                  </p>
                </div>

                {/* Lista de contas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Contas para sincronizar:
                    </span>
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {selectedAccountIds.length === contasInfo.length
                        ? "Limpar"
                        : "Todas"}
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 p-1">
                    {contasInfo.map((conta) => {
                      const isSelected = selectedAccountIds.includes(conta.id);
                      return (
                        <div
                          key={conta.id}
                          onClick={() => toggleAccountSelection(conta.id)}
                          className={`relative flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                            isSelected
                              ? "bg-orange-100 border-2 border-orange-500 shadow-sm ring-2 ring-orange-200"
                              : "bg-white border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                          }`}
                        >

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${
                              isSelected ? "text-orange-900" : "text-gray-900"
                            }`}>
                              {getAccountLabel(conta)}
                            </p>
                          </div>
                          {conta.newOrdersCount && conta.newOrdersCount > 0 ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 rounded-full">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-orange-600"
                              >
                                <path d="M12 5v14m7-7H5" />
                              </svg>
                              <span className="text-xs font-semibold text-orange-700">
                                {conta.newOrdersCount}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">
                              0
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedAccountIds.length > 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      {selectedAccountIds.length} conta(s) selecionada(s)
                    </p>
                  ) : (
                    <p className="text-xs text-orange-600 font-medium">
                      ⚠️ Nenhuma conta selecionada - todas serão
                      sincronizadas
                    </p>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleStartSync}
                      disabled={isChecking || selectedAccountIds.length === 0}
                      className="flex-1 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChecking ? "Verificando..." : "Sincronizar"}
                    </button>
                  </div>
                  <button
                    onClick={handleVerify}
                    disabled={isChecking}
                    className="w-full rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔄 Verificar Novamente
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Sincronizando */}
            {step === "syncing" && (
              <div className="space-y-4">
                {progress?.type === "sync_complete" ? (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-green-600"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-green-900 mb-1">
                      Sincronização Concluída!
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {progress?.message || "Vendas sincronizadas com sucesso"}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                      >
                        Fechar
                      </button>
                      {contasInfo.length > 0 && (
                        <button
                          onClick={() => setStep("select")}
                          className="px-4 py-2 rounded-md border border-green-500 text-green-700 font-medium hover:bg-green-50 transition-colors"
                        >
                          Sincronizar Outras Contas
                        </button>
                      )}
                    </div>
                  </div>
                ) : progress?.type === "sync_error" ? (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
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
                        className="text-red-600"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-red-900 mb-1">
                      Erro na Sincronização
                    </h3>
                    <p className="text-sm text-gray-600">
                      {progress?.message || "Ocorreu um erro"}
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-4 w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h3 className="text-base font-semibold text-gray-900">
                        Sincronizando Contas
                      </h3>
                      <p className="text-sm text-gray-600">
                        Acompanhe o progresso de cada conta
                      </p>
                    </div>

                    {/* Cards de progresso por conta */}
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {progress?.steps && progress.steps.length > 0 ? (
                        progress.steps.map((stepInfo) => {
                          const stepProgress = stepInfo.progress || 0;
                          const isCompleted = stepInfo.currentStep === 'completed';
                          const isError = stepInfo.currentStep === 'error';
                          const isPending = stepInfo.currentStep === 'pending';
                          const isProcessing = stepInfo.currentStep === 'fetching' || stepInfo.currentStep === 'saving';

                          return (
                            <div
                              key={stepInfo.accountId}
                              className={`rounded-lg border-2 p-4 transition-all ${
                                isCompleted
                                  ? 'bg-green-50 border-green-300'
                                  : isError
                                  ? 'bg-red-50 border-red-300'
                                  : isProcessing
                                  ? 'bg-orange-50 border-orange-300'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {/* Header do card */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                      isCompleted
                                        ? 'bg-green-500'
                                        : isError
                                        ? 'bg-red-500'
                                        : isProcessing
                                        ? 'bg-orange-500'
                                        : 'bg-gray-400'
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-white"
                                      >
                                        <polyline points="20,6 9,17 4,12" />
                                      </svg>
                                    ) : isError ? (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="text-white"
                                      >
                                        <path d="M18 6l-12 12M6 6l12 12" />
                                      </svg>
                                    ) : isProcessing ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    ) : (
                                      <span className="text-white text-xs font-bold">
                                        {stepInfo.accountName.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {stepInfo.accountName}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {stepInfo.currentStep === 'pending' && 'Aguardando...'}
                                      {stepInfo.currentStep === 'fetching' && 'Buscando vendas...'}
                                      {stepInfo.currentStep === 'saving' && 'Salvando no banco...'}
                                      {stepInfo.currentStep === 'completed' && 'Concluído'}
                                      {stepInfo.currentStep === 'error' && 'Erro'}
                                    </p>
                                  </div>
                                </div>
                                {stepInfo.fetched !== undefined && stepInfo.expected !== undefined && (
                                  <span className="text-xs font-semibold text-gray-700">
                                    {stepInfo.fetched}/{stepInfo.expected}
                                  </span>
                                )}
                              </div>

                              {/* Progress bar */}
                              {!isPending && (
                                <div className="space-y-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        isCompleted
                                          ? 'bg-green-500'
                                          : isError
                                          ? 'bg-red-500'
                                          : 'bg-orange-500'
                                      }`}
                                      style={{ width: `${stepProgress}%` }}
                                    />
                                  </div>
                                  {isProcessing && (
                                    <p className="text-xs text-gray-500 text-right">
                                      {stepProgress}%
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Mensagem de erro */}
                              {isError && stepInfo.error && (
                                <p className="mt-2 text-xs text-red-600">
                                  {stepInfo.error}
                                </p>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        // Fallback para contas selecionadas (se não houver steps ainda)
                        contasInfo
                          .filter((c) => selectedAccountIds.includes(c.id))
                          .map((conta) => (
                            <div
                              key={conta.id}
                              className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {getAccountLabel(conta)}
                                    </p>
                                    <p className="text-xs text-gray-600">Iniciando...</p>
                                  </div>
                                </div>
                                {conta.newOrdersCount !== undefined && (
                                  <span className="text-xs font-semibold text-gray-700">
                                    0/{conta.newOrdersCount}
                                  </span>
                                )}
                              </div>
                              
                              {/* Barra de progresso inicial */}
                              <div className="space-y-1">
                                <div className="w-full bg-orange-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-2 rounded-full bg-orange-500 transition-all duration-300 animate-pulse"
                                    style={{ width: '10%' }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 text-right">0%</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </>
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
