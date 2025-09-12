// src/fiscal/types.ts
export type NfceId = string; // chNFe

export type CustomerIdType = 'CPF' | 'CNPJ' | 'NONE';

export type NfcePayment =
  | { mode: 'CASH'; amount: number }
  | { mode: 'PIX'; amount: number; txid?: string }
  | { mode: 'TEF'; amount: number; nsu?: string; brand?: string; installments?: number };

export type NfceItem = {
  sku: string;
  name: string;
  qty: number;           // para por peso, usar qty=kg
  unit: 'UN' | 'KG';
  unitPrice: number;
  total: number;
  cfop: string;
  ncm: string;
  cst?: string;          // ou CSOSN
  csosn?: string;
  icmsOrig?: number;     // 0..8
  icmsAliq?: number;     // %
  pisCst?: string;
  cofinsCst?: string;
};

export type NfceSale = {
  idempotencyKey: string;     // p/ idempotência no Bridge
  cityCodeIbge: string;       // cMun
  uf: 'SP';                   // foco SP
  serie: number;
  numero: number;             // gerado pelo Bridge na prática
  issueDate: string;          // ISO
  customer: {
    type: CustomerIdType;
    id?: string;              // CPF/CNPJ se houver
  };
  items: NfceItem[];
  payments: NfcePayment[];
  additionalInfo?: string;
};

export type NfceAuthResponse = {
  status: 'AUTHORIZED' | 'REJECTED' | 'PENDING';
  chNFe?: string;
  prot?: string;
  qrCodeUrl?: string;
  xmlBase64?: string;
  rejectionCode?: string;
  rejectionMsg?: string;
};
