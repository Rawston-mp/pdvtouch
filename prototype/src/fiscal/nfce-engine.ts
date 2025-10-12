/**
 * Engine NFC-e - Geração de XML Nota Fiscal de Consumidor Eletrônica
 * Modelo 65 - Layout 4.00 - SEFAZ-SP
 */

import { 
  NFCe, 
  NFCeItem, 
  ConfigNFCe, 
  ChaveNFCe, 
  ParametrosFiscais
} from './nfce-types';

// Interface temporária para CartItem até integração
interface CartItem {
  id?: number;
  produto: {
    id: number;
    nome: string;
    preco: number;
    ncm?: string;
    unidade?: string;
  };
  quantidade: number;
  preco?: number;
}

export class NFCeEngine {
  private config: ConfigNFCe;

  constructor(config: ConfigNFCe) {
    this.config = config;
  }

  /**
   * Gera chave de acesso da NFC-e
   */
  private gerarChaveAcesso(numeroNFe: number, dataEmissao: Date): ChaveNFCe {
    const cUF = '35'; // São Paulo
    const aamm = dataEmissao.getFullYear().toString().substr(2) + 
                 (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
    const cnpj = this.config.empresa.cnpj.replace(/\D/g, '');
    const mod = '65';
    const serie = this.config.serie.padStart(3, '0');
    const nNF = numeroNFe.toString().padStart(9, '0');
    const tpEmis = this.config.contingencia ? '9' : '1';
    
    // Código numérico aleatório de 8 dígitos
    const cNF = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
    
    // Calcular dígito verificador
    const chaveNumeros = cUF + aamm + cnpj + mod + serie + nNF + tpEmis + cNF;
    const dv = this.calcularDV(chaveNumeros);

    return {
      cUF,
      aamm,
      cnpj,
      mod,
      serie,
      nNF,
      tpEmis,
      cNF,
      dv
    };
  }

  /**
   * Calcula dígito verificador da chave de acesso
   */
  private calcularDV(chave: string): string {
    const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
    let soma = 0;
    let peso = 0;

    for (let i = chave.length - 1; i >= 0; i--) {
      soma += parseInt(chave[i]) * pesos[peso % 8];
      peso++;
    }

    const resto = soma % 11;
    return resto < 2 ? '0' : (11 - resto).toString();
  }

  /**
   * Obter chave de acesso completa
   */
  private obterChaveCompleta(chave: ChaveNFCe): string {
    return chave.cUF + chave.aamm + chave.cnpj + chave.mod + 
           chave.serie + chave.nNF + chave.tpEmis + chave.cNF + chave.dv;
  }

  /**
   * Calcular parâmetros fiscais do produto
   */
  private calcularParametrosFiscais(_item: CartItem): ParametrosFiscais {
    // Valores padrão para restaurante (Simples Nacional)
    const parametros: ParametrosFiscais = {
      cfop: '5102', // Venda de mercadoria adquirida/recebida de terceiros
      csosn: '102', // Tributada pelo Simples Nacional sem permissão de crédito
      cstPIS: '07', // Operação isenta da contribuição
      cstCOFINS: '07', // Operação isenta da contribuição
      aliqICMS: 0,
      aliqPIS: 0,
      aliqCOFINS: 0,
      origem: '0' // Nacional
    };

    // TODO: Implementar lógica específica baseada no produto
    // Por enquanto usa valores padrão seguros para restaurante

    return parametros;
  }

  /**
   * Converter item do carrinho para item NFC-e
   */
  private converterItem(cartItem: CartItem, index: number): NFCeItem {
    const parametros = this.calcularParametrosFiscais(cartItem);
    const produto = cartItem.produto;
    
    const vUnCom = produto.preco;
    const qCom = cartItem.quantidade;
    const vProd = vUnCom * qCom;

    const item: NFCeItem = {
      nItem: index + 1,
      prod: {
        cProd: produto.id.toString(),
        cEAN: 'SEM GTIN',
        xProd: produto.nome,
        NCM: produto.ncm || '00000000',
        CFOP: parametros.cfop,
        uCom: produto.unidade || 'UN',
        qCom: qCom,
        vUnCom: vUnCom,
        vProd: vProd,
        cEANTrib: 'SEM GTIN',
        uTrib: produto.unidade || 'UN',
        qTrib: qCom,
        vUnTrib: vUnCom,
        indTot: '1'
      },
      imposto: {
        ICMS: {
          ICMSSN102: {
            orig: parametros.origem,
            CSOSN: parametros.csosn as '102'
          }
        },
        PIS: {
          PISNT: {
            CST: parametros.cstPIS as '07'
          }
        },
        COFINS: {
          COFINSNT: {
            CST: parametros.cstCOFINS as '07'
          }
        }
      }
    };

    return item;
  }

  /**
   * Calcular totais da NFC-e
   */
  private calcularTotais(itens: NFCeItem[]) {
    let vProd = 0;
    let vBC = 0;
    let vICMS = 0;
    let vPIS = 0;
    let vCOFINS = 0;

    for (const item of itens) {
      vProd += item.prod.vProd;
      
      // ICMS
      if (item.imposto.ICMS.ICMS00) {
        vBC += item.imposto.ICMS.ICMS00.vBC;
        vICMS += item.imposto.ICMS.ICMS00.vICMS;
      }

      // PIS
      if (item.imposto.PIS.PISAliq) {
        vPIS += item.imposto.PIS.PISAliq.vPIS;
      }

      // COFINS
      if (item.imposto.COFINS.COFINSAliq) {
        vCOFINS += item.imposto.COFINS.COFINSAliq.vCOFINS;
      }
    }

    return {
      ICMSTot: {
        vBC: Number(vBC.toFixed(2)),
        vICMS: Number(vICMS.toFixed(2)),
        vICMSDeson: 0,
        vFCP: 0,
        vBCST: 0,
        vST: 0,
        vFCPST: 0,
        vFCPSTRet: 0,
        vProd: Number(vProd.toFixed(2)),
        vFrete: 0,
        vSeg: 0,
        vDesc: 0,
        vII: 0,
        vIPI: 0,
        vIPIDevol: 0,
        vPIS: Number(vPIS.toFixed(2)),
        vCOFINS: Number(vCOFINS.toFixed(2)),
        vOutro: 0,
        vNF: Number(vProd.toFixed(2))
      }
    };
  }

  /**
   * Gerar XML da NFC-e
   */
  public async gerarXML(
    itens: CartItem[], 
    formaPagamento: string, 
    valorPago: number,
    valorTroco?: number,
    cpfConsumidor?: string
  ): Promise<{ xml: string; chave: string; nfce: NFCe }> {
    const dataEmissao = new Date();
    const numeroNFe = this.config.proximoNumero;
    
    // Gerar chave de acesso
    const chave = this.gerarChaveAcesso(numeroNFe, dataEmissao);
    const chaveCompleta = this.obterChaveCompleta(chave);

    // Converter itens
    const detItens = itens.map((item, index) => this.converterItem(item, index));
    
    // Calcular totais
    const totais = this.calcularTotais(detItens);

    // Mapear forma de pagamento
    const tPagMap: Record<string, '01' | '02' | '03' | '04' | '05' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '90' | '99'> = {
      'dinheiro': '01',
      'cartao_credito': '03',
      'cartao_debito': '04',
      'pix': '17',
      'vale_alimentacao': '10',
      'vale_refeicao': '11'
    };

    const nfce: NFCe = {
      infNFe: {
        Id: `NFe${chaveCompleta}`,
        versao: '4.00',
        ide: {
          cUF: '35',
          cNF: chave.cNF,
          natOp: 'Venda',
          mod: '65',
          serie: chave.serie,
          nNF: numeroNFe,
          dhEmi: dataEmissao.toISOString(),
          tpNF: '1',
          idDest: '1',
          cMunFG: this.config.empresa.endereco.codigoMunicipio,
          tpImp: '4',
          tpEmis: this.config.contingencia ? '9' : '1',
          cDV: chave.dv,
          tpAmb: this.config.ambiente === 'producao' ? '1' : '2',
          finNFe: '1',
          indFinal: '1',
          indPres: '1',
          procEmi: '0',
          verProc: 'PDVTouch 1.0'
        },
        emit: {
          CNPJ: this.config.empresa.cnpj.replace(/\D/g, ''),
          xNome: this.config.empresa.razaoSocial,
          xFant: this.config.empresa.nomeFantasia,
          enderEmit: {
            xLgr: this.config.empresa.endereco.logradouro,
            nro: this.config.empresa.endereco.numero,
            xBairro: this.config.empresa.endereco.bairro,
            cMun: this.config.empresa.endereco.codigoMunicipio,
            xMun: this.config.empresa.endereco.municipio,
            UF: 'SP',
            CEP: this.config.empresa.endereco.cep.replace(/\D/g, ''),
            fone: this.config.empresa.endereco.telefone?.replace(/\D/g, '')
          },
          IE: this.config.empresa.inscricaoEstadual.replace(/\D/g, ''),
          CRT: this.config.empresa.crt
        },
        det: detItens,
        total: totais,
        transp: {
          modFrete: '9'
        },
        pag: {
          detPag: [{
            indPag: '0',
            tPag: tPagMap[formaPagamento] || '99',
            vPag: valorPago
          }],
          vTroco: valorTroco || 0
        }
      }
    };

    // Adicionar destinatário se CPF informado
    if (cpfConsumidor) {
      nfce.infNFe.dest = {
        CPF: cpfConsumidor.replace(/\D/g, '')
      };
    }

    // Gerar XML
    const xml = this.gerarXMLString(nfce);

    return {
      xml,
      chave: chaveCompleta,
      nfce
    };
  }

  /**
   * Converter objeto NFC-e para string XML
   */
  private gerarXMLString(nfce: NFCe): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">\n';
    xml += `  <infNFe Id="${nfce.infNFe.Id}" versao="${nfce.infNFe.versao}">\n`;
    
    // IDE
    xml += '    <ide>\n';
    xml += `      <cUF>${nfce.infNFe.ide.cUF}</cUF>\n`;
    xml += `      <cNF>${nfce.infNFe.ide.cNF}</cNF>\n`;
    xml += `      <natOp>${nfce.infNFe.ide.natOp}</natOp>\n`;
    xml += `      <mod>${nfce.infNFe.ide.mod}</mod>\n`;
    xml += `      <serie>${nfce.infNFe.ide.serie}</serie>\n`;
    xml += `      <nNF>${nfce.infNFe.ide.nNF}</nNF>\n`;
    xml += `      <dhEmi>${nfce.infNFe.ide.dhEmi}</dhEmi>\n`;
    xml += `      <tpNF>${nfce.infNFe.ide.tpNF}</tpNF>\n`;
    xml += `      <idDest>${nfce.infNFe.ide.idDest}</idDest>\n`;
    xml += `      <cMunFG>${nfce.infNFe.ide.cMunFG}</cMunFG>\n`;
    xml += `      <tpImp>${nfce.infNFe.ide.tpImp}</tpImp>\n`;
    xml += `      <tpEmis>${nfce.infNFe.ide.tpEmis}</tpEmis>\n`;
    xml += `      <cDV>${nfce.infNFe.ide.cDV}</cDV>\n`;
    xml += `      <tpAmb>${nfce.infNFe.ide.tpAmb}</tpAmb>\n`;
    xml += `      <finNFe>${nfce.infNFe.ide.finNFe}</finNFe>\n`;
    xml += `      <indFinal>${nfce.infNFe.ide.indFinal}</indFinal>\n`;
    xml += `      <indPres>${nfce.infNFe.ide.indPres}</indPres>\n`;
    xml += `      <procEmi>${nfce.infNFe.ide.procEmi}</procEmi>\n`;
    xml += `      <verProc>${nfce.infNFe.ide.verProc}</verProc>\n`;
    xml += '    </ide>\n';

    // EMIT
    xml += '    <emit>\n';
    xml += `      <CNPJ>${nfce.infNFe.emit.CNPJ}</CNPJ>\n`;
    xml += `      <xNome>${this.escapeXML(nfce.infNFe.emit.xNome)}</xNome>\n`;
    if (nfce.infNFe.emit.xFant) {
      xml += `      <xFant>${this.escapeXML(nfce.infNFe.emit.xFant)}</xFant>\n`;
    }
    xml += '      <enderEmit>\n';
    xml += `        <xLgr>${this.escapeXML(nfce.infNFe.emit.enderEmit.xLgr)}</xLgr>\n`;
    xml += `        <nro>${nfce.infNFe.emit.enderEmit.nro}</nro>\n`;
    xml += `        <xBairro>${this.escapeXML(nfce.infNFe.emit.enderEmit.xBairro)}</xBairro>\n`;
    xml += `        <cMun>${nfce.infNFe.emit.enderEmit.cMun}</cMun>\n`;
    xml += `        <xMun>${this.escapeXML(nfce.infNFe.emit.enderEmit.xMun)}</xMun>\n`;
    xml += `        <UF>${nfce.infNFe.emit.enderEmit.UF}</UF>\n`;
    xml += `        <CEP>${nfce.infNFe.emit.enderEmit.CEP}</CEP>\n`;
    if (nfce.infNFe.emit.enderEmit.fone) {
      xml += `        <fone>${nfce.infNFe.emit.enderEmit.fone}</fone>\n`;
    }
    xml += '      </enderEmit>\n';
    xml += `      <IE>${nfce.infNFe.emit.IE}</IE>\n`;
    xml += `      <CRT>${nfce.infNFe.emit.CRT}</CRT>\n`;
    xml += '    </emit>\n';

    // DEST (se houver)
    if (nfce.infNFe.dest) {
      xml += '    <dest>\n';
      if (nfce.infNFe.dest.CPF) {
        xml += `      <CPF>${nfce.infNFe.dest.CPF}</CPF>\n`;
      }
      if (nfce.infNFe.dest.CNPJ) {
        xml += `      <CNPJ>${nfce.infNFe.dest.CNPJ}</CNPJ>\n`;
      }
      if (nfce.infNFe.dest.xNome) {
        xml += `      <xNome>${this.escapeXML(nfce.infNFe.dest.xNome)}</xNome>\n`;
      }
      xml += '    </dest>\n';
    }

    // DET (Itens)
    for (const item of nfce.infNFe.det) {
      xml += `    <det nItem="${item.nItem}">\n`;
      xml += '      <prod>\n';
      xml += `        <cProd>${item.prod.cProd}</cProd>\n`;
      xml += `        <cEAN>${item.prod.cEAN}</cEAN>\n`;
      xml += `        <xProd>${this.escapeXML(item.prod.xProd)}</xProd>\n`;
      xml += `        <NCM>${item.prod.NCM}</NCM>\n`;
      xml += `        <CFOP>${item.prod.CFOP}</CFOP>\n`;
      xml += `        <uCom>${item.prod.uCom}</uCom>\n`;
      xml += `        <qCom>${item.prod.qCom.toFixed(4)}</qCom>\n`;
      xml += `        <vUnCom>${item.prod.vUnCom.toFixed(4)}</vUnCom>\n`;
      xml += `        <vProd>${item.prod.vProd.toFixed(2)}</vProd>\n`;
      xml += `        <cEANTrib>${item.prod.cEANTrib}</cEANTrib>\n`;
      xml += `        <uTrib>${item.prod.uTrib}</uTrib>\n`;
      xml += `        <qTrib>${item.prod.qTrib.toFixed(4)}</qTrib>\n`;
      xml += `        <vUnTrib>${item.prod.vUnTrib.toFixed(4)}</vUnTrib>\n`;
      xml += `        <indTot>${item.prod.indTot}</indTot>\n`;
      xml += '      </prod>\n';
      
      // Impostos
      xml += '      <imposto>\n';
      
      // ICMS
      xml += '        <ICMS>\n';
      if (item.imposto.ICMS.ICMS00) {
        xml += '          <ICMS00>\n';
        xml += `            <orig>${item.imposto.ICMS.ICMS00.orig}</orig>\n`;
        xml += `            <CST>${item.imposto.ICMS.ICMS00.CST}</CST>\n`;
        xml += `            <modBC>${item.imposto.ICMS.ICMS00.modBC}</modBC>\n`;
        xml += `            <vBC>${item.imposto.ICMS.ICMS00.vBC.toFixed(2)}</vBC>\n`;
        xml += `            <pICMS>${item.imposto.ICMS.ICMS00.pICMS.toFixed(4)}</pICMS>\n`;
        xml += `            <vICMS>${item.imposto.ICMS.ICMS00.vICMS.toFixed(2)}</vICMS>\n`;
        xml += '          </ICMS00>\n';
      } else if (item.imposto.ICMS.ICMSSN102) {
        xml += '          <ICMSSN102>\n';
        xml += `            <orig>${item.imposto.ICMS.ICMSSN102.orig}</orig>\n`;
        xml += `            <CSOSN>${item.imposto.ICMS.ICMSSN102.CSOSN}</CSOSN>\n`;
        xml += '          </ICMSSN102>\n';
      }
      xml += '        </ICMS>\n';

      // PIS
      xml += '        <PIS>\n';
      if (item.imposto.PIS.PISAliq) {
        xml += '          <PISAliq>\n';
        xml += `            <CST>${item.imposto.PIS.PISAliq.CST}</CST>\n`;
        xml += `            <vBC>${item.imposto.PIS.PISAliq.vBC.toFixed(2)}</vBC>\n`;
        xml += `            <pPIS>${item.imposto.PIS.PISAliq.pPIS.toFixed(4)}</pPIS>\n`;
        xml += `            <vPIS>${item.imposto.PIS.PISAliq.vPIS.toFixed(2)}</vPIS>\n`;
        xml += '          </PISAliq>\n';
      } else if (item.imposto.PIS.PISNT) {
        xml += '          <PISNT>\n';
        xml += `            <CST>${item.imposto.PIS.PISNT.CST}</CST>\n`;
        xml += '          </PISNT>\n';
      }
      xml += '        </PIS>\n';

      // COFINS
      xml += '        <COFINS>\n';
      if (item.imposto.COFINS.COFINSAliq) {
        xml += '          <COFINSAliq>\n';
        xml += `            <CST>${item.imposto.COFINS.COFINSAliq.CST}</CST>\n`;
        xml += `            <vBC>${item.imposto.COFINS.COFINSAliq.vBC.toFixed(2)}</vBC>\n`;
        xml += `            <pCOFINS>${item.imposto.COFINS.COFINSAliq.pCOFINS.toFixed(4)}</pCOFINS>\n`;
        xml += `            <vCOFINS>${item.imposto.COFINS.COFINSAliq.vCOFINS.toFixed(2)}</vCOFINS>\n`;
        xml += '          </COFINSAliq>\n';
      } else if (item.imposto.COFINS.COFINSNT) {
        xml += '          <COFINSNT>\n';
        xml += `            <CST>${item.imposto.COFINS.COFINSNT.CST}</CST>\n`;
        xml += '          </COFINSNT>\n';
      }
      xml += '        </COFINS>\n';
      
      xml += '      </imposto>\n';
      xml += '    </det>\n';
    }

    // TOTAL
    xml += '    <total>\n';
    xml += '      <ICMSTot>\n';
    const total = nfce.infNFe.total.ICMSTot;
    xml += `        <vBC>${total.vBC.toFixed(2)}</vBC>\n`;
    xml += `        <vICMS>${total.vICMS.toFixed(2)}</vICMS>\n`;
    xml += `        <vICMSDeson>${total.vICMSDeson.toFixed(2)}</vICMSDeson>\n`;
    xml += `        <vFCP>${total.vFCP.toFixed(2)}</vFCP>\n`;
    xml += `        <vBCST>${total.vBCST.toFixed(2)}</vBCST>\n`;
    xml += `        <vST>${total.vST.toFixed(2)}</vST>\n`;
    xml += `        <vFCPST>${total.vFCPST.toFixed(2)}</vFCPST>\n`;
    xml += `        <vFCPSTRet>${total.vFCPSTRet.toFixed(2)}</vFCPSTRet>\n`;
    xml += `        <vProd>${total.vProd.toFixed(2)}</vProd>\n`;
    xml += `        <vFrete>${total.vFrete.toFixed(2)}</vFrete>\n`;
    xml += `        <vSeg>${total.vSeg.toFixed(2)}</vSeg>\n`;
    xml += `        <vDesc>${total.vDesc.toFixed(2)}</vDesc>\n`;
    xml += `        <vII>${total.vII.toFixed(2)}</vII>\n`;
    xml += `        <vIPI>${total.vIPI.toFixed(2)}</vIPI>\n`;
    xml += `        <vIPIDevol>${total.vIPIDevol.toFixed(2)}</vIPIDevol>\n`;
    xml += `        <vPIS>${total.vPIS.toFixed(2)}</vPIS>\n`;
    xml += `        <vCOFINS>${total.vCOFINS.toFixed(2)}</vCOFINS>\n`;
    xml += `        <vOutro>${total.vOutro.toFixed(2)}</vOutro>\n`;
    xml += `        <vNF>${total.vNF.toFixed(2)}</vNF>\n`;
    if (total.vTotTrib) {
      xml += `        <vTotTrib>${total.vTotTrib.toFixed(2)}</vTotTrib>\n`;
    }
    xml += '      </ICMSTot>\n';
    xml += '    </total>\n';

    // TRANSP
    if (nfce.infNFe.transp) {
      xml += '    <transp>\n';
      xml += `      <modFrete>${nfce.infNFe.transp.modFrete}</modFrete>\n`;
      xml += '    </transp>\n';
    }

    // PAG
    xml += '    <pag>\n';
    for (const detPag of nfce.infNFe.pag.detPag) {
      xml += '      <detPag>\n';
      if (detPag.indPag) {
        xml += `        <indPag>${detPag.indPag}</indPag>\n`;
      }
      xml += `        <tPag>${detPag.tPag}</tPag>\n`;
      xml += `        <vPag>${detPag.vPag.toFixed(2)}</vPag>\n`;
      xml += '      </detPag>\n';
    }
    if (nfce.infNFe.pag.vTroco && nfce.infNFe.pag.vTroco > 0) {
      xml += `      <vTroco>${nfce.infNFe.pag.vTroco.toFixed(2)}</vTroco>\n`;
    }
    xml += '    </pag>\n';

    xml += '  </infNFe>\n';
    xml += '</NFe>';

    return xml;
  }

  /**
   * Escape de caracteres especiais para XML
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Incrementar próximo número da NFC-e
   */
  public incrementarNumero(): void {
    this.config.proximoNumero++;
  }

  /**
   * Obter configuração atual
   */
  public getConfig(): ConfigNFCe {
    return this.config;
  }

  /**
   * Atualizar configuração
   */
  public updateConfig(novaConfig: Partial<ConfigNFCe>): void {
    this.config = { ...this.config, ...novaConfig };
  }
}