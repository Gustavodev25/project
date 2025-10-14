"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import AvatarConta from "./AvatarConta";

type ContaML = {
  id: string;
  nickname: string | null;
  ml_user_id: number;
  expires_at: string;
};

interface ContasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContasModal({ isOpen, onClose }: ContasModalProps) {
  const [tab, setTab] = useState<"Mercado Livre" | "Shopee">("Mercado Livre");
  const [contasML, setContasML] = useState<ContaML[]>([]);
  const [contasShopee, setContasShopee] = useState<Array<{ id: string; shop_id: string; expires_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let aborted = false;

    async function loadMLAccounts() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/meli/accounts", { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error("Erro ao listar contas ML");
        const rows: ContaML[] = await res.json();
        if (!aborted) setContasML(rows || []);
      } catch (err) {
        if (!aborted) setContasML([]);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    }

    async function loadShopeeAccounts() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/shopee/accounts", { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error("Erro ao listar contas Shopee");
        const rows: Array<{ id: string; shop_id: string; expires_at: string }> = await res.json();
        if (!aborted) setContasShopee(rows || []);
      } catch (err) {
        if (!aborted) setContasShopee([]);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    }

    if (tab === "Mercado Livre") {
      loadMLAccounts();
    } else if (tab === "Shopee") {
      loadShopeeAccounts();
    }

    return () => { aborted = true; };
  }, [isOpen, tab]);

  const now = Date.now();
  const contasMLOrdenadas = contasML
    .map((c) => ({ ...c, ativa: new Date(c.expires_at).getTime() > now }))
    .sort((a, b) => Number(b.ativa) - Number(a.ativa));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contas Conectadas" size="xl">
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {(["Mercado Livre", "Shopee"] as const).map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              tab === name
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "Mercado Livre" && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-gray-600">Carregando contas...</div>
          ) : contasMLOrdenadas.length === 0 ? (
            <div className="text-sm text-gray-600">Nenhuma conta conectada.</div>
          ) : (
            contasMLOrdenadas.map((conta) => (
              <div key={conta.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 bg-white">
                <div className="flex items-center gap-3">
                  <AvatarConta conta={conta} />
                  <div className="text-sm text-gray-900">
                    {conta.nickname || `Usuário ${conta.ml_user_id}`}
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                  new Date(conta.expires_at).getTime() > now
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {new Date(conta.expires_at).getTime() > now ? "Ativa" : "Inativa"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "Shopee" && (
        <div className="text-sm text-gray-600">Ainda não há contas conectadas para Shopee.</div>
      )}
    </Modal>
  );
}
