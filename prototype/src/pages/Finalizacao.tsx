// src/pages/Finalizacao.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useSession } from '../auth/session'
import { loadCartDraft, saveCartDraft, removeCartDraft, clearCurrentOrderId, type CartItem, acquireOrderLock, isOrderLockedByOther, renewOrderLock, releaseOrderLock, getOrderLockInfo, getLockTimings } from '../lib/cartStorage'
import { printText } from '../mock/devices'
import { addSale } from '../db/sales'
import { clearUsage } from '../lib/comandaUsage'

type DocType = 'NAO_FISCAL' | 'NFCE'

const toNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v as number | string)
  return Number.isFinite(n) ? n : fallback
}
const money = (v: unknown) => toNumber(v).toFixed(2)

/** Tenta extrair uma comanda de uma leitura de leitor/código */
function parseOrderFromScan(val: string): number | null {
  if (!val) return null
  // Normaliza: pega somente dígitos
  const digits = (val.match(/\d+/g) || []).join('')
  if (!digits) return null
  const n = Number(digits)
  if (!Number.isFinite(n)) return null
  if (n < 1 || n > 200) return null
  return n
}

export default function Finalizacao() {
  const nav = useNavigate()
  type FinalizacaoNavState = {
    orderId: number
    cart: CartItem[]
    doc?: DocType
    idFiscal?: string
    cash?: number
    tef?: number
  }
  const { state } = useLocation() as { state?: Partial<FinalizacaoNavState> }

  const { user } = useSession()
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  const roleRaw = (user?.role ?? 'CAIXA') as string
  const role = roleRaw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase() // BALANÇA→BALANCA
  const isBalancaRole = role.startsWith('BALANCA')

  // estado inicial
  const [orderIdInput, setOrderIdInput] = useState<string>(
    state?.orderId ? String(state.orderId) : '',
  )
  const [orderId, setOrderId] = useState<number | null>(state?.orderId ?? null)
  const [cart, setCart] = useState<CartItem[]>(Array.isArray(state?.cart) ? state.cart : [])
  const [lockOwner, setLockOwner] = useState<'me' | 'other' | null>(null)
  const [lockSeconds, setLockSeconds] = useState<number>(0)

  // Dono do lock por estação/usuário
  const owner = useMemo(() => (user?.id ? `u:${user.id}` : 'local'), [user?.id])

  const [doc, setDoc] = useState<DocType>('NAO_FISCAL')
  const [idFiscal, setIdFiscal] = useState<string>('') // CPF/CNPJ opcional

  // pagamentos
  const [vCash, setVCash] = useState<string>('0')
  const [vPix, setVPix] = useState<string>('0')
  const [vTef, setVTef] = useState<string>('0')
  const [subtotalInfo, setSubtotalInfo] = useState<string>('0')

  // derivados
  const total = useMemo(
    () => cart.reduce((acc, it) => acc + toNumber(it.qty) * toNumber(it.price), 0),
    [cart],
  )
  const pagos = useMemo(
    () => toNumber(vCash) + toNumber(vPix) + toNumber(vTef),
    [vCash, vPix, vTef],
  )
  const falta = useMemo(() => Math.max(0, total - pagos), [total, pagos])

  // (não retornar aqui para não quebrar a ordem dos hooks)

  // Carregar por comanda/leitor
  async function loadByOrder() {
    const parsed = parseOrderFromScan(orderIdInput)
    if (parsed == null) {
      alert('Informe/escaneie um Nº de comanda válido (1–200).')
      return
    }
    // Lock: não permite abrir se outra estação segura o lock
    if (isOrderLockedByOther(parsed, owner)) {
      alert(`Comanda ${parsed} está sendo editada em outra estação.`)
      return
    }
    // Se já havia uma comanda ativa, libera o lock anterior
    if (orderId != null) {
      try { releaseOrderLock(orderId, owner) } catch (err) { void err }
    }
    // Adquire lock para a nova comanda
    if (!acquireOrderLock(parsed, owner)) {
      alert(`Não foi possível adquirir o lock da comanda ${parsed}.`)
      return
    }
    const draft = loadCartDraft(parsed) || []
    setOrderId(parsed)
    setCart(draft.map((x) => ({ ...x, price: toNumber(x.price), qty: toNumber(x.qty) })))
    // zera pagamentos ao trocar de comanda
    setVCash('0')
    setVPix('0')
    setVTef('0')
  }

  // Atalhos
  useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        e.preventDefault()
        set100('cash')
      }
      if (e.key === 'F7') {
        e.preventDefault()
        set100('pix')
      }
      if (e.key === 'F8') {
        e.preventDefault()
        set100('tef')
      }
      const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter'
      if ((e.ctrlKey || e.metaKey) && isEnter) {
        e.preventDefault()
        confirmar()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        nav('/venda')
      }
      if (e.key === 'F3') {
        e.preventDefault()
        setDoc('NFCE')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, vCash, vPix, vTef, cart, orderId, doc, idFiscal])

  // Persistir rascunho quando caixa altera itens
  useEffect(() => {
    if (orderId != null) saveCartDraft(orderId, cart)
  }, [cart, orderId])

  // Mantém lock renovado enquanto a tela estiver com a comanda ativa
  useEffect(() => {
    if (orderId == null) return
    const id = setInterval(() => {
      try { renewOrderLock(orderId, owner) } catch (err) { void err }
    }, 10000) // 10s
    return () => clearInterval(id)
  }, [orderId, owner])

  // Indicador de lock
  useEffect(() => {
    if (orderId == null) { setLockOwner(null); setLockSeconds(0); return }
    const tick = () => {
      try {
        const info = getOrderLockInfo(orderId)
        if (!info) { setLockOwner(null); setLockSeconds(0); return }
        const ttl = getLockTimings().ttlMs
        const age = Date.now() - Number(info.ts)
        setLockSeconds(Math.max(0, Math.ceil((ttl - age) / 1000)))
        setLockOwner(info.owner === owner ? 'me' : 'other')
      } catch (err) { void err }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [orderId, owner])

  // Edição de itens
  const canEditPrice = role === 'GERENTE' || role === 'ADMIN'

  function updateQty(it: CartItem, next: string) {
    setCart((c) => c.map((x) => (x.id === it.id ? { ...x, qty: Math.max(0, toNumber(next)) } : x)))
  }
  function updatePrice(it: CartItem, next: string) {
    if (!canEditPrice) return
    setCart((c) =>
      c.map((x) => (x.id === it.id ? { ...x, price: Math.max(0, toNumber(next)) } : x)),
    )
  }
  function removeItem(it: CartItem) {
    setCart((c) => c.filter((x) => x.id !== it.id))
  }

  function set100(which: 'cash' | 'pix' | 'tef') {
    const resto = Math.max(
      0,
      total -
        (which === 'cash'
          ? toNumber(vPix) + toNumber(vTef)
          : which === 'pix'
            ? toNumber(vCash) + toNumber(vTef)
            : toNumber(vCash) + toNumber(vPix)),
    )
    const v = money(resto)
    if (which === 'cash') setVCash(v)
    if (which === 'pix') setVPix(v)
    if (which === 'tef') setVTef(v)
  }

  async function confirmar() {
    if (orderId == null) {
      alert('Informe/escaneie a comanda para finalizar.')
      return
    }
    if (!cart.length) {
      alert('Comanda vazia.')
      return
    }
    if (toNumber(subtotalInfo) > 0 && Math.abs(toNumber(subtotalInfo) - total) > 0.009) {
      alert('O subtotal informado não confere com o total calculado.')
      return
    }
    if (Math.abs(total - pagos) > 0.009) {
      alert('Os pagamentos não fecham com o total.')
      return
    }

    // PIX → vai para a tela dedicada
    if (toNumber(vPix) > 0) {
      try { renewOrderLock(orderId, owner) } catch (err) { void err }
      nav('/pix', {
        state: {
          orderId,
          amount: toNumber(vPix),
          cart,
          from: 'finalizacao',
          doc,
          idFiscal,
          cash: toNumber(vCash),
          tef: toNumber(vTef),
        },
      })
      return
    }

    // Salvar venda no banco de dados
    try {
      await addSale({
        orderId,
        timestamp: Date.now(),
        userId: user!.id,
        userName: user!.name,
        userRole: user!.role,
        items: cart,
        total,
        payments: {
          cash: toNumber(vCash),
          pix: toNumber(vPix),
          tef: toNumber(vTef)
        },
        docType: doc,
        fiscalId: idFiscal || undefined,
        status: 'COMPLETED'
      })

      // Mock NFC-e: imprime e encerra
      printText('fiscal01',
        `[MOCK] Confirmação: R$ ${money(total)} | CASH ${money(vCash)} | TEF ${money(vTef)} | DOC ${doc}${idFiscal ? ' (' + idFiscal + ')' : ''}`
      )
      
      // Limpa completamente a comanda após pagamento bem-sucedido
      // Permite reutilização imediata da mesma comanda
      removeCartDraft(orderId)
      try { clearCurrentOrderId(owner) } catch (err) { void err }
      try { releaseOrderLock(orderId, owner) } catch (err) { void err }
      try { clearUsage(orderId) } catch (err) { void err } // Remove from AWAITING_PAYMENT/RETURN states
      
      alert('Pagamento confirmado! Comanda finalizada e disponível para reutilização.')
      nav('/relatorioxz')
    } catch (error: unknown) {
      console.error('Erro ao salvar venda:', error)
      const msg = (error as Error | undefined)?.message || 'Erro ao registrar venda. Tente novamente.'
      alert(msg)
      return
    }
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter'
    if ((e.ctrlKey || e.metaKey) && isEnter) {
      e.preventDefault()
      confirmar()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      if (orderId != null) {
        try { releaseOrderLock(orderId, owner) } catch (err) { void err }
      }
      nav('/venda')
    }
  }

  return (
    <div className="container" onKeyDown={handleKeyDown}>
      <h2>Finalização</h2>

      {/* Indicador de conectividade */}
      <div className="pill" style={{ marginBottom: 8, background: isOnline ? '#e8f5e9' : '#ffebee', border: `1px solid ${isOnline ? '#a5d6a7' : '#ef9a9a'}` }}>
        {isOnline ? 'Conectado à internet' : 'Sem internet — modo offline'}
      </div>

      {isBalancaRole ? (
        <div className="card">
          <h3 className="card-title">Acesso restrito</h3>
          <p className="muted">
            O perfil <b>Balança</b> não possui permissão para finalizar comandas.
          </p>
          <button onClick={() => nav('/venda')} className="btn">
            Voltar
          </button>
        </div>
      ) : (
        <>

      {/* Campo único: Nº comanda / leitor */}
      {!orderId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label className="small muted">Nº Comanda / Código de Barras</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              autoFocus
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadByOrder()
              }}
              placeholder="Ex.: 15 ou código"
              style={{ width: 220 }}
            />
            <button className="btn btn-primary" onClick={loadByOrder}>
              Buscar
            </button>
            <button onClick={() => {
              if (orderId != null) { try { releaseOrderLock(orderId, owner) } catch (err) { void err } }
              nav('/venda')
            }} className="btn">
              Voltar
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            Dica: deixe o cursor neste campo e use o leitor; a leitura (com Enter ao final)
            carregará automaticamente a comanda.
          </p>
        </div>
      )}

      {orderId != null && (
        <>
          <div className="pill small">Comanda <b>#{orderId}</b></div>
          <span
            aria-label="Estado do lock"
            title={
              lockOwner == null
                ? 'Sem lock ativo'
                : lockOwner === 'me'
                  ? `Você detém o lock • expira em ~${lockSeconds}s`
                  : `Outra estação detém o lock • expira em ~${lockSeconds}s`
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginLeft: 4,
              fontSize: 18,
              color: lockOwner == null
                ? '#9ca3af'
                : lockOwner === 'me'
                  ? '#16a34a'
                  : '#f59e0b'
            }}
          >
            🔒
          </span>

          <div className="card" style={{ marginTop: 12 }}>
            <h3 className="card-title">Itens</h3>
            {!cart.length && <div className="muted">Nenhum item na comanda.</div>}

            {!!cart.length && (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Item</th>
                    <th>Qtd (kg/un)</th>
                    <th>Preço un.</th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((it) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>
                        <input
                          value={String(it.qty)}
                          onChange={(e) => updateQty(it, e.target.value)}
                          className="input-sm"
                          style={{ width: 90, textAlign: 'right' }}
                        />
                      </td>
                      <td>
                        <input
                          value={String(it.price)}
                          onChange={(e) => updatePrice(it, e.target.value)}
                          className="input-sm"
                          style={{ width: 90, textAlign: 'right' }}
                          disabled={!canEditPrice}
                          title={
                            canEditPrice
                              ? 'Editar preço (gerente/admin)'
                              : 'Somente gerente/admin podem editar preço'
                          }
                        />
                      </td>
                      <td>R$ {money(toNumber(it.qty) * toNumber(it.price))}</td>
                      <td>
                        <button className="btn" onClick={() => removeItem(it)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} style={{ textAlign: 'right' }}>
                      Total:
                    </th>
                    <th>R$ {money(total)}</th>
                    <th />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Documento</h3>
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <button
                className={`pill ${doc === 'NAO_FISCAL' ? 'active' : ''}`}
                onClick={() => setDoc('NAO_FISCAL')}
                title="ALT+N"
              >
                Não fiscal (Orçamento)
              </button>
              <button
                className={`pill ${doc === 'NFCE' ? 'active' : ''}`}
                onClick={() => isOnline && setDoc('NFCE')}
                title="F3"
                disabled={!isOnline}
                style={!isOnline ? { opacity: .6, cursor: 'not-allowed' } : undefined}
              >
                Fiscal (NFC-e) {isOnline ? '' : '— indisponível offline'}
              </button>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                placeholder="CPF/CNPJ (opcional)"
                value={idFiscal}
                onChange={(e) => setIdFiscal(e.target.value)}
                style={{ width: 240 }}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Pagamentos</h3>
            <div className="grid grid-3">
              <div>
                <label>
                  Dinheiro <span className="muted">F6</span>
                </label>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    value={vCash}
                    onChange={(e) => setVCash(e.target.value)}
                    className="input-lg"
                    style={{ width: 140, textAlign: 'right' }}
                  />
                  <button onClick={() => set100('cash')}>100%</button>
                </div>
              </div>

              <div>
                <label>
                  PIX <span className="muted">F7</span>
                </label>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    value={vPix}
                    onChange={(e) => setVPix(e.target.value)}
                    className="input-lg"
                    style={{ width: 140, textAlign: 'right' }}
                  />
                  <button onClick={() => set100('pix')}>100%</button>
                </div>
              </div>

              <div>
                <label>
                  Cartão (TEF) <span className="muted">F8</span>
                </label>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    value={vTef}
                    onChange={(e) => setVTef(e.target.value)}
                    className="input-lg"
                    style={{ width: 140, textAlign: 'right' }}
                  />
                  <button onClick={() => set100('tef')}>100%</button>
                </div>
              </div>
            </div>

            <div className="row" style={{ gap: 16, marginTop: 12 }}>
              <div className="pill">
                Total: <b>R$ {money(total)}</b>
              </div>
              <div className="pill">
                Pago: <b>R$ {money(pagos)}</b>
              </div>
              <div className={`pill ${falta === 0 ? 'success' : ''}`}>
                Falta: <b>R$ {money(falta)}</b>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="small muted">Subtotal informado:</span>
                <input
                  value={subtotalInfo}
                  onChange={(e) => setSubtotalInfo(e.target.value)}
                  className="input-sm"
                  style={{ width: 120, textAlign: 'right' }}
                />
              </div>
            </div>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button onClick={() => nav('/venda')} className="btn">
              Voltar
            </button>
            <button className="btn btn-primary" onClick={confirmar} title="Ctrl+Enter">
              Confirmar pagamento (Ctrl+Enter)
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 4 }}>
            Dica: atalho de teclado — Ctrl+Enter (Windows/Linux) ou ⌘+Enter (macOS) para confirmar.
          </p>
        </>
      )}
        </>
      )}
    </div>
  )
}
