"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import gsap from "gsap";
import Sidebar from "./ui/Sidebar";
import Topbar from "./ui/Topbar";
import { EmptyState } from "./ui/CardsContas";
import Modal from "./ui/Modal";
import EditModal from "./ui/EditModal";
import DeleteModal from "./ui/DeleteModal";
import { useToast } from "./ui/toaster";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface Aliquota {
  id: string;
  conta: string;
  aliquota: number;
  dataInicio: string;
  dataFim: string;
  descricao?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Conta {
  id: string;
  nome: string;
  plataforma: string;
  tipo: string;
}

export default function Aliquotas() {
  const toast = useToast();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [aliquotas, setAliquotas] = useState<Aliquota[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Aliquota | null>(null);
  const [deletingItem, setDeletingItem] = useState<Aliquota | null>(null);

  const [formData, setFormData] = useState({
    conta: "",
    aliquota: "",
    mesAno: new Date().toISOString().slice(0, 7), // formato: YYYY-MM
    descricao: "",
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasInitialSet = useRef(false);
  useIsoLayout(() => {
    if (hasInitialSet.current) return;
    const el = containerRef.current;
    if (!el) return;
    hasInitialSet.current = true;
    gsap.set(el, {
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed]);

  useIsoLayout(() => {
    const el = containerRef.current;
    if (!el) return;
    gsap.to(el, {
      duration: 0.35,
      ease: "power2.inOut",
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, isSidebarCollapsed ? "1" : "0");
    } catch {}
  }, [isSidebarCollapsed]);

  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  const loadAliquotas = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/financeiro/aliquotas", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAliquotas(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar alíquotas:", error);
      toast.toast({
        variant: "error",
        title: "Erro ao carregar",
        description: "Não foi possível carregar as alíquotas.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadContas = async () => {
    try {
      const response = await fetch("/api/financeiro/aliquotas/contas", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setContas(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  };

  useEffect(() => {
    loadAliquotas();
    loadContas();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      conta: "",
      aliquota: "",
      mesAno: new Date().toISOString().slice(0, 7),
      descricao: "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Converter mesAno para dataInicio e dataFim (primeiro e último dia do mês)
      const [year, month] = formData.mesAno.split('-').map(Number);
      const dataInicio = new Date(year, month - 1, 1); // Primeiro dia do mês
      const dataFim = new Date(year, month, 0); // Último dia do mês
      
      const dataToSend = {
        conta: formData.conta,
        aliquota: formData.aliquota,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
        descricao: formData.descricao,
      };

      const response = await fetch("/api/financeiro/aliquotas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao salvar alíquota");
      }

      await loadAliquotas();

      toast.toast({
        variant: "success",
        title: "Sucesso!",
        description: "Alíquota cadastrada com sucesso!",
      });

      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.toast({
        variant: "error",
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro ao salvar alíquota. Tente novamente.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: Aliquota) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = (item: Aliquota) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleEditSave = async (data: any) => {
    try {
      // Converter mesAno para dataInicio e dataFim se fornecido
      let dataToSend = { ...data };
      if (data.mesAno && data.mesAno.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = data.mesAno.split('-').map(Number);
        dataToSend.dataInicio = new Date(year, month - 1, 1).toISOString();
        dataToSend.dataFim = new Date(year, month, 0).toISOString();
        delete dataToSend.mesAno;
      }

      const response = await fetch(`/api/financeiro/aliquotas/${editingItem?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar alíquota");
      }

      await loadAliquotas();

      toast.toast({
        variant: "success",
        title: "Sucesso!",
        description: "Alíquota atualizada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.toast({
        variant: "error",
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Erro ao atualizar alíquota. Tente novamente.",
      });
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`/api/financeiro/aliquotas/${deletingItem?.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir alíquota");
      }

      await loadAliquotas();

      toast.toast({
        variant: "success",
        title: "Sucesso!",
        description: "Alíquota excluída com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.toast({
        variant: "error",
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Erro ao excluir alíquota. Tente novamente.",
      });
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const formatMesAno = (dataInicio: string) => {
    const date = new Date(dataInicio);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const formatPercent = (value: number | any) => {
    const numValue = typeof value === 'number' ? value : Number(value);
    return `${numValue.toFixed(2)}%`;
  };

  const renderModalContent = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="conta" className="block text-sm font-medium text-gray-700 mb-1">
          Conta / Plataforma
        </label>
        <select
          id="conta"
          name="conta"
          value={formData.conta}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
        >
          <option value="">Selecione uma conta</option>
          {contas.map((conta) => (
            <option key={conta.id} value={conta.nome}>
              {conta.nome} ({conta.plataforma})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="aliquota" className="block text-sm font-medium text-gray-700 mb-1">
          Alíquota (%)
        </label>
        <input
          type="number"
          id="aliquota"
          name="aliquota"
          value={formData.aliquota}
          onChange={handleInputChange}
          required
          step="0.01"
          min="0"
          max="100"
          placeholder="Ex: 5.00 para 5%"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
        />
      </div>

      <div>
        <label htmlFor="mesAno" className="block text-sm font-medium text-gray-700 mb-1">
          Mês/Ano
        </label>
        <input
          type="month"
          id="mesAno"
          name="mesAno"
          value={formData.mesAno}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
        />
        <p className="mt-1 text-xs text-gray-500">A alíquota será aplicada ao mês inteiro</p>
      </div>

      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
          Descrição (Opcional)
        </label>
        <textarea
          id="descricao"
          name="descricao"
          value={formData.descricao}
          onChange={handleInputChange}
          rows={3}
          placeholder="Ex: Simples Nacional, Lucro Presumido, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleCloseModal}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className={`flex-1 px-4 py-2 rounded-lg transition-colors text-white ${
            isSaving ? "bg-orange-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {isSaving ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/60 border-t-white"></span>
              Salvando...
            </span>
          ) : (
            "Salvar"
          )}
        </button>
      </div>
    </form>
  );

  const getEditFields = () => [
    { 
      name: "conta", 
      label: "Conta / Plataforma", 
      type: "select" as const, 
      required: true,
      options: contas.map(conta => ({ 
        value: conta.nome, 
        label: `${conta.nome} (${conta.plataforma})` 
      }))
    },
    { 
      name: "aliquota", 
      label: "Alíquota (%)", 
      type: "number" as const, 
      required: true, 
      step: "0.01", 
      min: "0",
      max: "100"
    },
    { name: "mesAno", label: "Mês/Ano", type: "text" as const, required: true, placeholder: "YYYY-MM" },
    { name: "descricao", label: "Descrição", type: "text" as const, required: false },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 relative">
      <Sidebar
        collapsed={isSidebarCollapsed}
        mobileOpen={isSidebarMobileOpen}
        onMobileClose={() => setIsSidebarMobileOpen(false)}
      />

      <Topbar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((s) => !s)}
        onMobileMenu={() => setIsSidebarMobileOpen(true)}
      />

      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-left">
                <h1 className="text-2xl font-semibold text-gray-900">
                  Alíquotas de Impostos
                </h1>
                <p className="mt-1 text-sm text-gray-600 text-left">
                  Gerencie as alíquotas de impostos sobre faturamento por conta e período.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenModal}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors shadow-sm"
                >
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
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Adicionar Alíquota
                </button>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-500"></div>
            </div>
          ) : aliquotas.length === 0 ? (
            <EmptyState
              icons={[
                <svg
                  key="icon1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ]}
              title="Nenhuma alíquota cadastrada"
              description="Comece adicionando uma alíquota de imposto sobre faturamento."
              action={{
                label: "Adicionar Alíquota",
                onClick: handleOpenModal,
                icon: (
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
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                ),
              }}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conta
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alíquota
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mês/Ano
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {aliquotas.map((aliquota) => (
                      <tr key={aliquota.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{aliquota.conta}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPercent(aliquota.aliquota)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {formatMesAno(aliquota.dataInicio)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {aliquota.descricao || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                            aliquota.ativo 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {aliquota.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(aliquota)}
                            className="text-orange-600 hover:text-orange-900 mr-3"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(aliquota)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Modais */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Adicionar Alíquota"
      >
        {renderModalContent()}
      </Modal>

      {editingItem && (
        <EditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleEditSave}
          title="Editar Alíquota"
          fields={getEditFields()}
          data={{
            conta: editingItem.conta,
            aliquota: Number(editingItem.aliquota).toString(),
            mesAno: new Date(editingItem.dataInicio).toISOString().slice(0, 7),
            descricao: editingItem.descricao || "",
          }}
        />
      )}

      {deletingItem && (
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Excluir Alíquota"
          message="Tem certeza que deseja excluir esta alíquota? Esta ação não pode ser desfeita."
        />
      )}
    </div>
  );
}
