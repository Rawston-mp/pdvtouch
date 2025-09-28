type Props = {
  value: string
  onChange: (next: string) => void
  onEnter?: () => void
  onClear?: () => void
}

const KEYS = ['7','8','9','4','5','6','1','2','3','.','0','⌫']

export default function TecladoNumerico({ value, onChange, onEnter, onClear }: Props) {
  function press(k: string) {
    if (k === '⌫') onChange(value.slice(0, -1))
    else onChange(value + k)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 80px)', gap: 8 }}>
      {KEYS.map(k => (
        <button key={k} style={{ padding: 16, fontSize: 20 }} onClick={() => press(k)}>{k}</button>
      ))}
      <button style={{ gridColumn: 'span 3', padding: 16 }} onClick={onEnter}>Confirmar</button>
      <button style={{ gridColumn: 'span 3', padding: 12 }} onClick={onClear}>Limpar</button>
    </div>
  )
}
