export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom right, #1e3a8a, #3b82f6)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '48px',
        maxWidth: '600px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          marginBottom: '24px',
          color: '#1e293b'
        }}>
          ContaZoom
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#64748b',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          Sistema de gestão integrado com Mercado Livre, Shopee e Bling.
        </p>

        <div style={{
          background: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#334155'
          }}>
            Status do Sistema
          </h2>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{ marginBottom: '8px', color: '#22c55e' }}>✓ API Backend Online</li>
            <li style={{ marginBottom: '8px', color: '#22c55e' }}>✓ Banco de Dados Conectado</li>
            <li style={{ marginBottom: '8px', color: '#22c55e' }}>✓ Integrações Configuradas</li>
          </ul>
        </div>

        <div style={{
          padding: '16px',
          background: '#eff6ff',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <strong>Backend API:</strong>{' '}
            <a
              href="https://project-backend-rjoh.onrender.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563eb', textDecoration: 'underline' }}
            >
              https://project-backend-rjoh.onrender.com
            </a>
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          <a
            href="/api/test"
            style={{
              display: 'block',
              padding: '12px 16px',
              background: '#3b82f6',
              color: 'white',
              textAlign: 'center',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
          >
            Testar API
          </a>
          <a
            href="https://github.com/Gustavodev25/project"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '12px 16px',
              background: '#64748b',
              color: 'white',
              textAlign: 'center',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
