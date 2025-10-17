/**
 * Cliente SEFAZ-SP para comunicação com webservices NFC-e
 * Ambiente de Homologação e Produção
 */

import { EventoNFCe } from './nfce-types';

export interface RetornoSEFAZ {
  success: boolean;
  protocolo?: string;
  chave?: string;
  numeroProtocolo?: string;
  dataRecebimento?: string;
  codigoStatus: string;
  motivoStatus: string;
  xmlRetorno?: string;
  erro?: string;
}

export interface ConsultaStatusSEFAZ {
  success: boolean;
  status: 'online' | 'offline';
  tempoResposta?: number;
  versaoServico?: string;
  motivoStatus?: string;
}

export class SEFAZClient {
  private readonly URLS = {
    homologacao: {
      autorizacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfceautorizacao.asmx',
      retautorizacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfceretautorizacao.asmx',
      inutilizacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfceinutilizacao.asmx',
      consulta: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfceconsulta.asmx',
      statusservico: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfcestatusservico.asmx',
      evento: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfcerecepcaoevento.asmx'
    },
    producao: {
      autorizacao: 'https://nfce.fazenda.sp.gov.br/ws/nfceautorizacao.asmx',
      retautorizacao: 'https://nfce.fazenda.sp.gov.br/ws/nfceretautorizacao.asmx',
      inutilizacao: 'https://nfce.fazenda.sp.gov.br/ws/nfceinutilizacao.asmx',
      consulta: 'https://nfce.fazenda.sp.gov.br/ws/nfceconsulta.asmx',
      statusservico: 'https://nfce.fazenda.sp.gov.br/ws/nfcestatusservico.asmx',
      evento: 'https://nfce.fazenda.sp.gov.br/ws/nfcerecepcaoevento.asmx'
    }
  };

  private ambiente: 'homologacao' | 'producao';
  private timeout: number = 30000; // 30 segundos

  constructor(ambiente: 'homologacao' | 'producao' = 'homologacao') {
    this.ambiente = ambiente;
  }

  /**
   * Envia NFC-e para autorização na SEFAZ
   */
  async autorizarNFCe(xmlAssinado: string, chave: string): Promise<RetornoSEFAZ> {
    try {
      const envelope = this.criarEnvelopeAutorizacao(xmlAssinado);
      const url = this.URLS[this.ambiente].autorizacao;
      
      const response = await this.enviarSOAP(url, envelope, 'NfceAutorizacao');
      
      return this.processarRetornoAutorizacao(response, chave);
    } catch (error) {
      console.error('Erro ao autorizar NFC-e:', error);
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro de comunicação com SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Consulta o retorno da autorização (processamento assíncrono)
   */
  async consultarRetornoAutorizacao(numeroRecibo: string): Promise<RetornoSEFAZ> {
    try {
      const envelope = this.criarEnvelopeRetAutorizacao(numeroRecibo);
      const url = this.URLS[this.ambiente].retautorizacao;
      
      const response = await this.enviarSOAP(url, envelope, 'NfceRetAutorizacao');
      
      return this.processarRetornoConsulta(response);
    } catch (error) {
      console.error('Erro ao consultar retorno:', error);
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro de comunicação com SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Consulta situação de uma NFC-e específica
   */
  async consultarNFCe(chave: string): Promise<RetornoSEFAZ> {
    try {
      const envelope = this.criarEnvelopeConsulta(chave);
      const url = this.URLS[this.ambiente].consulta;
      
      const response = await this.enviarSOAP(url, envelope, 'NfceConsulta');
      
      return this.processarRetornoConsulta(response);
    } catch (error) {
      console.error('Erro ao consultar NFC-e:', error);
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro de comunicação com SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Consulta status do serviço SEFAZ
   */
  async consultarStatusServico(): Promise<ConsultaStatusSEFAZ> {
    try {
      const envelope = this.criarEnvelopeStatusServico();
      const url = this.URLS[this.ambiente].statusservico;
      
      const startTime = Date.now();
      const response = await this.enviarSOAP(url, envelope, 'NfceStatusServico');
      const tempoResposta = Date.now() - startTime;
      
      // Parse do XML de resposta
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response, 'text/xml');
      
      const cStat = xmlDoc.querySelector('cStat')?.textContent || '';
      const xMotivo = xmlDoc.querySelector('xMotivo')?.textContent || '';
      const verAplic = xmlDoc.querySelector('verAplic')?.textContent || '';
      
      return {
        success: cStat === '107', // Serviço em Operação
        status: cStat === '107' ? 'online' : 'offline',
        tempoResposta,
        versaoServico: verAplic,
        motivoStatus: xMotivo
      };
    } catch (error) {
      console.error('Erro ao consultar status:', error);
      return {
        success: false,
        status: 'offline',
        motivoStatus: 'Erro de comunicação com SEFAZ'
      };
    }
  }

  /**
   * Envia evento (cancelamento, correção, etc.)
   */
  async enviarEvento(evento: EventoNFCe, xmlAssinado: string): Promise<RetornoSEFAZ> {
    try {
      const envelope = this.criarEnvelopeEvento(xmlAssinado);
      const url = this.URLS[this.ambiente].evento;
      
      const response = await this.enviarSOAP(url, envelope, 'NfceRecepcaoEvento');
      
      return this.processarRetornoEvento(response);
    } catch (error) {
      console.error('Erro ao enviar evento:', error);
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro de comunicação com SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Inutilizar faixa de numeração
   */
  async inutilizarNumeracao(
    serie: string,
    numeroInicial: number,
    numeroFinal: number,
    justificativa: string,
    cnpj: string,
    xmlAssinado: string
  ): Promise<RetornoSEFAZ> {
    try {
      const envelope = this.criarEnvelopeInutilizacao(xmlAssinado);
      const url = this.URLS[this.ambiente].inutilizacao;
      
      const response = await this.enviarSOAP(url, envelope, 'NfceInutilizacao');
      
      return this.processarRetornoInutilizacao(response);
    } catch (error) {
      console.error('Erro ao inutilizar numeração:', error);
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro de comunicação com SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Criar envelope SOAP para autorização
   */
  private criarEnvelopeAutorizacao(xmlNFe: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfce="http://www.portalfiscal.inf.br/nfe/wsdl/NfceAutorizacao">
  <soap:Header />
  <soap:Body>
    <nfce:nfceDadosMsg>
      <![CDATA[
        <?xml version="1.0" encoding="UTF-8"?>
        <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <idLote>1</idLote>
          <indSinc>0</indSinc>
          ${xmlNFe}
        </enviNFe>
      ]]>
    </nfce:nfceDadosMsg>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Criar envelope SOAP para consulta retorno autorização
   */
  private criarEnvelopeRetAutorizacao(numeroRecibo: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfce="http://www.portalfiscal.inf.br/nfe/wsdl/NfceRetAutorizacao">
  <soap:Header />
  <soap:Body>
    <nfce:nfceDadosMsg>
      <![CDATA[
        <?xml version="1.0" encoding="UTF-8"?>
        <consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <tpAmb>${this.ambiente === 'producao' ? '1' : '2'}</tpAmb>
          <nRec>${numeroRecibo}</nRec>
        </consReciNFe>
      ]]>
    </nfce:nfceDadosMsg>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Criar envelope SOAP para consulta NFC-e
   */
  private criarEnvelopeConsulta(chave: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfce="http://www.portalfiscal.inf.br/nfe/wsdl/NfceConsulta">
  <soap:Header />
  <soap:Body>
    <nfce:nfceDadosMsg>
      <![CDATA[
        <?xml version="1.0" encoding="UTF-8"?>
        <consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <tpAmb>${this.ambiente === 'producao' ? '1' : '2'}</tpAmb>
          <xServ>CONSULTAR</xServ>
          <chNFe>${chave}</chNFe>
        </consSitNFe>
      ]]>
    </nfce:nfceDadosMsg>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Criar envelope SOAP para status do serviço
   */
  private criarEnvelopeStatusServico(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfce="http://www.portalfiscal.inf.br/nfe/wsdl/NfceStatusServico">
  <soap:Header />
  <soap:Body>
    <nfce:nfceDadosMsg>
      <![CDATA[
        <?xml version="1.0" encoding="UTF-8"?>
        <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <tpAmb>${this.ambiente === 'producao' ? '1' : '2'}</tpAmb>
          <cUF>35</cUF>
          <xServ>STATUS</xServ>
        </consStatServ>
      ]]>
    </nfce:nfceDadosMsg>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Criar envelope SOAP para eventos
   */
  private criarEnvelopeEvento(xmlEvento: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfce="http://www.portalfiscal.inf.br/nfe/wsdl/NfceRecepcaoEvento">
  <soap:Header />
  <soap:Body>
    <nfce:nfceDadosMsg>
      <![CDATA[
        <?xml version="1.0" encoding="UTF-8"?>
        <envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
          <idLote>1</idLote>
          ${xmlEvento}
        </envEvento>
      ]]>
    </nfce:nfceDadosMsg>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Criar envelope SOAP para inutilização
   */
  private criarEnvelopeInutilizacao(xmlInutilizacao: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfce="http://www.portalfiscal.inf.br/nfe/wsdl/NfceInutilizacao">
  <soap:Header />
  <soap:Body>
    <nfce:nfceDadosMsg>
      <![CDATA[
        ${xmlInutilizacao}
      ]]>
    </nfce:nfceDadosMsg>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Enviar requisição SOAP
   */
  private async enviarSOAP(url: string, envelope: string, soapAction: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': soapAction
        },
        body: envelope,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout na comunicação com SEFAZ');
      }
      throw error;
    }
  }

  /**
   * Processar retorno da autorização
   */
  private processarRetornoAutorizacao(xmlResponse: string, chave: string): RetornoSEFAZ {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
      
      const cStat = xmlDoc.querySelector('cStat')?.textContent || '';
      const xMotivo = xmlDoc.querySelector('xMotivo')?.textContent || '';
  const nRec = xmlDoc.querySelector('nRec')?.textContent || undefined;
      
      return {
        success: cStat === '103', // Lote recebido com sucesso
        protocolo: nRec,
        chave: chave,
        codigoStatus: cStat,
        motivoStatus: xMotivo,
        xmlRetorno: xmlResponse
      };
    } catch (error) {
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro ao processar resposta da SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Processar retorno da consulta
   */
  private processarRetornoConsulta(xmlResponse: string): RetornoSEFAZ {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
      
      const cStat = xmlDoc.querySelector('cStat')?.textContent || '';
      const xMotivo = xmlDoc.querySelector('xMotivo')?.textContent || '';
  const nProt = xmlDoc.querySelector('nProt')?.textContent || undefined;
  const dhRecbto = xmlDoc.querySelector('dhRecbto')?.textContent || undefined;
  const chNFe = xmlDoc.querySelector('chNFe')?.textContent || undefined;
      
      return {
        success: cStat === '100', // Autorizado o uso da NF-e
        protocolo: nProt,
        numeroProtocolo: nProt,
        dataRecebimento: dhRecbto,
        chave: chNFe,
        codigoStatus: cStat,
        motivoStatus: xMotivo,
        xmlRetorno: xmlResponse
      };
    } catch (error) {
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro ao processar resposta da SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Processar retorno do evento
   */
  private processarRetornoEvento(xmlResponse: string): RetornoSEFAZ {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
      
      const cStat = xmlDoc.querySelector('cStat')?.textContent || '';
      const xMotivo = xmlDoc.querySelector('xMotivo')?.textContent || '';
  const nProt = xmlDoc.querySelector('nProt')?.textContent || undefined;
      
      return {
        success: ['135', '136', '155'].includes(cStat), // Eventos aceitos
        protocolo: nProt,
        numeroProtocolo: nProt,
        codigoStatus: cStat,
        motivoStatus: xMotivo,
        xmlRetorno: xmlResponse
      };
    } catch (error) {
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro ao processar resposta da SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Processar retorno da inutilização
   */
  private processarRetornoInutilizacao(xmlResponse: string): RetornoSEFAZ {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
      
      const cStat = xmlDoc.querySelector('cStat')?.textContent || '';
      const xMotivo = xmlDoc.querySelector('xMotivo')?.textContent || '';
  const nProt = xmlDoc.querySelector('nProt')?.textContent || undefined;
      
      return {
        success: cStat === '102', // Inutilização de número homologado
        protocolo: nProt,
        numeroProtocolo: nProt,
        codigoStatus: cStat,
        motivoStatus: xMotivo,
        xmlRetorno: xmlResponse
      };
    } catch (error) {
      return {
        success: false,
        codigoStatus: '999',
        motivoStatus: 'Erro ao processar resposta da SEFAZ',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Definir ambiente (homologação/produção)
   */
  public setAmbiente(ambiente: 'homologacao' | 'producao'): void {
    this.ambiente = ambiente;
  }

  /**
   * Definir timeout das requisições
   */
  public setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}