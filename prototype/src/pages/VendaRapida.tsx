import { useState } from 'react'

const CATEGORIAS = ['Pratos', 'Bebidas', 'Sobremesas', 'Por Peso']

export default function VendaRapida() {
  const [itens, setItens] = useState<{ nome: string; qtd: number; preco: number }[]>([])

  function addItem(nome: string, preco = 10) {
    setItens(prev => [...prev, { nome, qtd: 1, preco }])
  }

  const total = itens.reduce((acc, i) => acc + i.qtd * i.preco, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', height: '100%' }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {CATEGORIAS.map(c => (
            <button key={c} style={{ fontSize: 18, padding: 16 }} onClick={() => addItem(c)}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {Array.from({ length: 12 }).map((_, idx) => (
            <button key={idx} style={{ padding: 20, fontSize: 18 }} onClick={() => addItem(`Item ${idx + 1}`)}>
              Item {idx + 1}
            </button>
          ))}
        </div>
      </div>

      <aside style={{ borderLeft: '1px solid #eee', padding: 16 }}>
        <h3>Carrinho</h3>
        <ul>
          {itens.map((i, idx) => (
            <li key={idx}>{i.nome} x{i.qtd} — R$ {(i.preco * i.qtd).toFixed(2)}</li>
          ))}
        </ul>
        <hr />
        <h2>Total: R$ {total.toFixed(2)}</h2>
        <a href="/finalizacao">
          <button style={{ fontSize: 20, padding: 16, width: '100%', marginTop: 12 }}>
            Finalizar venda
          </button>
        </a>
      </aside>
    </div>
  )
}
