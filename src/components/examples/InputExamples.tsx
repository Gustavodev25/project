import React from 'react'
import { Input } from '@/components/ui/input'
import { useInput, useForm } from '@/hooks/useInput'

// Exemplo de uso do Input padronizado
export function InputExample() {
  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Exemplos de Inputs Padronizados</h2>
      
      {/* Input básico */}
      <div>
        <label className="input-label">
          Nome do input
          <span className="required">*</span>
        </label>
        <input 
          type="text" 
          className="input-base" 
          placeholder="Selecione uma opção"
        />
      </div>

      {/* Input com componente */}
      <Input
        label="Nome do input"
        required
        placeholder="Selecione uma opção"
      />

      {/* Input com erro */}
      <Input
        label="Campo com erro"
        required
        error="Este campo é obrigatório"
        placeholder="Digite algo aqui"
      />

      {/* Input com texto de ajuda */}
      <Input
        label="Campo com ajuda"
        helperText="Este é um texto de ajuda para o usuário"
        placeholder="Digite algo aqui"
      />

      {/* Input de email */}
      <Input
        label="Email"
        type="email"
        required
        placeholder="seu@email.com"
      />

      {/* Input de senha */}
      <Input
        label="Senha"
        type="password"
        required
        placeholder="Digite sua senha"
      />

      {/* Select */}
      <div>
        <label className="input-label">
          Selecione uma opção
          <span className="required">*</span>
        </label>
        <select className="input-base input-select">
          <option value="">Selecione uma opção</option>
          <option value="opcao1">Opção 1</option>
          <option value="opcao2">Opção 2</option>
          <option value="opcao3">Opção 3</option>
        </select>
      </div>

      {/* Textarea */}
      <div>
        <label className="input-label">
          Comentários
        </label>
        <textarea 
          className="input-base input-textarea" 
          placeholder="Digite seus comentários aqui..."
        />
      </div>
    </div>
  )
}

// Exemplo de formulário completo usando hooks
export function FormExample() {
  const form = useForm({
    initialValues: {
      nome: '',
      email: '',
      telefone: '',
      mensagem: ''
    },
    validationRules: {
      nome: (value) => !value.trim() ? 'Nome é obrigatório' : null,
      email: (value) => {
        if (!value.trim()) return 'Email é obrigatório'
        if (!/\S+@\S+\.\S+/.test(value)) return 'Email inválido'
        return null
      },
      telefone: (value) => !value.trim() ? 'Telefone é obrigatório' : null,
      mensagem: (value) => !value.trim() ? 'Mensagem é obrigatória' : null
    },
    onSubmit: (values) => {
      console.log('Formulário enviado:', values)
      alert('Formulário enviado com sucesso!')
    }
  })

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Formulário Completo</h2>
      
      <form onSubmit={form.handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="input-label">
            Nome Completo
            <span className="required">*</span>
          </label>
          <input 
            {...form.getFieldProps('nome')}
            type="text" 
            className="input-base"
            placeholder="Digite seu nome completo"
          />
          {form.errors.nome && (
            <p className="input-error">{form.errors.nome}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="input-label">
            Email
            <span className="required">*</span>
          </label>
          <input 
            {...form.getFieldProps('email')}
            type="email" 
            className="input-base"
            placeholder="seu@email.com"
          />
          {form.errors.email && (
            <p className="input-error">{form.errors.email}</p>
          )}
        </div>

        {/* Telefone */}
        <div>
          <label className="input-label">
            Telefone
            <span className="required">*</span>
          </label>
          <input 
            {...form.getFieldProps('telefone')}
            type="tel" 
            className="input-base"
            placeholder="(11) 99999-9999"
          />
          {form.errors.telefone && (
            <p className="input-error">{form.errors.telefone}</p>
          )}
        </div>

        {/* Mensagem */}
        <div>
          <label className="input-label">
            Mensagem
            <span className="required">*</span>
          </label>
          <textarea 
            {...form.getFieldProps('mensagem')}
            className="input-base input-textarea"
            placeholder="Digite sua mensagem aqui..."
          />
          {form.errors.mensagem && (
            <p className="input-error">{form.errors.mensagem}</p>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-4 pt-4">
          <button 
            type="submit"
            className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            Enviar
          </button>
          <button 
            type="button"
            onClick={form.reset}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Limpar
          </button>
        </div>
      </form>
    </div>
  )
}

// Exemplo usando hook individual
export function SingleInputExample() {
  const nomeInput = useInput({
    required: true,
    validate: (value) => {
      if (value.length < 2) return 'Nome deve ter pelo menos 2 caracteres'
      return null
    }
  })

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Input Individual</h2>
      
      <div>
        <label className="input-label">
          Nome
          <span className="required">*</span>
        </label>
        <input 
          {...nomeInput.inputProps}
          type="text" 
          className="input-base"
          placeholder="Digite seu nome"
        />
        {nomeInput.error && (
          <p className="input-error">{nomeInput.error}</p>
        )}
        <p className="input-helper">
          Valor atual: {nomeInput.value || '(vazio)'}
        </p>
      </div>
    </div>
  )
}
