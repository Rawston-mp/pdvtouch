// src/components/ResizableCart.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface ResizableCartProps {
  children: React.ReactNode
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  defaultX?: number
  defaultY?: number
  storageKey?: string
}

export default function ResizableCart({
  children,
  defaultWidth = 320,
  defaultHeight = 500,
  minWidth = 280,
  minHeight = 300,
  maxWidth = 600,
  maxHeight = 700,
  defaultX = typeof window !== 'undefined' ? window.innerWidth - 340 : 0,
  defaultY = 60,
  storageKey,
}: ResizableCartProps) {
  // chave por rota (fallback) quando não informada via prop
  const { pathname } = useLocation()
  const slugPath = useMemo(
    () =>
      (pathname || '/')
        .replace(/[^a-z0-9]+/gi, '.')
        .replace(/^\.+|\.+$/g, '')
        .toLowerCase() || 'root',
    [pathname],
  )
  const key = useMemo(() => storageKey ?? `pdv.ui.cart.${slugPath}`, [storageKey, slugPath])

  // utils
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const loadedFromStorageRef = useRef(false)

  const [size, setSize] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as { width?: number; height?: number }
        loadedFromStorageRef.current = true
        const w = clamp(Number(parsed.width) || defaultWidth, minWidth, Math.min(maxWidth, window.innerWidth))
        const h = clamp(Number(parsed.height) || defaultHeight, minHeight, Math.min(maxHeight, window.innerHeight))
        return { width: w, height: h }
      }
    } catch {
      // ignore
    }
    return { width: defaultWidth, height: defaultHeight }
  })

  const [position, setPosition] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as { x?: number; y?: number }
        loadedFromStorageRef.current = true
        const x = clamp(Number(parsed.x) || defaultX, 0, Math.max(0, window.innerWidth - size.width))
        const y = clamp(Number(parsed.y) || defaultY, 0, Math.max(0, window.innerHeight - size.height))
        return { x, y }
      }
    } catch {
      // ignore
    }
    return {
      x: clamp(defaultX, 0, Math.max(0, window.innerWidth - size.width)),
      y: clamp(defaultY, 0, Math.max(0, window.innerHeight - size.height)),
    }
  })

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const cartRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  // arrastar para mover
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === resizeRef.current) return
    const rect = cartRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setIsDragging(true)
    }
  }

  // redimensionar
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = clamp(e.clientX - dragOffset.x, 0, Math.max(0, window.innerWidth - size.width))
        const newY = clamp(e.clientY - dragOffset.y, 0, Math.max(0, window.innerHeight - size.height))
        setPosition({ x: newX, y: newY })
      } else if (isResizing) {
        const newWidth = clamp(e.clientX - position.x, minWidth, Math.min(maxWidth, window.innerWidth - position.x))
        const newHeight = clamp(e.clientY - position.y, minHeight, Math.min(maxHeight, window.innerHeight - position.y))
        setSize({ width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = () => {
      const wasDragging = isDragging
      const wasResizing = isResizing
      setIsDragging(false)
      setIsResizing(false)
      if (wasDragging || wasResizing) {
        try {
          localStorage.setItem(
            key,
            JSON.stringify({ x: position.x, y: position.y, width: size.width, height: size.height }),
          )
        } catch {
          // ignore
        }
      }
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'auto'
    }
  }, [isDragging, isResizing, dragOffset, position, size, minWidth, minHeight, maxWidth, maxHeight, key])

  // manter dentro da viewport ao redimensionar janela
  useEffect(() => {
    const onResize = () => {
      // ajusta tamanho para caber
      setSize((sz) => {
        const maxW = Math.min(maxWidth, window.innerWidth)
        const maxH = Math.min(maxHeight, window.innerHeight)
        const newW = clamp(sz.width, minWidth, maxW)
        const newH = clamp(sz.height, minHeight, maxH)
        if (newW !== sz.width || newH !== sz.height) {
          try {
            const raw = localStorage.getItem(key)
            const prev = raw ? (JSON.parse(raw) as { x?: number; y?: number; width?: number; height?: number }) : {}
            localStorage.setItem(
              key,
              JSON.stringify({
                x: typeof prev.x === 'number' ? prev.x : position.x,
                y: typeof prev.y === 'number' ? prev.y : position.y,
                width: newW,
                height: newH,
              }),
            )
          } catch {
            // ignore
          }
        }
        return { width: newW, height: newH }
      })

      // ajusta posição se necessário
      setPosition((pos) => {
        const nx = clamp(pos.x, 0, Math.max(0, window.innerWidth - size.width))
        const ny = clamp(pos.y, 0, Math.max(0, window.innerHeight - size.height))
        if (nx !== pos.x || ny !== pos.y) {
          try {
            const raw = localStorage.getItem(key)
            const prev = raw ? (JSON.parse(raw) as { x?: number; y?: number; width?: number; height?: number }) : {}
            localStorage.setItem(
              key,
              JSON.stringify({
                x: nx,
                y: ny,
                width: typeof prev.width === 'number' ? prev.width : size.width,
                height: typeof prev.height === 'number' ? prev.height : size.height,
              }),
            )
          } catch {
            // ignore
          }
        }
        return { x: nx, y: ny }
      })
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [size.width, size.height, key, maxWidth, maxHeight, minWidth, minHeight, position.x, position.y])

  // alinhamento inicial inteligente
  useEffect(() => {
    if (loadedFromStorageRef.current) return
    try {
      const container = document.querySelector('.container') as HTMLElement | null
      const qa = document.querySelector('.quick-actions-toolbar') as HTMLElement | null
      const gap = 12
      const contRect = container?.getBoundingClientRect()
      const qaRect = qa?.getBoundingClientRect()

      const rightWithin = contRect
        ? contRect.right - size.width - gap
        : window.innerWidth - size.width - gap
      const x = clamp(rightWithin, 0, Math.max(0, window.innerWidth - size.width))
      const topBase = qaRect ? qaRect.top : contRect ? contRect.top : defaultY
      const y = clamp(Math.max(0, topBase + gap), 0, Math.max(0, window.innerHeight - size.height))

      setPosition({ x, y })
      localStorage.setItem(key, JSON.stringify({ x, y, width: size.width, height: size.height }))
      loadedFromStorageRef.current = true
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cartStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    zIndex: 1000,
    background: 'var(--surface)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'grab',
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    cursor: 'default',
  }

  const resizeHandleStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    cursor: 'nw-resize',
    background:
      'linear-gradient(-45deg, transparent 40%, var(--primary) 40%, var(--primary) 60%, transparent 60%)',
    borderRadius: '0 0 12px 0',
  }

  const sizeIndicatorStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    background: 'rgba(0,0,0,0.5)',
    padding: '2px 6px',
    borderRadius: '4px',
  }

  return (
    <div ref={cartRef} style={cartStyle} onMouseDown={handleMouseDown}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '16px' }}>🛒</span>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Carrinho</span>
        </div>
        <div style={sizeIndicatorStyle}>{size.width} × {size.height}</div>
      </div>

      <div style={contentStyle} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>

      <div
        ref={resizeRef}
        style={resizeHandleStyle}
        onMouseDown={handleResizeMouseDown}
        title="Arrastar para redimensionar"
      />
    </div>
  )
}