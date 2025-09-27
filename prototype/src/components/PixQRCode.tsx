// src/components/PixQRCode.tsx
import React from 'react'

type Props = {
  value: string | number | null | undefined
  size?: number
}

export default function PixQRCode({ value, size = 256 }: Props) {
  // Garante string segura
  const safe = value == null ? '' : String(value)

  if (!safe) {
    return (
      <div
        style={{
          width: size,
          height: size,
          border: '1px dashed #ddd',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 8,
          color: '#888',
          fontSize: 12,
        }}
      >
        QR inválido (payload vazio)
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'white',
        padding: 12,
        borderRadius: 12,
        boxShadow: '0 2px 10px rgba(0,0,0,.06)',
        width: size + 24,
        display: 'grid',
        placeItems: 'center',
        fontSize: 12,
        color: '#666',
      }}
    >
      [QR CODE MOCK: {safe.substring(0, 20)}...]
    </div>
  )
}