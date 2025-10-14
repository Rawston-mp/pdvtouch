// src/components/MobileCartToggle.tsx
import React from 'react'

interface MobileCartToggleProps {
  itemCount: number
  onClick: () => void
}

export default function MobileCartToggle({ itemCount, onClick }: MobileCartToggleProps) {
  return (
    <button className="mobile-cart-toggle" onClick={onClick}>
      🛒
      {itemCount > 0 && (
        <span className="mobile-cart-badge">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  )
}