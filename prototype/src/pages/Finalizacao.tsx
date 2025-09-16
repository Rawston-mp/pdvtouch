import React, { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useSession } from "../auth/session"
import { loadCartDraft, saveCartDraft, removeCartDraft, type CartItem } from "../lib/cartStorage"
import { printText } from "../mock/devices"
import { db } from "../db"
import type { Order, OrderItem, Payment } from "../db/models"

const toNumber = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const money = (v: unknown) => toNumber(v).toFixed(2)

function parseOrderFromScan(val: string): number | null {
  if (!val) return null
  const digits = (val.match(/\d+/g) || []).join("")
  if (!digits) return null
  const n = Number(digits)
  if (!Number.isFinite(n)) return null
  if (n < 1 || n > 100) return null
  return n
}

type DocType = "NAO_FISCAL" | "NFCE" | "SAT"

export default function Finalizacao() {
  const nav = useNavigate()
  const location = useLocation()
  const state = (location as { state?: any }).state || {}
  const { user } = useSession()
  const roleRaw = (user?.role ?? "CAIXA") as string
  const role = roleRaw.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase()

  // Hooks no topo
  const [orderIdInput, setOrderIdInput] = useState<string>(state?.orderId ? String(state.orderId) : "")
  const [orderId, setOrderId] = useState<number | null>(state?.orderId ?? null)
  const [cart, setCart] = useState<CartItem[]>(Array.isArray(state?.cart) ? state.cart : [])
  const [doc, setDoc] = useState<DocType>("NAO_FISCAL")
  const [idFiscal, setIdFiscal] = useState<string>("")
  const [vCash, setVCash] = useState<string>("0")
  const [vPix, setVPix] = useState<string>("0")
  const [vTef, setVTef] = useState<string>("0")
  const [subtotalInfo, setSubtotalInfo] = useState<string>("0")
  const total = useMemo(() => cart.reduce((acc, it) => acc + toNumber(it.qty) * toNumber(it.price), 0), [cart])
  const pagos = useMemo(() => toNumber(vCash) + toNumber(vPix) + toNumber(vTef), [vCash, vPix, vTef])
  const falta = useMemo(() => Math.max(0, total - pagos), [total, pagos])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F6") { e.preventDefault(); set100("cash") }
      if (e.key === "F7") { e.preventDefault(); set100("pix") }
      if (e.key === "F8") { e.preventDefault(); set100("tef") }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); confirmar() }
      if (e.key === "Escape") { e.preventDefault(); nav("/venda") }
      if (e.key === "F3") { e.preventDefault(); setDoc("NFCE") }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, vCash, vPix, vTef, cart, orderId, doc, idFiscal])
  useEffect(() => {
    if (orderId != null) saveCartDraft(orderId, cart)
  }, [cart, orderId])

  // Bloqueio: balança não finaliza
  if (role === "BALANCA") {
    return (
      <div className="container">
        <h2>Finalização</h2>
        <div className="card">
          <h3 className="card-title">Acesso restrito</h3>
          <p className="muted">
            O perfil <b>Balança</b> não possui permissão para finalizar comandas.
          </p>
          <button onClick={() => nav("/venda")} className="btn">Voltar</button>
        </div>
      </div>
    )
  }

  // Carregar por comanda/leitor
  async function loadByOrder() {
    const parsed = parseOrderFromScan(orderIdInput)
    if (parsed == null) {
      alert("Informe/escaneie um Nº de comanda válido (1–100).")
      return
    }
    const draft = loadCartDraft(parsed) || []
    setOrderId(parsed)
    setCart(draft.map((x) => ({ ...x, price: toNumber(x.price), qty: toNumber(x.qty) })))
    setVCash("0"); setVPix("0"); setVTef("0")
  }

  // Edição de itens
  const canEditPrice = role === "GERENTE" || role === "ADMIN"
  function updateQty(it: CartItem, next: string) {
    setCart((c) => c.map((x) => (x.id === it.id ? { ...x, qty: Math.max(0, toNumber(next)) } : x)))
  }
  function updatePrice(it: CartItem, next: string) {
    if (!canEditPrice) return
    setCart((c) => c.map((x) => (x.id === it.id ? { ...x, price: Math.max(0, toNumber(next)) } : x)))
  }
  function removeItem(it: CartItem) {
    setCart((c) => c.filter((x) => x.id !== it.id))
  }

  function set100(which: "cash" | "pix" | "tef") {
    const resto = Math.max(
      0,
      total -
        (which === "cash"
          ? toNumber(vPix) + toNumber(vTef)
          : which === "pix"
          ? toNumber(vCash) + toNumber(vTef)
          : toNumber(vCash) + toNumber(vPix))
    )
    const v = money(resto)
    if (which === "cash") setVCash(v)
    if (which === "pix") setVPix(v)
    if (which === "tef") setVTef(v)
  }

  async function confirmar() {
    if (orderId == null) {
      alert("Informe/escaneie a comanda para finalizar.")
      return
    }
    if (!cart.length) {
      alert("Comanda vazia.")
      return
    }
    if (toNumber(subtotalInfo) > 0 && Math.abs(toNumber(subtotalInfo) - total) > 0.009) {
      alert("O subtotal informado não confere com o total calculado.")
      return
    }
    if (Math.abs(total - pagos) > 0.009) {
      alert("Os pagamentos não fecham com o total.")
      return
    }

    // Monta itens do pedido
    const orderItems: OrderItem[] = cart.map((it) => ({
      id: it.id,
      productId: Number(it.code) || 0,
      name: it.name,
      qty: it.qty,
      unitPrice: it.price,
      total: it.qty * it.price,
      isWeight: it.unit === "kg",
    }))

    // Monta pagamentos
    const payments: Payment[] = []
    if (toNumber(vCash) > 0) payments.push({ id: "cash", method: "CASH", amount: toNumber(vCash) })
    if (toNumber(vPix) > 0) payments.push({ id: "pix", method: "PIX", amount: toNumber(vPix) })
    if (toNumber(vTef) > 0) payments.push({ id: "tef", method: "TEF", amount: toNumber(vTef) })

    // Monta pedido
    const order: Order = {
      id: `COMANDA-${orderId}`,
      createdAt: Date.now(),
      status: "PAID",
      items: orderItems,
      payments,
      total,
      receiptMode: doc === "NAO_FISCAL" ? "NAO_FISCAL" : doc === "NFCE" ? "FISCAL_NFCE" : "FISCAL_SAT",
      customerIdType: idFiscal.length === 11 ? "CPF" : idFiscal.length === 14 ? "CNPJ" : "NONE",
      customerTaxId: idFiscal || null,
    }

    // Salva pedido no banco
    await db.orders.add(order)

    // PIX → vai para a tela dedicada (salva antes de redirecionar)
    if (toNumber(vPix) > 0) {
      nav("/pix", {
        state: {
          orderId,
          amount: toNumber(vPix),
          cart,
          from: "finalizacao",
          doc,
          idFiscal,
        },
      })
      removeCartDraft(orderId)
      return
    }

    // Mock NFC-e/SAT: imprime e encerra
    await printText(
      "mock",
      `[MOCK] Confirmação: R$ ${money(total)} | CASH ${money(vCash)} | TEF ${money(vTef)} | DOC ${doc}${idFiscal ? " (" + idFiscal + ")" : ""}`
    )
    removeCartDraft(orderId)
    alert("Pagamento confirmado (mock). Comanda encerrada.")
    nav("/relatorioxz")
  }

  // JSX principal
  return (
    <div className="container">
      <h2>Finalização</h2>
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
                if (e.key === "Enter") loadByOrder()
              }}
              placeholder="Ex.: 15 ou código"
              style={{ width: 220 }}
            />
            <button className="btn btn-primary" onClick={loadByOrder}>Buscar</button>
            <button onClick={() => nav("/venda")} className="btn">Voltar</button>
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            Dica: deixe o cursor neste campo e use o leitor; a leitura (com Enter ao final)
            carregará automaticamente a comanda.
          </p>
        </div>
      )}
      {orderId != null && (
        <>
          <div className="pill small">
            Comanda <b>#{orderId}</b>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3 className="card-title">Itens</h3>
            {!cart.length && <div className="muted">Nenhum item na comanda.</div>}
            {!!cart.length && (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Item</th>
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
                          style={{ width: 90, textAlign: "right" }}
                        />
                      </td>
                      <td>
                        <input
                          value={String(it.price)}
                          onChange={(e) => updatePrice(it, e.target.value)}
                          className="input-sm"
                          style={{ width: 90, textAlign: "right" }}
                          disabled={!canEditPrice}
                          title={canEditPrice ? "Editar preço (gerente/admin)" : "Somente gerente/admin podem editar preço"}
                        />
                      </td>
                      <td>R$ {money(toNumber(it.qty) * toNumber(it.price))}</td>
                      <td>
                        <button className="btn" onClick={() => removeItem(it)}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} style={{ textAlign: "right" }}>Total:</th>
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
                className={`pill ${doc === "NAO_FISCAL" ? "active" : ""}`}
                onClick={() => setDoc("NAO_FISCAL")}
                title="ALT+N"
              >
                Não fiscal (Orçamento)
              </button>
              <button
                className={`pill ${doc === "NFCE" ? "active" : ""}`}
                onClick={() => setDoc("NFCE")}
                title="F3"
              >
                Fiscal (NFC-e)
              </button>
              <button
                className={`pill ${doc === "SAT" ? "active" : ""}`}
                onClick={() => setDoc("SAT")}
              >
                Fiscal (SAT — legado)
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
                <label>Dinheiro <span className="muted">F6</span></label>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    value={vCash}
                    onChange={(e) => setVCash(e.target.value)}
                    className="input-lg"
                    style={{ width: 140, textAlign: "right" }}
                  />
                  <button onClick={() => set100("cash")}>100%</button>
                </div>
              </div>

              <div>
                <label>PIX <span className="muted">F7</span></label>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    value={vPix}
                    onChange={(e) => setVPix(e.target.value)}
                    className="input-lg"
                    style={{ width: 140, textAlign: "right" }}
                  />
                  <button onClick={() => set100("pix")}>100%</button>
                </div>
              </div>

              <div>
                <label>Cartão (TEF) <span className="muted">F8</span></label>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    value={vTef}
                    onChange={(e) => setVTef(e.target.value)}
                    className="input-lg"
                    style={{ width: 140, textAlign: "right" }}
                  />
                  <button onClick={() => set100("tef")}>100%</button>
                </div>
              </div>
            </div>

            <div className="row" style={{ gap: 16, marginTop: 12 }}>
              <div className="pill">Total: <b>R$ {money(total)}</b></div>
              <div className="pill">Pago: <b>R$ {money(pagos)}</b></div>
              <div className={`pill ${falta === 0 ? "success" : ""}`}>
                Falta: <b>R$ {money(falta)}</b>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="small muted">Subtotal informado:</span>
                <input
                  value={subtotalInfo}
                  onChange={(e) => setSubtotalInfo(e.target.value)}
                  className="input-sm"
                  style={{ width: 120, textAlign: "right" }}
                />
              </div>
            </div>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button onClick={() => nav("/venda")} className="btn">Voltar</button>
            <button className="btn btn-primary" onClick={confirmar} title="Ctrl+Enter">
              Confirmar pagamento (Ctrl+Enter)
            </button>
          </div>
        </>
      )}
    </div>
  )
}