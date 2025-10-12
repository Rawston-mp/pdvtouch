/**
 * Hook para sincronização automática de produtos entre páginas
 * Monitora alterações no banco e atualiza componentes em tempo real
 */

import { useEffect, useState, useCallback } from 'react';
import { listProducts } from '../db/products';
import type { Product } from '../db';

// Sistema de eventos customizado para notificações
class ProductEventEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Erro no listener de produtos:', error);
      }
    });
  }
}

export const productEvents = new ProductEventEmitter();

/**
 * Hook que mantém lista de produtos sincronizada
 */
export function useProducts(options?: {
  category?: Product['category'];
  activeOnly?: boolean;
  autoRefresh?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listProducts(options);
      setProducts(data || []);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [options]);

  // Carregamento inicial
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Auto-refresh quando produtos são alterados (se habilitado)
  useEffect(() => {
    if (options?.autoRefresh !== false) {
      const unsubscribe = productEvents.subscribe(() => {
        loadProducts();
      });
      return unsubscribe;
    }
  }, [loadProducts, options?.autoRefresh]);

  const refresh = useCallback(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    loading,
    error,
    refresh
  };
}

/**
 * Notifica alterações nos produtos
 */
export function notifyProductChange() {
  // Pequeno delay para garantir que o banco foi atualizado
  setTimeout(() => {
    productEvents.emit();
  }, 100);
}

/**
 * Hook para monitorar alterações em tempo real
 */
export function useProductListener(callback: () => void) {
  useEffect(() => {
    const unsubscribe = productEvents.subscribe(callback);
    return unsubscribe;
  }, [callback]);
}

/**
 * Hook simplificado para catálogo de vendas
 */
export function useProductCatalog() {
  return useProducts({ 
    activeOnly: true,
    autoRefresh: true
  });
}

/**
 * Detecta mudanças no foco da janela e recarrega produtos
 */
export function useWindowFocusRefresh(refreshFn: () => void) {
  useEffect(() => {
    const handleFocus = () => {
      // Recarrega quando a janela ganha foco
      refreshFn();
    };

    window.addEventListener('focus', handleFocus);
    
    // Também monitora visibilidade da página
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshFn();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshFn]);
}