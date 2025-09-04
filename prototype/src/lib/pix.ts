export function makePixEmvMock(amount: number) {
  // payload EMV simulado (apenas para protótipo)
  const cents = Math.round(amount * 100)
  const txid = crypto.randomUUID().slice(0, 8).toUpperCase()
  const base = `00020126490014BR.GOV.BCB.PIX0136chave-pix-simulada@pdvtouch.com520400005303986540${String(
    cents
  ).padStart(10, '0')}5802BR5914Restaurante PDV6009SAO PAULO62100506${txid}6304ABCD`
  return { emv: base, txid }
}
