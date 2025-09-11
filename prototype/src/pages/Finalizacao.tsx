// src/pages/Finalizacao.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type DocType = 'ORCAMENTO' | 'NFCE' | 'SAT'

type ReturnStateFromPix = {
  orderDraft?: any
  pixPaid?: boolean
  pixAmount?: number
  pixTxid?: string
}

export default function Finalizacao() {
  const nav = useNavigate()
  const { state } = useLocation()
  const ret = (state || {}) as ReturnStateFromPix

  // documento
  const [doc, setDoc] = useState<DocType>('ORCAMENTO')
  const [customerId, setCustomerId] = useState<string>('') // CPF/CNPJ opcional

  // pagamentos
  const [cash, setCash] = useState<number>(0)
  const [pix, setPix] = useState<number>(0)
  const [tef, setTef] = useState<number>(0)

  // total do pedido (mock aqui; integre com seu carrinho/rascunho se já tiver)
  const [total, setTotal] = useState<number>(0)

  // Se voltamos da tela PIX com confirmação mock, aplica automaticamente
  useEffect(() => {
    if (ret?.pixPaid && ret.pixAmount) {
      setPix(Number(ret.pixAmount))
    }
  }, [ret?.pixPaid, ret?.pixAmount])

  // Exemplo: se você manda um rascunho de pedido via location.state
  // pode calcular o total real aqui:
  useEffect(() => {
    if (ret?.orderDraft?.total) {
      setTotal(Number(ret.orderDraft.total))
    } else if (!total) {
      // valor de exemplo para a tela não ficar 0
      setTotal(49.9)
    }
  }, [ret?.orderDraft, total])

  // atalhos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F3') setDoc('NFCE')
      if (e.key === 'Escape') nav('/venda')
      if (e.key === 'F6') setCash(total)
      if (e.key === 'F7') setPix(total)
      if (e.key === 'F8') setTef(total)
      if ((e.ctrlKey && e.key === 'Enter')) onConfirmar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, cash, pix, tef, doc, customerId])

  const subtotalInformado = useMemo(() => {
    return round2(cash + pix + tef)
  }, [cash, pix, tef])

  /**
   * PATCH: agora o botão sempre abre a tela de PIX:
   * - Se houver valor digitado no campo PIX (> 0), usa esse valor.
   * - Senão, calcula o saldo: total - dinheiro - tef - pix.
   */
  function onGerarPix() {
    let valorPix = Number(pix) > 0 ? Number(pix) : round2(total - cash - tef - pix)
    valorPix = round2(Math.max(0, valorPix))
    if (valorPix <= 0) {
      alert('Defina um valor maior que 0 para gerar o QR Code PIX.')
      return
    }

    // Monte aqui seu rascunho real, se já existir
    const orderDraft = ret?.orderDraft ?? { total, items: [] }

    nav('/pix', { state: { amount: valorPix, orderDraft } })
  }

  function onConfirmar() {
    if (round2(subtotalInformado) !== round2(total)) {
      alert('Os pagamentos não fecham com o total.')
      return
    }
    // Aqui você faria:
    // - persistir pedido
    // - emitir documento (mock)
    // - imprimir cupom
    alert(`Pagamento confirmado.\nDoc: ${doc}\nTotal: R$ ${total.toFixed(2)}`)
    nav('/venda', { replace: true })
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Finalização</h2>

      {/* Tipo de documento */}
      <section style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span><b>Tipo de Documento:</b></span>
          <Toggle onClick={() => setDoc('ORCAMENTO')} active={doc === 'ORCAMENTO'}>
            Não fiscal (Orçamento) <small style={hint}>ALT+N</small>
          </Toggle>
          <Toggle onClick={() => setDoc('NFCE')} active={doc === 'NFCE'}>
            Fiscal (NFC-e) <small style={hint}>F3</small>
          </Toggle>
          <Toggle onClick={() => setDoc('SAT')} active={doc === 'SAT'}>
            Fiscal (SAT – legado)
          </Toggle>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            placeholder="CPF/CNPJ (opcional)"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            style={inp}
          />
        </div>
      </section>

      {/* Pagamentos */}
      <section style={card}>
        <div style={{ marginBottom: 8 }}>
          <b>Total:</b> R$ {total.toFixed(2)}
        </div>

        <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
          <Row label={<>Dinheiro <small style={hint}>F6</small></>}>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={formatNum(cash)}
              onChange={e => setCash(parseNum(e.target.value))}
              style={inp}
            />
            <button onClick={() => setCash(total)} style={btnGhost}>100%</button>
          </Row>

          <Row label={<>PIX <small style={hint}>F7</small></>}>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={formatNum(pix)}
              onChange={e => setPix(parseNum(e.target.value))}
              style={inp}
            />
            <button onClick={() => setPix(total)} style={btnGhost}>100%</button>
            <button onClick={onGerarPix} style={btnPrimary}>Gerar PIX (QR)</button>
          </Row>

          <Row label={<>Cartão (TEF) <small style={hint}>F8</small></>}>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={formatNum(tef)}
              onChange={e => setTef(parseNum(e.target.value))}
              style={inp}
            />
            <button onClick={() => setTef(total)} style={btnGhost}>100%</button>
          </Row>

          <div style={{ marginTop: 6, fontSize: 14, opacity: .8 }}>
            <b>Subtotal informado:</b> R$ {subtotalInformado.toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onConfirmar} style={btnConfirm} title="Ctrl+Enter">Confirmar e imprimir</button>
          <button onClick={() => nav('/venda')} style={btnGhost}>Voltar</button>
        </div>
      </section>
    </div>
  )
}

/* ----------------- componentes simples ----------------- */
function Row(props: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto auto', gap: 8, alignItems: 'center' }}>
      <div>{props.label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{props.children}</div>
    </div>
  )
}

function Toggle(props: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: '6px 10px',
        borderRadius: 8,
        border: '1px solid ' + (props.active ? '#2563eb' : '#ddd'),
        background: props.active ? '#2563eb' : '#fff',
        color: props.active ? '#fff' : '#333',
        cursor: 'pointer',
      }}
    >
      {props.children}
    </button>
  )
}

/* ----------------- util & estilos ----------------- */
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,.05)',
}

const hint: React.CSSProperties = { opacity: .6, marginLeft: 6 }

const inp: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 16,
  width: 160,
}

const btnGhost: React.CSSProperties = {
  border: '1px solid #ddd',
  background: '#fff',
  borderRadius: 8,
  padding: '8px 10px',
  cursor: 'pointer',
}

const btnPrimary: React.CSSProperties = {
  border: '1px solid #2563eb',
  background: '#2563eb',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 10px',
  cursor: 'pointer',
}

const btnConfirm: React.CSSProperties = {
  border: '1px solid #16a34a',
  background: '#16a34a',
  color: '#fff',
  borderRadius: 8,
  padding: '10px 12px',
  cursor: 'pointer',
}

function parseNum(v: string) {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
function formatNum(n: number) {
  if (!Number.isFinite(n)) return ''
  return n ? String(n).replace('.', ',') : ''
}
function round2(n: number) {
  return Math.round(n * 100) / 100
}
