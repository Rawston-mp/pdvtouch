// src/pages/Finalizacao.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import type { Order, Payment, ReceiptMode, CustomerIdType } from '../db/models'
import { printText } from '../mock/devices'
import { getSettings, findPrinterByDestination } from '../db/settings'
import { ticketCupomCliente } from '../lib/escposCupom'

type CartSnapshot = { items: any[]; total: number }
const loadCart = (): CartSnapshot | null => {
  try { return JSON.parse(localStorage.getItem('pdv_cart') || 'null') } catch { return null }
}

// utils
const onlyDigits = (s: string) => (s || '').replace(/\D+/g, '')
const round2 = (n: number) => Math.round(n * 100) / 100
function validTaxId(type: CustomerIdType, val: string) {
  const d = onlyDigits(val)
  if (type === 'CPF') return d.length === 11
  if (type === 'CNPJ') return d.length === 14
  return true
}
function autoDetectId(val: string): CustomerIdType {
  const d = onlyDigits(val)
  if (d.length === 11) return 'CPF'
  if (d.length === 14) return 'CNPJ'
  return 'NONE'
}

export default function Finalizacao() {
  const nav = useNavigate()
  const snap = loadCart()
  const total = snap?.total ?? 0

  const [mode, setMode] = useState<ReceiptMode>('NAO_FISCAL')
  const [idType, setIdType] = useState<CustomerIdType>('NONE')
  const [taxId, setTaxId] = useState('')

  // pagamentos – default: tudo em dinheiro
  const [paySplit, setPaySplit] = useState<{ CASH: number; PIX: number; TEF: number }>({
    CASH: round2(total), PIX: 0, TEF: 0
  })
  const sumSplit = useMemo(() => round2(paySplit.CASH + paySplit.PIX + paySplit.TEF), [paySplit])

  const taxInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!snap || (snap.items?.length ?? 0) === 0) {
      alert('Carrinho vazio.'); nav('/venda')
    }
  }, [])

  // se o total mudar (caso incomum), reatribui dinheiro como padrão
  useEffect(() => {
    setPaySplit({ CASH: round2(total), PIX: 0, TEF: 0 })
  }, [total])

  // auto-detecta CPF/CNPJ conforme digitação
  useEffect(() => {
    const detected = autoDetectId(taxId)
    if (detected !== idType) setIdType(detected)
  }, [taxId])

  // atalhos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Alt+W => Não fiscal
      if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault(); setMode('NAO_FISCAL'); return
      }
      // F3 => Fiscal (NFC-e)
      if (e.key === 'F3') {
        e.preventDefault(); setMode('FISCAL_NFCE'); setTimeout(() => taxInputRef.current?.focus(), 0); return
      }
      // F6/F7/F8 => preencher pagamentos rapidamente
      if (e.key === 'F6') { e.preventDefault(); setAll('CASH'); return }
      if (e.key === 'F7') { e.preventDefault(); setAll('PIX');  return }
      if (e.key === 'F8') { e.preventDefault(); setAll('TEF');  return }
      // Ctrl+Enter => Confirmar
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); confirm(); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paySplit, total, mode, idType, taxId])

  // helpers de pagamento
  function setAll(which: 'CASH'|'PIX'|'TEF') {
    setPaySplit({
      CASH: which === 'CASH' ? round2(total) : 0,
      PIX:  which === 'PIX'  ? round2(total) : 0,
      TEF:  which === 'TEF'  ? round2(total) : 0,
    })
  }

  // quando atendente editar PIX/TEF, ajusta o restante em dinheiro
  function setPix(v: number) {
    const pix = Math.max(0, v || 0)
    const tef = paySplit.TEF
    const cash = Math.max(0, round2(total - pix - tef))
    setPaySplit({ CASH: cash, PIX: pix, TEF: tef })
  }
  function setTef(v: number) {
    const tef = Math.max(0, v || 0)
    const pix = paySplit.PIX
    const cash = Math.max(0, round2(total - pix - tef))
    setPaySplit({ CASH: cash, PIX: pix, TEF: tef })
  }
  // se editar dinheiro manualmente, só aceita até o total
  function setCash(v: number) {
    const cash = Math.max(0, Math.min(total, v || 0))
    setPaySplit({ ...paySplit, CASH: round2(cash) })
  }

  function confirm() {
    if (!snap) return
    if (Math.abs(sumSplit - total) > 0.009) return alert('Os pagamentos não fecham com o total.')

    if (mode === 'FISCAL_NFCE') {
      if (idType !== 'NONE' && !validTaxId(idType, taxId)) return alert('CPF/CNPJ inválido.')
    }

    const orderId = crypto.randomUUID()
    const payments: Payment[] = []
    if (paySplit.CASH) payments.push({ id: crypto.randomUUID(), method: 'CASH', amount: round2(paySplit.CASH) })
    if (paySplit.PIX)  payments.push({ id: crypto.randomUUID(), method: 'PIX',  amount: round2(paySplit.PIX), authCode: 'PIX' + Math.floor(Math.random()*1e6) })
    if (paySplit.TEF)  payments.push({ id: crypto.randomUUID(), method: 'TEF',  amount: round2(paySplit.TEF), authCode: 'AP' + Math.floor(Math.random()*1e6) })

    const order: Order = {
      id: orderId,
      createdAt: Date.now(),
      status: 'PAID',
      items: snap.items.map((i: any) => ({
        id: i.id, productId: i.productId, name: i.name, qty: i.qty, unitPrice: i.unitPrice,
        total: i.total, isWeight: i.isWeight, route: i.route
      })),
      payments,
      total: round2(total),
      receiptMode: mode,
      customerIdType: idType,
      customerTaxId: idType === 'NONE' ? null : onlyDigits(taxId)
    }

    db.orders.put(order)
    onPrint(order).then(() => {
      localStorage.removeItem('pdv_cart')
      alert('Pagamento confirmado (mock) e cupom impresso.')
      nav('/impressao')
    })
  }

  async function onPrint(order: Order) {
    const settings = await getSettings()
    const printer = await findPrinterByDestination('CAIXA')
    if (!printer) { alert('Sem impressora de CAIXA configurada.'); return }
    const nfceMock = (order.receiptMode === 'FISCAL_NFCE') ? {
      chaveAcesso: '3515 2509 0123 4567 8901 2345 6789 0123 4567 8901 2345',
      urlConsulta: 'https://www.nfce.fazenda.sp.gov.br/consulta',
      qrCodeConteudo: `https://www.nfce.fazenda.sp.gov.br/qrcode?p=CHAVE-${order.id}`
    } : undefined

    const text = ticketCupomCliente({ order, settings, printer, nfce: nfceMock })
    printText('CUPOM:' + order.id, text)
  }

  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <h2>Finalização</h2>

        <h3 style={{ marginTop: 8 }}>Tipo de Documento</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setMode('NAO_FISCAL')} style={btn(mode==='NAO_FISCAL')}>
            Não fiscal (Orçamento) <kbd style={kbd}>Alt+W</kbd>
          </button>
          <button onClick={() => setMode('FISCAL_NFCE')} style={btn(mode==='FISCAL_NFCE')}>
            Fiscal (NFC-e) <kbd style={kbd}>F3</kbd>
          </button>
          <button onClick={() => setMode('FISCAL_SAT')} style={btn(mode==='FISCAL_SAT')}>
            Fiscal (SAT – legado)
          </button>
        </div>

        {mode === 'FISCAL_NFCE' && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
            <label style={{ alignSelf: 'center' }}>Identificação</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={idType} onChange={e => setIdType(e.target.value as CustomerIdType)} style={inp}>
                <option value="NONE">Sem identificação</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
              <input
                ref={taxInputRef}
                placeholder={idType==='CPF' ? 'CPF (apenas números)' : idType==='CNPJ' ? 'CNPJ (apenas números)' : 'Cole CPF/CNPJ aqui'}
                disabled={false}
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                style={inp}
              />
            </div>
            <div />
            <small style={{ opacity:.7 }}>
              Dica: cole CPF/CNPJ direto; detectamos automaticamente (11=CPF, 14=CNPJ).  
              Atalhos: <kbd style={kbd}>F6</kbd> Dinheiro, <kbd style={kbd}>F7</kbd> PIX, <kbd style={kbd}>F8</kbd> TEF, <kbd style={kbd}>Ctrl+Enter</kbd> Confirmar.
            </small>
          </div>
        )}

        <h3 style={{ marginTop: 16 }}>Total</h3>
        <div style={{ fontSize: 24, fontWeight: 700 }}>R$ {total.toFixed(2)}</div>
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <h3>Pagamentos</h3>

        <PayRow
          label="Dinheiro"
          value={paySplit.CASH}
          onChange={v => setCash(v)}
          hint="F6"
          onHint={() => setAll('CASH')}
        />
        <PayRow
          label="PIX"
          value={paySplit.PIX}
          onChange={v => setPix(v)}
          hint="F7"
          onHint={() => setAll('PIX')}
        />
        <PayRow
          label="Cartão (TEF)"
          value={paySplit.TEF}
          onChange={v => setTef(v)}
          hint="F8"
          onHint={() => setAll('TEF')}
        />

        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <div>Subtotal informado:</div>
          <b>R$ {sumSplit.toFixed(2)}</b>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button onClick={confirm} style={btnPrimary}>
            Confirmar e imprimir <kbd style={kbd}>Ctrl+Enter</kbd>
          </button>
          <Link to="/venda"><button style={btnLight}>Voltar</button></Link>
        </div>
      </section>
    </div>
  )
}

function PayRow({
  label, value, onChange, hint, onHint
}: { label: string; value?: number; onChange: (v: number)=>void; hint?: string; onHint?: ()=>void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 64px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      <div>{label}</div>
      <input type="number" step="0.01" value={value ?? ''} onChange={e => onChange(Number(e.target.value || 0))} style={inp} />
      <button onClick={onHint} style={btnLight} title={`Atalho ${hint || ''}`}>{hint || 'Set'}</button>
    </div>
  )
}

const btn = (active: boolean): React.CSSProperties => ({
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd',
  background: active ? '#222' : '#fff', color: active ? '#fff' : '#222', cursor: 'pointer'
})
const btnPrimary: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #0b5', background: '#0b5', color: '#fff', cursor: 'pointer' }
const btnLight: React.CSSProperties  = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
const inp: React.CSSProperties       = { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', width: '100%' }
const kbd: React.CSSProperties       = { marginLeft: 6, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 4, background: '#f8f8f8', fontFamily: 'monospace', fontSize: 12 }
