// src/components/ProductFormTabs.tsx
import React, { useState } from 'react'
import type { Product } from '../db'

// Extend Product type to include new fields
type ExtendedProduct = Product & {
  unit?: string
  profitMargin?: number
  costPrice?: number
  mcm?: number
  salePrice?: number
  cfop?: string
  cst?: string
  ncm?: string
  icmsRate?: number
  icmsBase?: number
  pisCst?: string
  pisRate?: number
  cofinsCst?: string
  cofinsRate?: number
}

interface ProductFormTabsProps {
  product: Partial<ExtendedProduct>
  onChange: (product: Partial<ExtendedProduct>) => void
  onSave: () => void
  onCancel: () => void
  isEditing: boolean
}

type TabType = 'basic' | 'pricing' | 'fiscal'

// CFOPs mais comuns
const CFOP_OPTIONS = [
  { value: '5101', label: '5101 - Venda de produção do estabelecimento' },
  { value: '5102', label: '5102 - Venda de mercadoria adquirida ou recebida de terceiros' },
  { value: '5405', label: '5405 - Venda de mercadoria sujeita ao regime de substituição tributária' },
  { value: '5403', label: '5403 - Venda de mercadoria em operação com não contribuinte' },
  { value: '5949', label: '5949 - Outra saída de mercadoria ou prestação de serviço não especificado' },
  { value: '6101', label: '6101 - Venda de produção do estabelecimento (interestadual)' },
  { value: '6102', label: '6102 - Venda de mercadoria adquirida de terceiros (interestadual)' },
]

// CSTs mais comuns para Simples Nacional
const CST_OPTIONS = [
  { value: '101', label: '101 - Tributada pelo Simples Nacional com permissão de crédito' },
  { value: '102', label: '102 - Tributada pelo Simples Nacional sem permissão de crédito' },
  { value: '103', label: '103 - Isenção do ICMS no Simples Nacional' },
  { value: '300', label: '300 - Imune' },
  { value: '400', label: '400 - Não tributada pelo Simples Nacional' },
  { value: '500', label: '500 - ICMS cobrado anteriormente por substituição tributária' },
]

// PIS/COFINS CSTs para Simples Nacional
const PIS_COFINS_CST = [
  { value: '49', label: '49 - Outras operações de saída' },
  { value: '50', label: '50 - Operação com direito a crédito - Vinculada exclusivamente à receita tributada no mercado interno' },
  { value: '99', label: '99 - Outras operações' },
]

const UNIT_OPTIONS = [
  { value: 'UN', label: 'Unidade' },
  { value: 'KG', label: 'Quilograma' },
  { value: 'G', label: 'Grama' },
  { value: 'L', label: 'Litro' },
  { value: 'ML', label: 'Mililitro' },
  { value: 'M', label: 'Metro' },
  { value: 'M2', label: 'Metro quadrado' },
  { value: 'M3', label: 'Metro cúbico' },
  { value: 'CX', label: 'Caixa' },
  { value: 'PC', label: 'Peça' },
]

export default function ProductFormTabs({
  product,
  onChange,
  onSave,
  onCancel,
  isEditing
}: ProductFormTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic')

  const updateField = (field: string, value: string | number | boolean) => {
    const updated = { ...product, [field]: value } as Partial<ExtendedProduct>
    
    // Auto-calculate sale price ONLY when cost or margin changes (not when price is being edited manually)
    if (field === 'costPrice' || field === 'profitMargin') {
      const cost = field === 'costPrice' ? parseFloat(value?.toString() || '0') : parseFloat(product.costPrice?.toString() || '0')
      const margin = field === 'profitMargin' ? parseFloat(value?.toString() || '0') : parseFloat(product.profitMargin?.toString() || '0')
      
      if (cost > 0 && margin > 0) {
        const salePrice = cost * (1 + margin / 100)
        updated.salePrice = salePrice
        // Para produtos unitários, atualizar price também
        if (!product.byWeight) {
          updated.price = salePrice
        }
      }
    }

    onChange(updated)
  }

  const formatMoney = (value: number | undefined | null) => {
    return value ? value.toFixed(2) : '0.00'
  }

  const tabs = [
    { id: 'basic', label: '📋 Dados Básicos', count: 0 },
    { id: 'pricing', label: '💰 Precificação', count: 0 },
    { id: 'fiscal', label: '🏛️ Fiscal', count: 0 },
  ] as const

  return (
    <div className="product-form-tabs">
      {/* Tab Navigation */}
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'basic' && (
          <div className="tab-panel">
            <h3>📋 Informações Básicas do Produto</h3>
            
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label>ID# do Produto</label>
                  <input
                    type="text"
                    value={product.id || ''}
                    onChange={(e) => updateField('id', e.target.value)}
                    placeholder="AUTO ou manual"
                  />
                </div>
                
                <div className="form-group">
                  <label>Nome do Produto *</label>
                  <input
                    type="text"
                    value={product.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Ex: Hambúrguer Artesanal"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoria *</label>
                  <select
                    value={product.category || 'Pratos'}
                    onChange={(e) => updateField('category', e.target.value)}
                  >
                    <option value="Pratos">Pratos</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Sobremesas">Sobremesas</option>
                    <option value="Por Peso">Por Peso</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Unidade</label>
                  <select
                    value={product.unit || 'UN'}
                    onChange={(e) => updateField('unit', e.target.value)}
                  >
                    {UNIT_OPTIONS.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Código/PLU/EAN</label>
                  <input
                    type="text"
                    value={product.code || ''}
                    onChange={(e) => updateField('code', e.target.value)}
                    placeholder="Código de barras ou PLU"
                  />
                </div>

                <div className="form-group">
                  <label>MCM (Múltiplo de Compra)</label>
                  <input
                    type="number"
                    min="1"
                    value={product.mcm || 1}
                    onChange={(e) => updateField('mcm', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={product.byWeight || false}
                      onChange={(e) => updateField('byWeight', e.target.checked)}
                    />
                    <span>Produto vendido por peso (Kg)</span>
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={product.active !== false}
                      onChange={(e) => updateField('active', e.target.checked)}
                    />
                    <span>Produto ativo</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="tab-panel">
            <h3>💰 Gestão de Preços e Margem</h3>
            
            <div className="form-grid">
              <div className="pricing-section">
                <h4>Custo e Margem</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Custo Inicial *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={product.costPrice || ''}
                      onChange={(e) => updateField('costPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label>Margem de Lucro (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={product.profitMargin || ''}
                      onChange={(e) => updateField('profitMargin', parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              <div className="pricing-section">
                <h4>Preços de Venda</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Preço de Venda {!product.byWeight && '*'}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={product.byWeight ? (product.salePrice || '') : (product.price || '')}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        if (product.byWeight) {
                          updateField('salePrice', value)
                        } else {
                          updateField('price', value)
                        }
                      }}
                      placeholder="0.00"
                    />
                    <small className="form-hint">
                      {product.byWeight ? 'Preço por unidade' : 'Preço unitário final'}
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Preço por Kg {product.byWeight && '*'}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={product.pricePerKg || ''}
                      onChange={(e) => updateField('pricePerKg', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      disabled={!product.byWeight}
                    />
                    <small className="form-hint">
                      Apenas para produtos vendidos por peso
                    </small>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              {product.costPrice && product.profitMargin && (
                <div className="pricing-summary">
                  <h4>Resumo da Precificação</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span>Custo:</span>
                      <strong>R$ {formatMoney(product.costPrice)}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Margem:</span>
                      <strong>{product.profitMargin}%</strong>
                    </div>
                    <div className="summary-item">
                      <span>Preço Sugerido:</span>
                      <strong>R$ {formatMoney(product.salePrice)}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Lucro Unitário:</span>
                      <strong>R$ {formatMoney((product.salePrice || 0) - (product.costPrice || 0))}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'fiscal' && (
          <div className="tab-panel">
            <h3>🏛️ Configurações Fiscais</h3>
            
            <div className="form-grid">
              <div className="fiscal-section">
                <h4>Identificação Fiscal</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>CFOP *</label>
                    <select
                      value={product.cfop || '5102'}
                      onChange={(e) => updateField('cfop', e.target.value)}
                    >
                      <option value="">Selecione o CFOP</option>
                      {CFOP_OPTIONS.map(cfop => (
                        <option key={cfop.value} value={cfop.value}>{cfop.label}</option>
                      ))}
                    </select>
                    <small className="form-hint">
                      Código Fiscal de Operações e Prestações
                    </small>
                  </div>

                  <div className="form-group">
                    <label>NCM</label>
                    <input
                      type="text"
                      value={product.ncm || ''}
                      onChange={(e) => updateField('ncm', e.target.value)}
                      placeholder="0000.00.00"
                      maxLength={10}
                    />
                    <small className="form-hint">
                      Nomenclatura Comum do Mercosul
                    </small>
                  </div>
                </div>
              </div>

              <div className="fiscal-section">
                <h4>ICMS (Simples Nacional)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>CST/CSOSN</label>
                    <select
                      value={product.cst || '102'}
                      onChange={(e) => updateField('cst', e.target.value)}
                    >
                      <option value="">Selecione o CST</option>
                      {CST_OPTIONS.map(cst => (
                        <option key={cst.value} value={cst.value}>{cst.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Alíquota ICMS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={product.icmsRate || ''}
                      onChange={(e) => updateField('icmsRate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="fiscal-section">
                <h4>PIS/COFINS</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>CST PIS</label>
                    <select
                      value={product.pisCst || '49'}
                      onChange={(e) => updateField('pisCst', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {PIS_COFINS_CST.map(cst => (
                        <option key={cst.value} value={cst.value}>{cst.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Alíquota PIS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={product.pisRate || ''}
                      onChange={(e) => updateField('pisRate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>CST COFINS</label>
                    <select
                      value={product.cofinsCst || '49'}
                      onChange={(e) => updateField('cofinsCst', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {PIS_COFINS_CST.map(cst => (
                        <option key={cst.value} value={cst.value}>{cst.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Alíquota COFINS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={product.cofinsRate || ''}
                      onChange={(e) => updateField('cofinsRate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="fiscal-note">
                <h4>ℹ️ Informações Importantes</h4>
                <ul>
                  <li><strong>CFOP 5102:</strong> Mais comum para restaurantes - venda de mercadoria adquirida de terceiros</li>
                  <li><strong>CFOP 5101:</strong> Para produtos de produção própria (fabricação)</li>
                  <li><strong>CST 102:</strong> Padrão Simples Nacional sem crédito de ICMS</li>
                  <li><strong>Simples Nacional:</strong> PIS/COFINS já inclusos na alíquota unificada</li>
                  <li><strong>NCM:</strong> Consulte na <a href="https://portalunico.siscomex.gov.br/classif/#/nomenclatura" target="_blank" rel="noopener">Receita Federal</a></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave}>
          {isEditing ? 'Atualizar Produto' : 'Salvar Produto'}
        </button>
      </div>
    </div>
  )
}