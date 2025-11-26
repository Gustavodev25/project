export default function TestInputsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Sistema de Inputs Padronizado
          </h1>
          <p className="text-lg text-gray-600">
            Demonstração dos inputs padronizados do sistema Contazoom
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Exemplo básico */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Exemplo Básico
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="input-label">
                  Nome do input
                  <span className="required">*</span>
                </label>
                <input 
                  type="text" 
                  className="input-base" 
                  placeholder="Selecione uma opção"
                  style={{
                    borderColor: '#E5E7EB',
                    boxShadow: '0 0 0 1px rgba(229, 231, 235, 0.4), 0 0 0 2px rgba(229, 231, 235, 0.2), 0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                />
              </div>

              <div>
                <label className="input-label">
                  Email
                  <span className="required">*</span>
                </label>
                <input 
                  type="email" 
                  className="input-base" 
                  placeholder="seu@email.com"
                  style={{
                    borderColor: '#E5E7EB',
                    boxShadow: '0 0 0 1px rgba(229, 231, 235, 0.4), 0 0 0 2px rgba(229, 231, 235, 0.2), 0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                />
              </div>

              <div>
                <label className="input-label">
                  Senha
                  <span className="required">*</span>
                </label>
                <input 
                  type="password" 
                  className="input-base" 
                  placeholder="Digite sua senha"
                  style={{
                    borderColor: '#E5E7EB',
                    boxShadow: '0 0 0 1px rgba(229, 231, 235, 0.4), 0 0 0 2px rgba(229, 231, 235, 0.2), 0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                />
              </div>

              <div>
                <label className="input-label">
                  Selecione uma opção
                  <span className="required">*</span>
                </label>
                <select className="input-base input-select" style={{
                  borderColor: '#E5E7EB',
                  boxShadow: '0 0 0 1px rgba(229, 231, 235, 0.4), 0 0 0 2px rgba(229, 231, 235, 0.2), 0 2px 4px rgba(0, 0, 0, 0.05)'
                }}>
                  <option value="">Selecione uma opção</option>
                  <option value="opcao1">Opção 1</option>
                  <option value="opcao2">Opção 2</option>
                  <option value="opcao3">Opção 3</option>
                </select>
              </div>

              <div>
                <label className="input-label">
                  Comentários
                </label>
                <textarea 
                  className="input-base input-textarea" 
                  placeholder="Digite seus comentários aqui..."
                  style={{
                    borderColor: '#E5E7EB',
                    boxShadow: '0 0 0 1px rgba(229, 231, 235, 0.4), 0 0 0 2px rgba(229, 231, 235, 0.2), 0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Documentação */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Como Usar o Sistema de Inputs
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  1. Inputs Padronizados
                </h3>
                <p className="text-gray-600 mb-3">
                  Use a classe input-base para inputs com fundo branco e borda na cor personalizada:
                </p>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`<div>
  <label className="input-label">
    Nome do input
    <span className="required">*</span>
  </label>
  <input 
    type="text" 
    className="input-base" 
    placeholder="Selecione uma opção"
  />
</div>`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  2. Características dos Inputs
                </h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• <strong>Fundo:</strong> Branco puro</li>
                  <li>• <strong>Borda:</strong> Cor #C5837B (2px)</li>
                  <li>• <strong>Bordas:</strong> Arredondadas (rounded-xl)</li>
                  <li>• <strong>Altura:</strong> 48px (h-12)</li>
                  <li>• <strong>Label:</strong> Cor #373737</li>
                  <li>• <strong>Placeholder:</strong> Cor #ACACAC</li>
                  <li>• <strong>Texto:</strong> Preto (#000000)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  3. Classes CSS Disponíveis
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Classes Principais:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li><code>.input-label</code> - Label</li>
                      <li><code>.input-base</code> - Input principal</li>
                      <li><code>.input-textarea</code> - Textarea</li>
                      <li><code>.input-select</code> - Select</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Estados:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li><code>.error</code> - Estado de erro</li>
                      <li><code>.success</code> - Estado de sucesso</li>
                      <li><code>.input-error</code> - Mensagem de erro</li>
                      <li><code>.input-helper</code> - Texto de ajuda</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
