// src/components/QuickActionsToolbar.tsx
import React from 'react'
import type { Product } from '../db'
import { useProductCatalog } from '../hooks/useProductSync'

interface QuickActionsToolbarProps {
  onProductSelect: (product: Product) => void
  className?: string
}

interface QuickActionConfig {
  id: string
  icon: string
  shortcut: string
}

// Configuração dos produtos para ações rápidas (só IDs e visual)
const QUICK_ACTIONS_CONFIG: QuickActionConfig[] = [
  {
    id: 'p001',
    icon: '🍽️',
    shortcut: 'F2'
  },
  {
    id: 'b001', 
    icon: '🥤',
    shortcut: 'F3'
  },
  {
    id: 'b003',
    icon: '💧',
    shortcut: 'F4'
  },
  {
    id: 'g001',
    icon: '⚖️',
    shortcut: 'F5'
  },
  {
    id: 's001',
    icon: '🍮',
    shortcut: 'F6'
  },
  {
    id: 'p002',
    icon: '🥗',
    shortcut: 'F7'
  }
]

const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({ 
  onProductSelect, 
  className = '' 
}) => {
  // Usar o mesmo catálogo sincronizado que a tela principal
  const { products: catalog } = useProductCatalog()
  
  // Buscar produtos reais do banco de dados com dados atualizados
  const quickProducts = QUICK_ACTIONS_CONFIG.map(config => {
    const product = catalog.find((p: Product) => p.id === config.id)
    return product ? { product, config } : null
  }).filter((item): item is { product: Product; config: QuickActionConfig } => item !== null)
  
  const handleQuickProduct = (product: Product) => {
    onProductSelect(product)
  }

  return (
    <div className={`quick-actions-toolbar ${className}`}>
      <div className="quick-actions-header">
        <span className="quick-actions-title">🚀 Ações Rápidas</span>
        <span className="quick-actions-subtitle">Produtos mais vendidos</span>
      </div>
      
      <div className="quick-actions-grid">
        {quickProducts.map(({ product, config }) => (
          <button
            key={product.id}
            className="quick-action-btn"
            onClick={() => handleQuickProduct(product)}
            title={`${product.name} - ${config.shortcut}\n${
              product.byWeight 
                ? `R$ ${product.pricePerKg?.toFixed(2)}/kg` 
                : `R$ ${product.price?.toFixed(2)}`
            }`}
          >
            <div className="quick-action-icon">{config.icon}</div>
            <div className="quick-action-info">
              <div className="quick-action-name">{product.name}</div>
              <div className="quick-action-price">
                {product.byWeight 
                  ? `R$ ${product.pricePerKg?.toFixed(2)}/kg`
                  : `R$ ${product.price?.toFixed(2)}`
                }
              </div>
            </div>
            <div className="quick-action-shortcut">{config.shortcut}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActionsToolbar