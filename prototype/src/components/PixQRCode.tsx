import QRCode from 'react-qr-code'

type Props = {
  payload: string
  size?: number
  caption?: string
}

export default function PixQRCode({ payload, size = 200, caption }: Props) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
      <QRCode value={payload} size={size} />
      {caption && <small style={{ opacity: 0.8 }}>{caption}</small>}
      <button
        onClick={() => navigator.clipboard.writeText(payload)}
        style={{ padding: '8px 12px', fontSize: 14 }}
      >
        Copiar código PIX
      </button>
    </div>
  )
}
