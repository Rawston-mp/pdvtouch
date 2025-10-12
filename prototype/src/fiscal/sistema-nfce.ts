/**
 * Sistema Completo de NFC-e para PDVTouch
 * Integra todos os módulos: Engine, Assinatura, SEFAZ, Contingência
 */

import { NFCeEngine } from './nfce-engine';
import { AssinaturaDigital, CertificadoDigital } from './assinatura-digital';
import { SEFAZClient, RetornoSEFAZ } from './sefaz-client';
import { ContingenciaNFCe, StatusContingencia } from './contingencia-nfce';
import { ConfigNFCe } from './nfce-types';

export interface ResultadoEmissao {
  success: boolean;
  chave?: string;
  numeroNFe?: number;
  protocolo?: string;
  dataAutorizacao?: Date;
  xmlNFe?: string;
  xmlAssinado?: string;
  qrCode?: string;
  contingencia?: boolean;
  erro?: string;
  motivoRejeicao?: string;
}

export interface ConfiguracaoSistema {
  certificado: CertificadoDigital;
  configuracaoNFCe: ConfigNFCe;
}

export interface StatusSistema {
  sefazOnline: boolean;
  certificadoValido: boolean;
  contingenciaAtiva: boolean;
  operacoesPendentes: number;
  ultimaVerificacao?: Date;
  proximaVerificacao?: Date;
}

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

export class SistemaNFCe {
  private engine: NFCeEngine;
  private assinatura: AssinaturaDigital;
  private sefazClient: SEFAZClient;
  private contingencia: ContingenciaNFCe;
  private configuracao: ConfigNFCe;

  constructor(configuracao: ConfiguracaoSistema) {
    this.configuracao = configuracao.configuracaoNFCe;
    
    // Inicializar componentes
    this.engine = new NFCeEngine(this.configuracao);
    this.assinatura = new AssinaturaDigital(configuracao.certificado);
    this.sefazClient = new SEFAZClient(this.configuracao.ambiente);
    this.contingencia = new ContingenciaNFCe(this.sefazClient, this.configuracao);

    console.log('🚀 Sistema NFC-e inicializado');
    this.verificarStatusInicial();
  }

  /**
   * Emitir NFC-e completa
   */
  public async emitirNFCe(
    itens: CartItem[],
    formaPagamento: string,
    valorPago: number,
    valorTroco?: number,
    cpfConsumidor?: string
  ): Promise<ResultadoEmissao> {
    try {
      console.log('📝 Iniciando emissão de NFC-e...');

      // 1. Gerar XML
      const { xml, chave, nfce } = await this.engine.gerarXML(
        itens,
        formaPagamento,
        valorPago,
        valorTroco,
        cpfConsumidor
      );

      console.log(`🔑 Chave gerada: ${chave}`);

      // 2. Assinar XML
      const resultadoAssinatura = await this.assinatura.assinarXML(xml, chave);
      
      if (!resultadoAssinatura.success || !resultadoAssinatura.xmlAssinado) {
        return {
          success: false,
          erro: `Erro na assinatura: ${resultadoAssinatura.erro}`
        };
      }

      console.log('✅ XML assinado com sucesso');

      // 3. Gerar QR Code
      const qrCode = this.gerarQRCode(chave, nfce.infNFe.total.ICMSTot.vNF);

      // 4. Tentar transmitir para SEFAZ (se não estiver em contingência forçada)
      let resultadoTransmissao: RetornoSEFAZ | null = null;
      let contingencia = false;

      if (!this.configuracao.contingencia) {
        try {
          resultadoTransmissao = await this.sefazClient.autorizarNFCe(
            resultadoAssinatura.xmlAssinado,
            chave
          );

          if (!resultadoTransmissao.success) {
            console.warn('⚠️ Falha na transmissão, ativando contingência:', resultadoTransmissao.motivoStatus);
            
            // Ativar contingência e adicionar à fila
            this.contingencia.ativarContingencia(resultadoTransmissao.motivoStatus);
            this.contingencia.adicionarOperacao(chave, xml, resultadoAssinatura.xmlAssinado);
            contingencia = true;
          }
        } catch (error) {
          console.warn('⚠️ Erro de comunicação, ativando contingência:', error);
          
          this.contingencia.ativarContingencia('Erro de comunicação com SEFAZ');
          this.contingencia.adicionarOperacao(chave, xml, resultadoAssinatura.xmlAssinado);
          contingencia = true;
        }
      } else {
        // Já está em contingência
        console.log('📋 Emitindo em modo de contingência');
        this.contingencia.adicionarOperacao(chave, xml, resultadoAssinatura.xmlAssinado);
        contingencia = true;
      }

      // 5. Incrementar numeração
      this.engine.incrementarNumero();

      // 6. Preparar resultado
      const resultado: ResultadoEmissao = {
        success: true,
        chave,
        numeroNFe: nfce.infNFe.ide.nNF,
        xmlNFe: xml,
        xmlAssinado: resultadoAssinatura.xmlAssinado,
        qrCode,
        contingencia
      };

      if (resultadoTransmissao?.success) {
        resultado.protocolo = resultadoTransmissao.protocolo;
        resultado.dataAutorizacao = new Date();
        console.log('✅ NFC-e autorizada online');
      } else {
        console.log('📋 NFC-e emitida em contingência');
      }

      return resultado;

    } catch (error) {
      console.error('❌ Erro na emissão de NFC-e:', error);
      
      return {
        success: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido na emissão'
      };
    }
  }

  /**
   * Consultar situação de uma NFC-e
   */
  public async consultarNFCe(chave: string): Promise<RetornoSEFAZ> {
    try {
      console.log(`🔍 Consultando NFC-e: ${chave}`);
      return await this.sefazClient.consultarNFCe(chave);
    } catch (error) {
      console.error('Erro na consulta:', error);
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro de comunicação',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Cancelar NFC-e
   */
  public async cancelarNFCe(
    chave: string,
    protocolo: string,
    justificativa: string
  ): Promise<RetornoSEFAZ> {
    try {
      console.log(`❌ Cancelando NFC-e: ${chave}`);
      
      // TODO: Implementar geração do XML de cancelamento
      const xmlCancelamento = this.gerarXMLCancelamento(chave, protocolo, justificativa);
      const xmlAssinado = await this.assinarEvento(xmlCancelamento, chave);

      return await this.sefazClient.enviarEvento(
        {
          tipo: 'CANCELAMENTO',
          chaveNFe: chave,
          nSeqEvento: 1,
          dhEvento: new Date().toISOString(),
          nProt: protocolo,
          xJust: justificativa
        },
        xmlAssinado
      );
    } catch (error) {
      console.error('Erro no cancelamento:', error);
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro no cancelamento',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Inutilizar faixa de numeração
   */
  public async inutilizarNumeracao(
    serie: string,
    numeroInicial: number,
    numeroFinal: number,
    justificativa: string
  ): Promise<RetornoSEFAZ> {
    try {
      console.log(`🚫 Inutilizando numeração: ${numeroInicial} a ${numeroFinal}`);
      
      const xmlInutilizacao = this.gerarXMLInutilizacao(
        serie,
        numeroInicial,
        numeroFinal,
        justificativa
      );
      const xmlAssinado = await this.assinarEventoInutilizacao(xmlInutilizacao);

      return await this.sefazClient.inutilizarNumeracao(
        serie,
        numeroInicial,
        numeroFinal,
        justificativa,
        this.configuracao.empresa.cnpj,
        xmlAssinado
      );
    } catch (error) {
      console.error('Erro na inutilização:', error);
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro na inutilização',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Verificar status do sistema
   */
  public async verificarStatusSistema(): Promise<StatusSistema> {
    try {
      // Verificar SEFAZ
      const statusSefaz = await this.sefazClient.consultarStatusServico();
      
      // Verificar certificado
      const validacaoCert = await this.assinatura.validarCertificado();
      
      // Status da contingência
      const statusContingencia = this.contingencia.getStatusContingencia();

      return {
        sefazOnline: statusSefaz.success,
        certificadoValido: validacaoCert.valido,
        contingenciaAtiva: statusContingencia.ativo,
        operacoesPendentes: statusContingencia.operacoesPendentes,
        ultimaVerificacao: statusContingencia.ultimaVerificacaoSEFAZ,
        proximaVerificacao: statusContingencia.proximaVerificacao
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return {
        sefazOnline: false,
        certificadoValido: false,
        contingenciaAtiva: true,
        operacoesPendentes: 0
      };
    }
  }

  /**
   * Forçar transmissão de operações pendentes
   */
  public async transmitirPendentes(): Promise<void> {
    console.log('🔄 Forçando transmissão de operações pendentes...');
    await this.contingencia.forcerTransmissao();
  }

  /**
   * Obter status da contingência
   */
  public getStatusContingencia(): StatusContingencia {
    return this.contingencia.getStatusContingencia();
  }

  /**
   * Gerar QR Code da NFC-e
   */
  private gerarQRCode(chave: string, valorTotal: number): string {
    const csc = this.configuracao.csc;
    const ambiente = this.configuracao.ambiente === 'producao' ? '1' : '2';
    
    // URL base para QR Code NFC-e SP
    const urlBase = this.configuracao.ambiente === 'producao' 
      ? 'https://www.fazenda.sp.gov.br/nfce/qrcode'
      : 'https://www.homologacao.fazenda.sp.gov.br/nfce/qrcode';

    // Parâmetros do QR Code
    const parametros = [
      chave,
      ambiente,
      csc.id,
      valorTotal.toFixed(2).replace('.', ',')
    ].join('|');

    // Hash SHA-1 dos parâmetros + CSC (simulado)
    const hashCompleto = this.gerarHashSimples(parametros + csc.codigo);

    return `${urlBase}?p=${parametros}|${hashCompleto}`;
  }

  /**
   * Gerar hash simples para QR Code (desenvolvimento)
   */
  private gerarHashSimples(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Gerar XML de cancelamento (simplificado)
   */
  private gerarXMLCancelamento(chave: string, protocolo: string, justificativa: string): string {
    const agora = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<evento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <infEvento Id="ID110111${chave}01">
    <cOrgao>35</cOrgao>
    <tpAmb>${this.configuracao.ambiente === 'producao' ? '1' : '2'}</tpAmb>
    <CNPJ>${this.configuracao.empresa.cnpj.replace(/\D/g, '')}</CNPJ>
    <chNFe>${chave}</chNFe>
    <dhEvento>${agora}</dhEvento>
    <tpEvento>110111</tpEvento>
    <nSeqEvento>1</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>Cancelamento</descEvento>
      <nProt>${protocolo}</nProt>
      <xJust>${justificativa}</xJust>
    </detEvento>
  </infEvento>
</evento>`;
  }

  /**
   * Gerar XML de inutilização (simplificado)
   */
  private gerarXMLInutilizacao(
    serie: string,
    numeroInicial: number,
    numeroFinal: number,
    justificativa: string
  ): string {
    const cnpj = this.configuracao.empresa.cnpj.replace(/\D/g, '');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<inutNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <infInut Id="ID35${cnpj}65${serie.padStart(3, '0')}${numeroInicial.toString().padStart(9, '0')}${numeroFinal.toString().padStart(9, '0')}">
    <tpAmb>${this.configuracao.ambiente === 'producao' ? '1' : '2'}</tpAmb>
    <xServ>INUTILIZAR</xServ>
    <cUF>35</cUF>
    <ano>${new Date().getFullYear()}</ano>
    <CNPJ>${cnpj}</CNPJ>
    <mod>65</mod>
    <serie>${serie}</serie>
    <nNFIni>${numeroInicial}</nNFIni>
    <nNFFin>${numeroFinal}</nNFFin>
    <xJust>${justificativa}</xJust>
  </infInut>
</inutNFe>`;
  }

  /**
   * Assinar XML de evento
   */
  private async assinarEvento(xmlEvento: string, chave: string): Promise<string> {
    const resultado = await this.assinatura.assinarXML(xmlEvento, chave);
    
    if (!resultado.success || !resultado.xmlAssinado) {
      throw new Error(`Erro ao assinar evento: ${resultado.erro}`);
    }
    
    return resultado.xmlAssinado;
  }

  /**
   * Assinar XML de inutilização
   */
  private async assinarEventoInutilizacao(xmlInutilizacao: string): Promise<string> {
    const resultado = await this.assinatura.assinarXML(xmlInutilizacao, 'INUTILIZACAO');
    
    if (!resultado.success || !resultado.xmlAssinado) {
      throw new Error(`Erro ao assinar inutilização: ${resultado.erro}`);
    }
    
    return resultado.xmlAssinado;
  }

  /**
   * Verificar status inicial do sistema
   */
  private async verificarStatusInicial(): Promise<void> {
    try {
      await this.contingencia.verificarStatusSEFAZ();
    } catch (error) {
      console.error('Erro na verificação inicial:', error);
    }
  }

  /**
   * Finalizar sistema
   */
  public destruir(): void {
    this.contingencia.destruir();
    this.assinatura.limparCertificado();
    console.log('🔄 Sistema NFC-e finalizado');
  }

  /**
   * Atualizar configuração
   */
  public atualizarConfiguracao(novaConfig: Partial<ConfigNFCe>): void {
    this.configuracao = { ...this.configuracao, ...novaConfig };
    this.engine.updateConfig(this.configuracao);
    
    if (novaConfig.ambiente) {
      this.sefazClient.setAmbiente(novaConfig.ambiente);
    }
  }

  /**
   * Obter configuração atual
   */
  public getConfiguracao(): ConfigNFCe {
    return this.configuracao;
  }
}