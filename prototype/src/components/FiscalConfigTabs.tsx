// src/components/FiscalConfigTabs.tsx
import React, { useState } from 'react'
import type { Settings } from '../db'

interface FiscalConfigTabsProps {
  settings: Partial<Settings>
  onChange: (settings: Partial<Settings>) => void
  onSave: () => void
  onTestConnection: () => void
}

type TabType = 'empresa' | 'certificado' | 'nfce' | 'contabil'

// CNAEs mais comuns para restaurantes/food service
const CNAE_OPTIONS = [
  { value: '5611-2/01', label: '5611-2/01 - Restaurantes e similares' },
  { value: '5611-2/02', label: '5611-2/02 - Lanchonetes, casas de chá, de sucos' },
  { value: '5612-1/00', label: '5612-1/00 - Serviços ambulantes de alimentação' },
  { value: '5620-1/01', label: '5620-1/01 - Fornecimento de alimentos preparados' },
  { value: '5620-1/02', label: '5620-1/02 - Serviços de alimentação para eventos' },
]

const REGIMES_TRIBUTARIOS = [
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'REGIME_NORMAL', label: 'Lucro Real/Presumido' },
  { value: 'MEI', label: 'Microempreendedor Individual' },
]

export default function FiscalConfigTabs({
  settings,
  onChange,
  onSave,
  onTestConnection
}: FiscalConfigTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('empresa')
  const [certificateFile, setCertificateFile] = useState<File | null>(null)

  const updateField = (section: string, field: string, value: any) => {
    const updated = { ...settings }
    
    if (section === 'root') {
      ;(updated as any)[field] = value
    } else {
      if (!(updated as any)[section]) {
        ;(updated as any)[section] = {}
      }
      ;(updated as any)[section][field] = value
    }
    
    onChange(updated)
  }

  const handleCertificateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith('.pfx')) {
      setCertificateFile(file)
      updateField('certificadoDigital', 'fileName', file.name)
      // In real implementation, would read file and validate
    } else {
      alert('Por favor, selecione um arquivo .pfx válido')
    }
  }

  const addCSC = () => {
    const currentCSCs = settings.csc || []
    const newCSC = {
      id: (currentCSCs.length + 1).toString(),
      codigo: '',
      ativo: currentCSCs.length === 0
    }
    updateField('root', 'csc', [...currentCSCs, newCSC])
  }

  const updateCSC = (index: number, field: string, value: any) => {
    const currentCSCs = [...(settings.csc || [])]
    currentCSCs[index] = { ...currentCSCs[index], [field]: value }
    
    // Se ativando este CSC, desativar os outros
    if (field === 'ativo' && value) {
      currentCSCs.forEach((csc, i) => {
        if (i !== index) currentCSCs[i].ativo = false
      })
    }
    
    updateField('root', 'csc', currentCSCs)
  }

  const removeCSC = (index: number) => {
    const currentCSCs = [...(settings.csc || [])]
    currentCSCs.splice(index, 1)
    updateField('root', 'csc', currentCSCs)
  }

  const tabs = [
    { id: 'empresa', label: '🏢 Dados da Empresa', badge: null },
    { id: 'certificado', label: '🔐 Certificado Digital', badge: settings.certificadoDigital?.fileName ? '✅' : '⚠️' },
    { id: 'nfce', label: '📄 NFC-e', badge: settings.nfceConfig?.habilitadoSefaz ? '✅' : '⚠️' },
    { id: 'contabil', label: '📊 Contábil', badge: null },
  ] as const

  return (
    <div className="fiscal-config-tabs">
      {/* Tab Navigation */}
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            {tab.label}
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'empresa' && (
          <div className="tab-panel">
            <h3>🏢 Dados da Empresa para NFC-e</h3>
            
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label>Razão Social *</label>
                  <input
                    type="text"
                    value={settings.companyName || ''}
                    onChange={(e) => updateField('root', 'companyName', e.target.value)}
                    placeholder="Nome empresarial conforme CNPJ"
                  />
                </div>
                
                <div className="form-group">
                  <label>CNPJ *</label>
                  <input
                    type="text"
                    value={settings.cnpj || ''}
                    onChange={(e) => updateField('root', 'cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Inscrição Estadual *</label>
                  <input
                    type="text"
                    value={settings.inscricaoEstadual || ''}
                    onChange={(e) => updateField('root', 'inscricaoEstadual', e.target.value)}
                    placeholder="000.000.000.000"
                  />
                  <small className="form-hint">
                    Obrigatória para emissão de NFC-e em SP
                  </small>
                </div>

                <div className="form-group">
                  <label>CNAE Principal *</label>
                  <select
                    value={settings.cnae || ''}
                    onChange={(e) => updateField('root', 'cnae', e.target.value)}
                  >
                    <option value="">Selecione o CNAE</option>
                    {CNAE_OPTIONS.map(cnae => (
                      <option key={cnae.value} value={cnae.value}>{cnae.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Regime Tributário *</label>
                  <select
                    value={settings.regimeTributario || ''}
                    onChange={(e) => updateField('root', 'regimeTributario', e.target.value)}
                  >
                    <option value="">Selecione o regime</option>
                    {REGIMES_TRIBUTARIOS.map(regime => (
                      <option key={regime.value} value={regime.value}>{regime.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Endereço Linha 1 *</label>
                  <input
                    type="text"
                    value={settings.addressLine1 || ''}
                    onChange={(e) => updateField('root', 'addressLine1', e.target.value)}
                    placeholder="Rua, Número - Bairro"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Endereço Linha 2</label>
                  <input
                    type="text"
                    value={settings.addressLine2 || ''}
                    onChange={(e) => updateField('root', 'addressLine2', e.target.value)}
                    placeholder="Cidade - UF - CEP"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'certificado' && (
          <div className="tab-panel">
            <h3>🔐 Certificado Digital A1</h3>
            
            <div className="form-grid">
              <div className="certificate-upload">
                <h4>Upload do Certificado</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Arquivo do Certificado (.pfx)</label>
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={handleCertificateUpload}
                    />
                    {settings.certificadoDigital?.fileName && (
                      <small className="form-hint success">
                        ✅ Arquivo carregado: {settings.certificadoDigital.fileName}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Senha do Certificado *</label>
                    <input
                      type="password"
                      value={settings.certificadoDigital?.password || ''}
                      onChange={(e) => updateField('certificadoDigital', 'password', e.target.value)}
                      placeholder="Senha do arquivo .pfx"
                    />
                  </div>
                </div>
              </div>

              <div className="certificate-info">
                <h4>Informações do Certificado</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Válido até</label>
                    <input
                      type="date"
                      value={settings.certificadoDigital?.validUntil || ''}
                      onChange={(e) => updateField('certificadoDigital', 'validUntil', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Titular (CN)</label>
                    <input
                      type="text"
                      value={settings.certificadoDigital?.subject || ''}
                      onChange={(e) => updateField('certificadoDigital', 'subject', e.target.value)}
                      placeholder="Nome do titular no certificado"
                    />
                  </div>
                </div>
              </div>

              <div className="certificate-actions">
                <button type="button" className="btn btn-secondary" onClick={onTestConnection}>
                  🔍 Testar Certificado
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nfce' && (
          <div className="tab-panel">
            <h3>📄 Configurações NFC-e</h3>
            
            <div className="form-grid">
              <div className="nfce-basic">
                <h4>Configuração Básica</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ambiente SEFAZ</label>
                    <select
                      value={settings.nfceConfig?.ambiente || 'HOMOLOGACAO'}
                      onChange={(e) => updateField('nfceConfig', 'ambiente', e.target.value)}
                    >
                      <option value="HOMOLOGACAO">🧪 Homologação (Testes)</option>
                      <option value="PRODUCAO">🔴 Produção</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Série das Notas</label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={settings.nfceConfig?.serie || 1}
                      onChange={(e) => updateField('nfceConfig', 'serie', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Próximo Número</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.nfceConfig?.proximoNumero || 1}
                      onChange={(e) => updateField('nfceConfig', 'proximoNumero', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.nfceConfig?.habilitadoSefaz || false}
                        onChange={(e) => updateField('nfceConfig', 'habilitadoSefaz', e.target.checked)}
                      />
                      <span>Habilitado na SEFAZ-SP</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="csc-section">
                <h4>CSC - Código de Segurança do Contribuinte</h4>
                <p className="form-hint">
                  O CSC é usado para gerar o QR Code da NFC-e. Deve ser obtido no portal da SEFAZ-SP.
                </p>
                
                <div className="csc-list">
                  {(settings.csc || []).map((csc, index) => (
                    <div key={index} className="csc-item">
                      <div className="form-row">
                        <div className="form-group">
                          <label>ID CSC</label>
                          <input
                            type="text"
                            value={csc.id}
                            onChange={(e) => updateCSC(index, 'id', e.target.value)}
                            placeholder="001"
                            maxLength={3}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Código CSC</label>
                          <input
                            type="text"
                            value={csc.codigo}
                            onChange={(e) => updateCSC(index, 'codigo', e.target.value)}
                            placeholder="Código obtido na SEFAZ"
                          />
                        </div>
                        
                        <div className="form-group checkbox-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={csc.ativo}
                              onChange={(e) => updateCSC(index, 'ativo', e.target.checked)}
                            />
                            <span>Ativo</span>
                          </label>
                        </div>
                        
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removeCSC(index)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button type="button" className="btn btn-secondary" onClick={addCSC}>
                    ➕ Adicionar CSC
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contabil' && (
          <div className="tab-panel">
            <h3>📊 Integração Contábil</h3>
            
            <div className="form-grid">
              <div className="sped-section">
                <h4>SPED Fiscal</h4>
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.contabilConfig?.exportarSped || false}
                      onChange={(e) => updateField('contabilConfig', 'exportarSped', e.target.checked)}
                    />
                    <span>Exportar arquivos SPED automaticamente</span>
                  </label>
                </div>
              </div>

              <div className="xml-section">
                <h4>Envio de XMLs</h4>
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.contabilConfig?.enviarXmlContador || false}
                      onChange={(e) => updateField('contabilConfig', 'enviarXmlContador', e.target.checked)}
                    />
                    <span>Enviar XMLs das notas para o contador</span>
                  </label>
                </div>
                
                {settings.contabilConfig?.enviarXmlContador && (
                  <div className="form-group">
                    <label>Email do Contador</label>
                    <input
                      type="email"
                      value={settings.contabilConfig?.emailContador || ''}
                      onChange={(e) => updateField('contabilConfig', 'emailContador', e.target.value)}
                      placeholder="contador@escritorio.com.br"
                    />
                  </div>
                )}
              </div>

              <div className="obligations-info">
                <h4>ℹ️ Obrigações Acessórias</h4>
                <ul>
                  <li><strong>SPED Fiscal:</strong> Arquivo mensal com movimentação fiscal</li>
                  <li><strong>SPED Contribuições:</strong> PIS/COFINS para regime normal</li>
                  <li><strong>XMLs das Notas:</strong> Backup mensal para contabilidade</li>
                  <li><strong>Contingência:</strong> Prazo de 168 horas para transmitir notas offline</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onTestConnection}>
          🔍 Testar Conexão SEFAZ
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave}>
          💾 Salvar Configurações
        </button>
      </div>
    </div>
  )
}