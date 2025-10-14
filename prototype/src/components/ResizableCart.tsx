// src/components/ResizableCart.tsx
import React, { useState, useRef, useEffect } from 'react'

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
}

export default function ResizableCart({
  children,
  defaultWidth = 320,
  defaultHeight = 500,
  minWidth = 280,
  minHeight = 300,
  maxWidth = 600,
  maxHeight = 700,
  defaultX = window.innerWidth - 340,
  defaultY = 60
}: ResizableCartProps) {
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight })
  const [position, setPosition] = useState({ x: defaultX, y: defaultY })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  const cartRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Arrastar para mover
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === resizeRef.current) return // Não arrastar quando redimensionando
    
    const rect = cartRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  // Redimensionar
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x))
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y))
        setPosition({ x: newX, y: newY })
      } else if (isResizing) {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX - position.x))
        const newHeight = Math.max(minHeight, Math.min(maxHeight, e.clientY - position.y))
        setSize({ width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
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
  }, [isDragging, isResizing, dragOffset, position, size, minWidth, minHeight, maxWidth, maxHeight])

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
    overflow: 'hidden'
  }

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'grab'
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    cursor: 'default'
  }

  const resizeHandleStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    cursor: 'nw-resize',
    background: 'linear-gradient(-45deg, transparent 40%, var(--primary) 40%, var(--primary) 60%, transparent 60%)',
    borderRadius: '0 0 12px 0'
  }

  const sizeIndicatorStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    background: 'rgba(0,0,0,0.5)',
    padding: '2px 6px',
    borderRadius: '4px'
  }

  return (
    <div 
      ref={cartRef}
      style={cartStyle}
      onMouseDown={handleMouseDown}
    >
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '16px' }}>🛒</span>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Carrinho</span>
        </div>
        <div style={sizeIndicatorStyle}>
          {size.width} × {size.height}
        </div>
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