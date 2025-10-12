/**
 * Componente de teste para demonstrar a sincronização automática de produtos
 */

import React from 'react';

export function ProductSyncTestButton() {
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  const testSync = () => {
    // Simula uma alteração no produto para testar a sincronização
    const event = new CustomEvent('productChanged', { 
      detail: { timestamp: new Date() } 
    });
    window.dispatchEvent(event);
    setLastSync(new Date());
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      zIndex: 1000,
      background: '#2196f3',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer'
    }} onClick={testSync}>
      🔄 Teste Sync
      {lastSync && (
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          {lastSync.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}