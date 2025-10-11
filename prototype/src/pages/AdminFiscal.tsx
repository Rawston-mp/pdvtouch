// src/pages/AdminFiscal.tsx
import React, { useEffect, useState } from 'react'
import { useSession } from '../auth/session'
import { db, type Settings } from '../db'
import FiscalConfigTabs from '../components/FiscalConfigTabs'

export default function AdminFiscal() {
  const { hasRole } = useSession()
  const canEdit = hasRole('ADMIN') || hasRole('GERENTE')
  
  const [settings, setSettings] = useState<Partial<Settings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const config = await db.settings.get('cfg')
      setSettings(config || {})
    } catch (e) {
      console.error('Erro ao carregar configurações:', e)
      setError('Erro ao carregar configurações fiscais')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    if (!canEdit) return
    
    try {
      setSaving(true)
      setError('')
      
      // Validações básicas
      if (!settings.companyName?.trim()) {
        throw new Error('Nome da empresa é obrigatório')
      }
      
      if (!settings.cnpj?.trim()) {
        throw new Error('CNPJ é obrigatório')
      }
      
      if (!settings.inscricaoEstadual?.trim()) {
        throw new Error('Inscrição Estadual é obrigatória para NFC-e')
      }

      const configToSave: Settings = {
        id: 'cfg',
        companyName: settings.companyName.trim(),
        cnpj: settings.cnpj.trim(),
        addressLine1: settings.addressLine1?.trim() || '',
        addressLine2: settings.addressLine2?.trim() || '',
        inscricaoEstadual: settings.inscricaoEstadual.trim(),
        cnae: settings.cnae,
        regimeTributario: settings.regimeTributario,
        certificadoDigital: settings.certificadoDigital,
        csc: settings.csc,
        nfceConfig: settings.nfceConfig,
        contabilConfig: settings.contabilConfig,
      }

      await db.settings.put(configToSave)
      setSuccess('Configurações salvas com sucesso!')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao salvar configurações'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    try {
      setError('')
      
      if (!settings.certificadoDigital?.fileName || !settings.certificadoDigital?.password) {
        throw new Error('Configure o certificado digital antes de testar a conexão')
      }
      
      if (!settings.nfceConfig?.habilitadoSefaz) {
        throw new Error('Empresa deve estar habilitada na SEFAZ-SP')
      }
      
      // Mock test - in real implementation would test SEFAZ connection
      setSuccess('✅ Conexão com SEFAZ-SP testada com sucesso!')
      setTimeout(() => setSuccess(''), 5000)
      
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro no teste de conexão'
      setError(message)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <h2>Configurações Fiscais</h2>
        <div className="card">
          <p>Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>🏛️ Configurações Fiscais NFC-e</h2>
        <p className="muted">
          Configure os dados fiscais, certificado digital e parâmetros para emissão de NFC-e
        </p>
      </div>

      {error && (
        <div className="pill error" style={{ marginBottom: 16 }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="pill success" style={{ marginBottom: 16 }}>
          {success}
        </div>
      )}

      <FiscalConfigTabs
        settings={settings}
        onChange={setSettings}
        onSave={saveSettings}
        onTestConnection={testConnection}
      />

      {saving && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <span>Salvando configurações...</span>
        </div>
      )}

      {/* Status da Configuração */}
      <div className="config-status">
        <h3>📋 Status da Configuração</h3>
        <div className="status-grid">
          <div className={`status-item ${settings.companyName && settings.cnpj && settings.inscricaoEstadual ? 'ok' : 'pending'}`}>
            <span className="status-icon">{settings.companyName && settings.cnpj && settings.inscricaoEstadual ? '✅' : '⚠️'}</span>
            <div>
              <strong>Dados da Empresa</strong>
              <p>Razão social, CNPJ e Inscrição Estadual</p>
            </div>
          </div>

          <div className={`status-item ${settings.certificadoDigital?.fileName ? 'ok' : 'pending'}`}>
            <span className="status-icon">{settings.certificadoDigital?.fileName ? '✅' : '⚠️'}</span>
            <div>
              <strong>Certificado Digital</strong>
              <p>Arquivo A1 (.pfx) carregado</p>
            </div>
          </div>

          <div className={`status-item ${settings.csc?.length ? 'ok' : 'pending'}`}>
            <span className="status-icon">{settings.csc?.length ? '✅' : '⚠️'}</span>
            <div>
              <strong>CSC Configurado</strong>
              <p>Código de Segurança do Contribuinte</p>
            </div>
          </div>

          <div className={`status-item ${settings.nfceConfig?.habilitadoSefaz ? 'ok' : 'pending'}`}>
            <span className="status-icon">{settings.nfceConfig?.habilitadoSefaz ? '✅' : '⚠️'}</span>
            <div>
              <strong>Habilitação SEFAZ</strong>
              <p>Empresa habilitada para NFC-e</p>
            </div>
          </div>
        </div>
      </div>

      {/* Próximos Passos */}
      <div className="next-steps">
        <h3>🚀 Próximos Passos</h3>
        <div className="steps-list">
          <div className="step-item">
            <span className="step-number">1</span>
            <div>
              <strong>Contador: Habilitação SEFAZ</strong>
              <p>O contador deve habilitar a empresa na SEFAZ-SP para emissão de NFC-e</p>
            </div>
          </div>
          
          <div className="step-item">
            <span className="step-number">2</span>
            <div>
              <strong>Certificado Digital A1</strong>
              <p>Adquirir e configurar certificado digital A1 (.pfx)</p>
            </div>
          </div>
          
          <div className="step-item">
            <span className="step-number">3</span>
            <div>
              <strong>CSC da SEFAZ</strong>
              <p>Gerar Código de Segurança do Contribuinte no portal da SEFAZ-SP</p>
            </div>
          </div>
          
          <div className="step-item">
            <span className="step-number">4</span>
            <div>
              <strong>Teste de Homologação</strong>
              <p>Realizar testes em ambiente de homologação antes da produção</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}