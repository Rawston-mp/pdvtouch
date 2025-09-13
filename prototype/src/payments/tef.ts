// src/payments/tef.ts
export type TefStart = {
  amount: number;
  mode: 'DEBITO' | 'CREDITO';
  installments?: number;
  admin?: 'A_VISTA' | 'PARC_ADMIN';
};

export type TefEvent =
  | { type: 'STATUS'; message: string }
  | { type: 'APPROVED'; nsu: string; brand: string; authCode: string }
  | { type: 'DENIED'; reason: string }
  | { type: 'ERROR'; error: string };

export function startTefPayment(params: TefStart, onEvent: (e: TefEvent) => void) {
  const ws = new WebSocket('ws://localhost:7070/tef');
  ws.onopen = () => ws.send(JSON.stringify({ action: 'START', ...params }));
  ws.onmessage = m => onEvent(JSON.parse(m.data));
  ws.onerror = () => onEvent({ type: 'ERROR', error: 'WebSocket error' });
  ws.onclose = () => {};
  return () => ws.close();
}
