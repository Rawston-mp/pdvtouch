import React, { useState } from 'react'

export type BalancaTerminalProps = {
  nome: string
  porta: string
}

export const BalancaTerminal: React.FC<BalancaTerminalProps> = ({ nome, porta }) => {
  const [peso, setPeso] = useState<number>(0)
  const [usuario, setUsuario] = useState<string | null>(null)
  const [pin, setPin] = useState('')

  // Simulação de autenticação
  function autenticar() {
    if (pin === '9999') setUsuario('Admin')
    else if (pin === '5555') setUsuario('Gerente')
    else if ((nome === 'Balança A' && pin === '2222') || (nome === 'Balança B' && pin === '3333'))
      setUsuario(nome)
    else if (pin === '4444') setUsuario('Caixa')
    //else if (pin === '6666') setUsuario('Atendente')
    else setUsuario('Operador')
    setPin('')
  }

  // Restringir funções administrativas para balanças
  // ...existing code...

  // Simulação de leitura de peso
  React.useEffect(() => {
    const interval = setInterval(() => {
      setPeso(Math.random() * 10)
    }, 1000)
    return () => clearInterval(interval)
  }, [porta])

  // Simulação de leitura de comanda
  function lerComanda(comanda: string) {
    // Aqui você pode registrar: { comanda, balanca: nome, usuario }
    alert(`Comanda ${comanda} lida na ${nome} por ${usuario || 'Desconhecido'}`)
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2>Digite seu PIN — {nome}</h2>
      <div>
        Peso atual: <strong>{peso.toFixed(2)} kg</strong>
      </div>
      <div>Porta: {porta}</div>
      <div>
        Usuário: <strong>{usuario || 'Não autenticado'}</strong>
      </div>
      {!usuario && (
        <div>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN do usuário"
          />
          <button onClick={autenticar}>Entrar</button>
          <div style={{ fontSize: '0.9em', color: 'orange', marginTop: '10px' }}>
            Dicas (seed): ADMIN 1111 — BALANÇA A 2222 — BALANÇA B 3333 — CAIXA 4444 — ATENDENTE 5555
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="Comanda"
          onKeyDown={(e) => {
            if (e.key === 'Enter') lerComanda((e.target as HTMLInputElement).value)
          }}
        />
        <button onClick={() => lerComanda('123')}>Ler Comanda</button>
      </div>
      {/* Botões administrativos só aparecem para Admin, Gerente, Caixa, Atendente */}
      {(usuario === 'Admin' ||
        usuario === 'Gerente' ||
        usuario === 'Caixa' ||
        usuario === 'Atendente') && (
        <div style={{ marginTop: 16 }}>
          <button>Função Administrativa</button>
        </div>
      )}
    </div>
  )
}
