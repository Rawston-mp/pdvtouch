/**
 * Tipos e interfaces para NFC-e (Nota Fiscal de Consumidor Eletrônica)
 * Modelo 65 - Layout 4.00
 * SEFAZ-SP - São Paulo
 */

export interface NFCeIdentificacao {
  cUF: '35'; // São Paulo
  cNF: string; // Código numérico (8 dígitos)
  natOp: string; // Natureza da operação
  mod: '65'; // Modelo NFC-e
  serie: string; // Série da NFC-e
  nNF: number; // Número da NFC-e
  dhEmi: string; // Data/hora emissão
  tpNF: '1'; // Tipo: 1=Saída
  idDest: '1'; // Destinatário: 1=Operação interna
  cMunFG: string; // Código município do fato gerador
  tpImp: '4'; // Tipo impressão: 4=DANFE NFC-e
  tpEmis: '1' | '9'; // Tipo emissão: 1=Normal, 9=Contingência
  cDV: string; // Dígito verificador da chave
  tpAmb: '1' | '2'; // Ambiente: 1=Produção, 2=Homologação
  finNFe: '1'; // Finalidade: 1=Normal
  indFinal: '1'; // Consumidor final: 1=Sim
  indPres: '1'; // Presença: 1=Operação presencial
  procEmi: '0'; // Processo emissão: 0=App contribuinte
  verProc: string; // Versão do processo
}

export interface NFCeEmitente {
  CNPJ: string;
  xNome: string;
  xFant?: string;
  enderEmit: {
    xLgr: string;
    nro: string;
    xBairro: string;
    cMun: string;
    xMun: string;
    UF: 'SP';
    CEP: string;
    fone?: string;
  };
  IE: string;
  CRT: '1' | '2' | '3'; // Regime tributário
}

export interface NFCeDestinatario {
  CPF?: string;
  CNPJ?: string;
  xNome?: string;
}

export interface NFCeItem {
  nItem: number;
  prod: {
    cProd: string;
    cEAN: string;
    xProd: string;
    NCM: string;
    CFOP: string;
    uCom: string;
    qCom: number;
    vUnCom: number;
    vProd: number;
    cEANTrib: string;
    uTrib: string;
    qTrib: number;
    vUnTrib: number;
    indTot: '1'; // Compõe valor total
  };
  imposto: {
    vTotTrib?: number;
    ICMS: {
      ICMS00?: {
        orig: string;
        CST: '00';
        modBC: '3';
        vBC: number;
        pICMS: number;
        vICMS: number;
      };
      ICMS40?: {
        orig: string;
        CST: '40' | '41' | '60';
      };
      ICMSSN102?: {
        orig: string;
        CSOSN: '102' | '300' | '500';
      };
      ICMSSN900?: {
        orig: string;
        CSOSN: '900';
        modBC: '3';
        vBC: number;
        pRedBC?: number;
        pICMS: number;
        vICMS: number;
        modBCST?: string;
        pMVAST?: number;
        pRedBCST?: number;
        vBCST?: number;
        pICMSST?: number;
        vICMSST?: number;
      };
    };
    PIS: {
      PISAliq?: {
        CST: '01' | '02';
        vBC: number;
        pPIS: number;
        vPIS: number;
      };
      PISNT?: {
        CST: '04' | '05' | '06' | '07' | '08' | '09';
      };
    };
    COFINS: {
      COFINSAliq?: {
        CST: '01' | '02';
        vBC: number;
        pCOFINS: number;
        vCOFINS: number;
      };
      COFINSNT?: {
        CST: '04' | '05' | '06' | '07' | '08' | '09';
      };
    };
  };
}

export interface NFCeTotal {
  ICMSTot: {
    vBC: number;
    vICMS: number;
    vICMSDeson: number;
    vFCP: number;
    vBCST: number;
    vST: number;
    vFCPST: number;
    vFCPSTRet: number;
    vProd: number;
    vFrete: number;
    vSeg: number;
    vDesc: number;
    vII: number;
    vIPI: number;
    vIPIDevol: number;
    vPIS: number;
    vCOFINS: number;
    vOutro: number;
    vNF: number;
    vTotTrib?: number;
  };
}

export interface NFCePagamento {
  detPag: {
    indPag?: '0' | '1'; // 0=À vista, 1=À prazo
    tPag: '01' | '02' | '03' | '04' | '05' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '90' | '99';
    vPag: number;
    card?: {
      tpIntegra: '1' | '2'; // 1=TEF, 2=POS
      CNPJ?: string;
      tBand?: '01' | '02' | '03' | '04' | '99';
      cAut?: string;
    };
  }[];
  vTroco?: number;
}

export interface NFCeInfAdic {
  infCpl?: string;
  obsCont?: {
    xTexto: string;
  }[];
}

export interface NFCe {
  infNFe: {
    Id: string; // Chave de acesso com "NFe" na frente
    versao: '4.00';
    ide: NFCeIdentificacao;
    emit: NFCeEmitente;
    dest?: NFCeDestinatario;
    det: NFCeItem[];
    total: NFCeTotal;
    transp?: {
      modFrete: '9'; // Sem frete
    };
    pag: NFCePagamento;
    infAdic?: NFCeInfAdic;
    infRespTec?: {
      CNPJ: string;
      xContato: string;
      email: string;
      fone: string;
    };
  };
}

export interface NFCeProcessada {
  NFe: NFCe;
  protNFe?: {
    infProt: {
      tpAmb: '1' | '2';
      verAplic: string;
      chNFe: string;
      dhRecbto: string;
      nProt: string;
      digVal: string;
      cStat: string;
      xMotivo: string;
    };
  };
}

export interface ChaveNFCe {
  cUF: string;
  aamm: string;
  cnpj: string;
  mod: string;
  serie: string;
  nNF: string;
  tpEmis: string;
  cNF: string;
  dv: string;
}

export interface ParametrosFiscais {
  cfop: string;
  csosn: string;
  cstPIS: string;
  cstCOFINS: string;
  aliqICMS: number;
  aliqPIS: number;
  aliqCOFINS: number;
  origem: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
}

export interface ConfigNFCe {
  certificado: {
    arquivo: ArrayBuffer;
    senha: string;
  };
  empresa: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    inscricaoEstadual: string;
    crt: '1' | '2' | '3';
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      codigoMunicipio: string;
      municipio: string;
      uf: 'SP';
      cep: string;
      telefone?: string;
    };
  };
  serie: string;
  proximoNumero: number;
  csc: {
    id: string;
    codigo: string;
  };
  ambiente: 'homologacao' | 'producao';
  contingencia: boolean;
}

export type TipoEvento = 'CANCELAMENTO' | 'INUTILIZACAO';

export interface EventoNFCe {
  tipo: TipoEvento;
  chaveNFe: string;
  nSeqEvento: number;
  dhEvento: string;
  nProt?: string; // Para cancelamento
  xJust: string;
  faixaInutilizada?: {
    nNFIni: number;
    nNFFin: number;
  };
}