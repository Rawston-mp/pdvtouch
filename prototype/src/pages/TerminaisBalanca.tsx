import { BalancaTerminal } from '../components/BalancaTerminal'

export default function TerminaisBalança() {
  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
      <BalancaTerminal nome="Balança A" porta="BALANCA_2222" />
      <BalancaTerminal nome="Balança B" porta="BALANCA_3333" />
    </div>
  )
}
