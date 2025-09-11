// src/pages/Finalizacao.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import type { Order, OrderItem, Payment, ReceiptMode, CustomerIdType } from '../db/models'
import { printText } from '../mock/devices'
import { getSettings, findPrinterByDestination } from '../db/settings'
import { ticketCupomCliente } from '../lib/escposCupom'
import { logAudit } from '../db/audit'
import { useSession } from '../auth/session'

const round2 = (n: number) => Math.round(n * 100) / 100
const onlyDigits = (s: string) => (s || '').replace(/\D+/g, '')
const pad = (n: number) => n.toString().padStart(3, '0')

export default function Finalizacao() {
  const { user, hasRole } = useSession()
  const nav = useNavigate()

  const [comandaNum, setComandaNum] = useState('')
  const [order, setOrder] = useState<Order | null>(null)

  // documento fiscal
  const [mode, setMode] = useState<ReceiptMode>('NAO_FISCAL') // padrão
  const [idType, setIdType] = useState<CustomerIdType>('NONE')
  const [taxId, setTaxId] = useState('')

  // pagamentos (padrão = tudo em dinheiro)
  const [paySplit, setPaySplit] = useState<{ CASH: number; PIX: number; TEF: number }>({ CASH: 0, PIX: 0, TEF: 0 })
  const sumSplit = useMemo(() => round2(paySplit.CASH + paySplit.PIX + paySplit.TEF), [paySplit])

  // editar preço (apenas gerente)
  const [allowEditPrice, setAllowEditPrice] = useState(false)

  const taxInputRef = useRef<HTMLInputElement>(null)

  // 🔎 Buscar comanda OPEN
  async function buscarComanda() {
    if (!comandaNum) return
    const id = 'COMANDA-' + pad(Number(comandaNum))
    const o = await db.orders.get(id)
    if (!o || o.status !== 'OPEN') { alert('Comanda não encontrada ou já fechada.'); return }
    setOrder(o)
    // padrões após carregar: não fiscal + tudo em dinheiro
    setMode('NAO_FISCAL')
    setIdType('NONE')
    setTaxId('')
    setPaySplit({ CASH: o.total, PIX: 0, TEF: 0 })
  }

  // ➕ Adicionar extra
  function addExtra(nome: string, preco: number) {
    if (!order) return
    const item: OrderItem = {
      id: crypto.randomUUID(),
      productId: 0,
      name: nome,
      qty: 1,
      unitPrice: preco,
      total: preco,
      isWeight: false
    }
    applyItems([...order.items, item])
  }

  // 🗑️ Remover item
  function removerItem(id: string) {
    if (!order) return
    applyItems(order.items.filter(i => i.id !== id))
  }

  // ✏️ Alterar quantidade (kg/unidades)
  function setQty(id: string, qtyRaw: number) {
    if (!order) return
    const items = order.items.map(i => {
      if (i.id !== id) return i
      const q = Math.max(0, i.isWeight ? Number(qtyRaw.toFixed ? qtyRaw.toFixed(3) : qtyRaw) : Math.round(qtyRaw))
      const total = round2(q * i.unitPrice)
      return { ...i, qty: q, total }
    })
    applyItems(items)
  }

  // ✏️ Alterar preço unitário (permitido só se allowEditPrice = true)
  function setUnitPrice(id: string, priceRaw: number) {
    if (!order || !allowEditPrice) return
    const items = order.items.map(i => {
      if (i.id !== id) return i
      const p = Math.max(0, round2(priceRaw))
      const total = round2(i.qty * p)
      return { ...i, unitPrice: p, total }
    })
    applyItems(items)
  }

  // Aplica lista e recalcula total/parcelas
  function applyItems(items: OrderItem[]) {
    if (!order) return
    const total = round2(items.reduce((s, i) => s + i.total, 0))
    setOrder({ ...order, items, total })
    // regra: sempre default dinheiro ao total
    setPaySplit({ CASH: total, PIX: 0, TEF: 0 })
  }

  // mocks de autorização
  async function simulatePix(amount: number) {
    await new Promise(r => setTimeout(r, 1000))
    return 'PIX' + Math.floor(Math.random() * 1e6).toString().padStart(6, '0')
  }
  async function simulateTef(amount: number) {
    await new Promise(r => setTimeout(r, 1200))
    return 'AP' + Math.floor(Math.random() * 1e6).toString().padStart(6, '0')
  }

  // ✅ Confirmar pagamento
  async function confirm() {
    if (!order) return
    if (order.items.length === 0) return alert('Sem itens.')
    if (Math.abs(sumSplit - order.total) > 0.009) return alert('Pagamentos não fecham com o total.')

    const payments: Payment[] = []
    let pixAuth: string | undefined, tefAuth: string | undefined

    if (paySplit.CASH) payments.push({ id: crypto.randomUUID(), method: 'CASH', amount: round2(paySplit.CASH) })
    if (paySplit.PIX)  { pixAuth = await simulatePix(paySplit.PIX); payments.push({ id: crypto.randomUUID(), method: 'PIX', amount: paySplit.PIX, authCode: pixAuth }) }
    if (paySplit.TEF)  { tefAuth = await simulateTef(paySplit.TEF); payments.push({ id: crypto.randomUUID(), method: 'TEF', amount: paySplit.TEF, authCode: tefAuth }) }

    const updated: Order = {
      ...order,
      payments,
      status: 'PAID',
      receiptMode: mode,
      customerIdType: idType,
      customerTaxId: idType === 'NONE' ? null : onlyDigits(taxId)
    }
    await db.orders.put(updated)

    await logAudit({ action: 'VENDA_PAGA', userName: user?.name ?? null, details: { orderId: updated.id, total: updated.total, pay: payments } })
    await onPrint(updated)

    alert('Comanda paga e cupom impresso.')
    nav('/venda')
  }

  // 🖨️ Impressão mock
  async function onPrint(order: Order) {
    const settings = await getSettings()
    const printer = await findPrinterByDestination('CAIXA')
    if (!printer) { alert('Sem impressora CAIXA configurada.'); return }
    const nfceMock = (order.receiptMode === 'FISCAL_NFCE') ? {
      chaveAcesso: '3515 2509 0123 4567 8901 2345 6789 0123 4567 8901 2345',
      urlConsulta: 'https://www.nfce.fazenda.sp.gov.br/consulta',
      qrCodeConteudo: `https://nfce.mock/${order.id}`
    } : undefined
    const text = ticketCupomCliente({ order, settings, printer, nfce: nfceMock })
    printText('CUPOM:' + order.id, text)
  }

  // Atalhos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      // atalhos que não devem disparar quando digitando em campos:
      const safe = !typing

      // Documento
      if (safe && e.key === 'F2') { e.preventDefault(); setMode('NAO_FISCAL') }
      if (safe && e.key === 'F3') { e.preventDefault(); setMode('FISCAL_NFCE') }
      if (safe && e.key === 'F4') { e.preventDefault(); setMode('FISCAL_SAT') }

      // Split rápido 100%
      if (safe && e.key === 'F6' && order) { e.preventDefault(); setPaySplit({ CASH: order.total, PIX: 0, TEF: 0 }) }
      if (safe && e.key === 'F7' && order) { e.preventDefault(); setPaySplit({ CASH: 0, PIX: order.total, TEF: 0 }) }
      if (safe && e.key === 'F8' && order) { e.preventDefault(); setPaySplit({ CASH: 0, PIX: 0, TEF: order.total }) }

      // Confirmar
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); confirm() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

  // Atalho: Enter dentro do input de comanda = buscar
  function onComandaKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); buscarComanda() }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Finalização de Comanda</h2>

      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
        <input
          type="text"
          value={comandaNum}
          onChange={e=>setComandaNum(e.target.value)}
          onKeyDown={onComandaKey}
          placeholder="Digite ou leia nº comanda"
          inputMode="numeric"
          style={{ padding:8 }}
        />
        <button onClick={buscarComanda}>Buscar</button>
      </div>

      {!order && <p>Digite ou leia o número da comanda para continuar.</p>}

      {order && (
        <>
          <h3>Itens da Comanda {comandaNum}</h3>

          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #eee', textAlign:'left' }}>
                <th style={{ padding:8 }}>Item</th>
                <th style={{ padding:8, width:160 }}>Qtd {order.items.some(i=>i.isWeight)?'(kg)':''}</th>
                <th style={{ padding:8, width:160 }}>
                  Preço un.
                  {hasRole('GERENTE') && (
                    <label style={{ marginLeft:12, fontSize:12 }}>
                      <input
                        type="checkbox"
                        checked={allowEditPrice}
                        onChange={e=>setAllowEditPrice(e.target.checked)}
                      /> {' '}Permitir editar
                    </label>
                  )}
                </th>
                <th style={{ padding:8, width:120 }}>Total</th>
                <th style={{ padding:8, width:120 }}></th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(i => (
                <tr key={i.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                  <td style={{ padding:8 }}>{i.name}</td>

                  <td style={{ padding:8 }}>
                    <input
                      type="number"
                      step={i.isWeight ? 0.001 : 1}
                      min={0}
                      value={i.qty}
                      onChange={e=>setQty(i.id, Number(e.target.value || 0))}
                      style={{ width:120 }}
                    />
                  </td>

                  <td style={{ padding:8 }}>
                    {allowEditPrice ? (
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={i.unitPrice}
                        onChange={e=>setUnitPrice(i.id, Number(e.target.value || 0))}
                        style={{ width:120 }}
                      />
                    ) : (
                      <span style={{ opacity:.7 }}>R$ {i.unitPrice.toFixed(2)}</span>
                    )}
                  </td>

                  <td style={{ padding:8 }}><b>R$ {i.total.toFixed(2)}</b></td>
                  <td style={{ padding:8 }}>
                    <button onClick={()=>removerItem(i.id)}>Remover</button>
                  </td>
                </tr>
              ))}
              {order.items.length===0 && (
                <tr><td style={{ padding:8 }} colSpan={5}><i>Nenhum item.</i></td></tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => addExtra('Chocolate', 5)}>+ Chocolate</button>
            <button onClick={() => addExtra('Sorvete', 10)}>+ Sorvete</button>
          </div>

          <h3 style={{ marginTop:16 }}>Total: R$ {order.total.toFixed(2)}</h3>

          <hr style={{ margin: '16px 0' }} />

          {/* Documento - com atalhos: F2/F3/F4 */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <label>Documento:</label>
            <select title="F2/F3/F4" value={mode} onChange={e=>setMode(e.target.value as ReceiptMode)}>
              <option value="NAO_FISCAL">Não fiscal (Orçamento) — F2</option>
              <option value="FISCAL_NFCE">Fiscal (NFC-e) — F3</option>
              <option value="FISCAL_SAT">Fiscal (SAT – legado) — F4</option>
            </select>

            {mode === 'FISCAL_NFCE' && (
              <>
                <select value={idType} onChange={e=>setIdType(e.target.value as CustomerIdType)}>
                  <option value="NONE">Sem identificação</option>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                </select>
                <input
                  ref={taxInputRef}
                  value={taxId}
                  onChange={e=>setTaxId(e.target.value)}
                  placeholder="CPF/CNPJ (só números)"
                />
              </>
            )}
          </div>

          {/* Pagamentos - atalhos: F6/F7/F8 e Ctrl+Enter */}
          <div style={{ marginTop:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 200px 200px 200px', gap:8, alignItems:'center' }}>
              <div>Pagamentos</div>
              <NumberInput
                label="Dinheiro — F6"
                value={paySplit.CASH}
                onChange={v=>setPaySplit(p=>({...p, CASH: v}))}
              />
              <NumberInput
                label="PIX — F7"
                value={paySplit.PIX}
                onChange={v=>setPaySplit(p=>({...p, PIX: v}))}
              />
              <NumberInput
                label="TEF — F8"
                value={paySplit.TEF}
                onChange={v=>setPaySplit(p=>({...p, TEF: v}))}
              />
            </div>

            <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={()=>order && setPaySplit({ CASH: order.total, PIX: 0, TEF: 0 })}>100% Dinheiro (F6)</button>
              <button onClick={()=>order && setPaySplit({ CASH: 0, PIX: order.total, TEF: 0 })}>100% PIX (F7)</button>
              <button onClick={()=>order && setPaySplit({ CASH: 0, PIX: 0, TEF: order.total })}>100% TEF (F8)</button>
            </div>

            <div style={{ marginTop:8, display:'flex', justifyContent:'space-between' }}>
              <div>Subtotal informado:</div>
              <b>R$ {sumSplit.toFixed(2)}</b>
            </div>
          </div>

          <div style={{ marginTop:16 }}>
            <button onClick={confirm} style={{ background:'#0b5', color:'#fff', padding:'8px 12px' }} title="Ctrl+Enter">
              Confirmar Pagamento (Ctrl+Enter)
            </button>
            <Link to="/venda"><button style={{ marginLeft:8 }}>Cancelar</button></Link>
          </div>
        </>
      )}
    </div>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number)=>void }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, alignItems:'center' }}>
      <small>{label}</small>
      <input type="number" step={0.01} value={value ?? 0} onChange={e=>onChange(Number(e.target.value || 0))} />
    </div>
  )
}
