// src/components/CartToggleCompact.tsx
import React from 'react'

interface CartToggleCompactProps {
  isVisible: boolean
  itemCount: number
  onToggle: () => void
}

export default function CartToggleCompact({ isVisible, itemCount, onToggle }: CartToggleCompactProps) {
  return (
    <button 
      className={`cart-toggle-compact ${!isVisible ? 'cart-hidden' : ''}`}
      onClick={onToggle}
      title={isVisible ? 'Ocultar carrinho' : 'Mostrar carrinho'}
    >
      {isVisible ? '👁️' : '🛒'}
      {!isVisible && itemCount > 0 && (
        <span 
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: 16,
            height: 16,
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}
        >
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  )
}