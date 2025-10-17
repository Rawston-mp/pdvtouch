// src/components/CartSidebar.tsx
import React from 'react'
import type { CartItem } from '../lib/cartStorage'

interface CartSidebarProps {
  cart: CartItem[]
  total: number
  orderActive: boolean
  quickQty: string
  pesoItemId: string | null
  lockSeconds: number
  lockOwner: string | null
  canFinalize: boolean
  // Actions
  onQuantityChange: (value: string) => void
  onKeypad: (key: string) => void
  onApplyQuickQty: () => void
  onIncrement: (item: CartItem) => void
  onDecrement: (item: CartItem) => void
  onRemoveItem: (item: CartItem) => void
  onClearCart: () => void
  onReadWeight: () => void
  onWeightItemChange: (itemId: string | null) => void
  onFinalize: () => void
  onNext?: () => void
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const fmt = (v: unknown) => num(v).toFixed(2)

export default function CartSidebar({
  cart,
  total,
  orderActive,
  quickQty,
  pesoItemId,
  lockSeconds,
  lockOwner,
  canFinalize,
  onQuantityChange,
  onKeypad,
  onApplyQuickQty,
  onIncrement,
  onDecrement,
  onRemoveItem,
  onClearCart,
  onReadWeight,
  onWeightItemChange,
  onFinalize,
  onNext
}: CartSidebarProps) {
  const hasWeightItems = React.useMemo(() => cart.some((x) => x.unit === 'kg'), [cart])
  return (
    <aside className="cart-sidebar">
      {/* Header com status da venda */}
      <div className="cart-header">
        <div className="cart-status">
          {orderActive ? (
            <div className="status-active">
              <div className="status-indicator active"></div>
              <span>Venda Ativa</span>
            </div>
          ) : (
            <div className="status-inactive">
              <div className="status-indicator inactive"></div>
              <span>Aguardando Comanda</span>
            </div>
          )}
          {lockOwner && (
            <div className="lock-info">
              🔒 {lockSeconds}s
            </div>
          )}
        </div>
      </div>

      {/* Lista do Carrinho (prioridade alta) */}
      <div className="cart-section cart-items-section">
        <div className="section-header">
          <h4>Carrinho ({cart.length})</h4>
          {cart.length > 0 && (
            <button className="btn-clear" onClick={onClearCart} disabled={!orderActive}>
              🗑️
            </button>
          )}
        </div>
        
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <span>🛒</span>
              <p>Carrinho vazio</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item-compact">
                <div className="item-info">
                  <div className="item-name">{item.name}</div>
                  <div className="item-details">
                    {item.unit === 'kg'
                      ? `${num(item.qty).toFixed(3)}kg × R$${fmt(item.price)}`
                      : `${num(item.qty)}un × R$${fmt(item.price)}`}
                  </div>
                </div>
                
                <div className="item-controls">
                  <div className="item-total">
                    R$ {fmt(num(item.price) * num(item.qty))}
                  </div>
                  
                  {item.unit === 'unit' ? (
                    <div className="qty-controls">
                      <button 
                        className="qty-btn" 
                        disabled={!orderActive} 
                        onClick={() => onDecrement(item)}
                      >
                        −
                      </button>
                      <span className="qty-display">{num(item.qty)}</span>
                      <button 
                        className="qty-btn" 
                        disabled={!orderActive} 
                        onClick={() => onIncrement(item)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="weight-display">
                      {num(item.qty).toFixed(3)}kg
                    </div>
                  )}
                  
                  <button 
                    className="remove-btn"
                    disabled={!orderActive}
                    onClick={() => onRemoveItem(item)}
                    title="Remover item"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quantidade Rápida */}
      <div className="cart-section">
        <div className="section-header">
          <h4>Quantidade</h4>
          <input
            className="qty-input"
            type="text"
            inputMode="numeric"
            value={quickQty}
            onChange={(e) => onQuantityChange(e.target.value.replace(/[^\d]/g, '') || '1')}
            disabled={!orderActive}
          />
        </div>
        
        <div className="keypad-compact">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((k) => (
            <button 
              key={k} 
              className="keypad-btn"
              disabled={!orderActive} 
              onClick={() => {
                if (k === '✓') onApplyQuickQty()
                else if (k === '⌫') onKeypad('B')
                else onKeypad(k)
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Peso (exibido somente quando há itens por peso) */}
      {hasWeightItems && (
        <div className="cart-section">
          <div className="section-header">
            <h4>⚖️ Balança</h4>
          </div>
          <div className="weight-controls">
            <select
              className="weight-select"
              disabled={!orderActive}
              value={pesoItemId ?? ''}
              onChange={(e) => onWeightItemChange(e.target.value || null)}
            >
              <option value="">Item por peso...</option>
              {cart
                .filter((x) => x.unit === 'kg')
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
            <button 
              className="btn btn-primary btn-touch"
              disabled={!orderActive || !pesoItemId}
              onClick={onReadWeight}
            >
              Pesar
            </button>
          </div>
        </div>
      )}

      {/* Total e Ações */}
      <div className="cart-footer">
        <div className="cart-total-display">
          <span className="total-label">Total</span>
          <span className="total-value">R$ {fmt(total)}</span>
        </div>
        
        <div className="cart-actions">
          {canFinalize ? (
            <button
              className="btn btn-primary btn-touch-lg finalize-btn"
              disabled={!orderActive || cart.length === 0}
              onClick={onFinalize}
            >
              💳 Finalizar (F9)
            </button>
          ) : (
            <button
              className="btn btn-primary btn-touch-lg next-btn"
              disabled={!orderActive}
              onClick={onNext}
            >
              ➡️ Próximo Cliente
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}