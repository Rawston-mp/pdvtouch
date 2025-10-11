// src/components/QuickActionsToolbar.tsx
import React from 'react'
import type { Product } from '../db'

interface QuickActionsToolbarProps {
  onProductSelect: (product: Product) => void
  className?: string
}

interface QuickProduct {
  id: string
  name: string
  category: 'Pratos' | 'Bebidas' | 'Sobremesas' | 'Por Peso'
  price?: number
  pricePerKg?: number
  byWeight?: boolean
  icon: string
  shortcut: string
}

// Produtos mais frequentes/populares para acesso rápido
const QUICK_PRODUCTS: QuickProduct[] = [
  {
    id: 'p001',
    name: 'Prato Executivo',
    category: 'Pratos',
    price: 24.9,
    icon: '🍽️',
    shortcut: 'F2'
  },
  {
    id: 'b001', 
    name: 'Refrigerante Lata',
    category: 'Bebidas',
    price: 8.0,
    icon: '🥤',
    shortcut: 'F3'
  },
  {
    id: 'b003',
    name: 'Água 500ml', 
    category: 'Bebidas',
    price: 5.0,
    icon: '💧',
    shortcut: 'F4'
  },
  {
    id: 'g001',
    name: 'Self-service por Kg',
    category: 'Por Peso',
    pricePerKg: 69.9,
    byWeight: true,
    icon: '⚖️',
    shortcut: 'F5'
  },
  {
    id: 's001',
    name: 'Mousse',
    category: 'Sobremesas',
    price: 7.5,
    icon: '🍮',
    shortcut: 'F6'
  },
  {
    id: 'p002',
    name: 'Guarnição',
    category: 'Pratos', 
    price: 12.0,
    icon: '🥗',
    shortcut: 'F7'
  }
]

const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({ 
  onProductSelect, 
  className = '' 
}) => {
  
  const handleQuickProduct = (quickProduct: QuickProduct) => {
    const product: Product = {
      id: quickProduct.id,
      name: quickProduct.name,
      category: quickProduct.category,
      byWeight: quickProduct.byWeight || false,
      price: quickProduct.price || 0,
      pricePerKg: quickProduct.pricePerKg || 0,
      active: true,
      code: quickProduct.id.toUpperCase()
    }
    onProductSelect(product)
  }

  return (
    <div className={`quick-actions-toolbar ${className}`}>
      <div className="quick-actions-header">
        <span className="quick-actions-title">🚀 Ações Rápidas</span>
        <span className="quick-actions-subtitle">Produtos mais vendidos</span>
      </div>
      
      <div className="quick-actions-grid">
        {QUICK_PRODUCTS.map((item) => (
          <button
            key={item.id}
            className="quick-action-btn"
            onClick={() => handleQuickProduct(item)}
            title={`${item.name} - ${item.shortcut}\n${
              item.byWeight 
                ? `R$ ${item.pricePerKg?.toFixed(2)}/kg` 
                : `R$ ${item.price?.toFixed(2)}`
            }`}
          >
            <div className="quick-action-icon">{item.icon}</div>
            <div className="quick-action-info">
              <div className="quick-action-name">{item.name}</div>
              <div className="quick-action-price">
                {item.byWeight 
                  ? `R$ ${item.pricePerKg?.toFixed(2)}/kg`
                  : `R$ ${item.price?.toFixed(2)}`
                }
              </div>
            </div>
            <div className="quick-action-shortcut">{item.shortcut}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActionsToolbar