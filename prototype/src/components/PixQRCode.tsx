// src/components/PixQRCode.tsx
import React from 'react'
import QRCode from 'react-qr-code'

type Props = {
  value: string | number | null | undefined
  size?: number
}

export default function PixQRCode({ value, size = 256 }: Props) {
  // Garante string segura (o lib espera string/number válido)
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
      }}
    >
      <QRCode value={safe} size={size} />
    </div>
  )
}
