/**
 * Assinatura Digital para XML NFC-e
 * Certificado A1 (arquivo .pfx)
 * Algoritmo: SHA-256 com RSA
 */

export interface CertificadoDigital {
  arquivo: ArrayBuffer;
  senha: string;
}

export interface AssinaturaResult {
  success: boolean;
  xmlAssinado?: string;
  erro?: string;
}

export interface ValidacaoCertificado {
  valido: boolean;
  dataVencimento?: Date;
  cnpj?: string;
  razaoSocial?: string;
  erro?: string;
}

export class AssinaturaDigital {
  private certificado?: CertificadoDigital;

  constructor(certificado?: CertificadoDigital) {
    this.certificado = certificado;
  }

  /**
   * Carregar certificado A1
   */
  public async carregarCertificado(certificado: CertificadoDigital): Promise<ValidacaoCertificado> {
    try {
      this.certificado = certificado;
      
      // TODO: Implementar validação real do certificado
      // Por enquanto, retorna como válido para desenvolvimento
      return {
        valido: true,
        dataVencimento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano no futuro
        cnpj: '12345678000195',
        razaoSocial: 'Empresa Exemplo LTDA'
      };
    } catch (error) {
      return {
        valido: false,
        erro: error instanceof Error ? error.message : 'Erro ao carregar certificado'
      };
    }
  }

  /**
   * Assinar XML da NFC-e
   */
  public async assinarXML(xml: string, chave: string): Promise<AssinaturaResult> {
    try {
      if (!this.certificado) {
        throw new Error('Certificado não carregado');
      }

      // Por enquanto, simula a assinatura para desenvolvimento
      // Em produção, seria necessário usar uma biblioteca específica como node-forge ou similar
      const xmlAssinado = this.simularAssinatura(xml, chave);

      return {
        success: true,
        xmlAssinado
      };
    } catch (error) {
      return {
        success: false,
        erro: error instanceof Error ? error.message : 'Erro ao assinar XML'
      };
    }
  }

  /**
   * Simular assinatura digital para desenvolvimento
   * ATENÇÃO: Esta é apenas uma simulação para prototipagem!
   * Em produção, deve-se usar criptografia real.
   */
  private simularAssinatura(xml: string, chave: string): string {
    // Parse do XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    
    // Encontrar o elemento infNFe
    const infNFe = xmlDoc.querySelector('infNFe');
    if (!infNFe) {
      throw new Error('Elemento infNFe não encontrado no XML');
    }

    // Criar elemento Signature simulado
    const signature = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    
    // SignedInfo
    const signedInfo = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'SignedInfo');
    
    const canonicalizationMethod = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'CanonicalizationMethod');
    canonicalizationMethod.setAttribute('Algorithm', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315');
    signedInfo.appendChild(canonicalizationMethod);
    
    const signatureMethod = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureMethod');
    signatureMethod.setAttribute('Algorithm', 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256');
    signedInfo.appendChild(signatureMethod);
    
    const reference = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'Reference');
    reference.setAttribute('URI', `#NFe${chave}`);
    
    const transforms = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'Transforms');
    const transform1 = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'Transform');
    transform1.setAttribute('Algorithm', 'http://www.w3.org/2000/09/xmldsig#enveloped-signature');
    const transform2 = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'Transform');
    transform2.setAttribute('Algorithm', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315');
    transforms.appendChild(transform1);
    transforms.appendChild(transform2);
    reference.appendChild(transforms);
    
    const digestMethod = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'DigestMethod');
    digestMethod.setAttribute('Algorithm', 'http://www.w3.org/2001/04/xmlenc#sha256');
    reference.appendChild(digestMethod);
    
    const digestValue = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'DigestValue');
    digestValue.textContent = this.gerarHashSimulado(chave + 'digest');
    reference.appendChild(digestValue);
    
    signedInfo.appendChild(reference);
    signature.appendChild(signedInfo);
    
    // SignatureValue
    const signatureValue = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue');
    signatureValue.textContent = this.gerarHashSimulado(chave + 'signature');
    signature.appendChild(signatureValue);
    
    // KeyInfo
    const keyInfo = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'KeyInfo');
    const x509Data = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'X509Data');
    const x509Certificate = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate');
    x509Certificate.textContent = this.gerarCertificadoSimulado();
    x509Data.appendChild(x509Certificate);
    keyInfo.appendChild(x509Data);
    signature.appendChild(keyInfo);
    
    // Adicionar assinatura ao XML
    const nfeElement = xmlDoc.querySelector('NFe');
    if (nfeElement) {
      nfeElement.appendChild(signature);
    }
    
    // Serializar XML
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
  }

  /**
   * Gerar hash simulado para desenvolvimento
   */
  private gerarHashSimulado(input: string): string {
    // Simula um hash SHA-256 em Base64
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Converter para string base64-like
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
    const fakeHash = btoa(hashStr + hashStr + hashStr + hashStr + hashStr + hashStr + hashStr + hashStr);
    
    return fakeHash;
  }

  /**
   * Gerar certificado simulado para desenvolvimento
   */
  private gerarCertificadoSimulado(): string {
    return `MIIGrTCCBJWgAwIBAgIRAJzKkjN0/YqUem82VV0DuBcwDQYJKoZIhvcNAQELBQAw
UTELMAkGA1UEBhMCQlIxEzARBgNVBAoTCklDUC1CcmFzaWwxLTArBgNVBAMTJEF1
dG9yaWRhZGUgQ2VydGlmaWNhZG9yYSBkYSBKdXN0aWNhIHY1MB4XDTIzMDEwMTEy
MDAwMFoXDTI0MDEwMTEyMDAwMFowgYwxCzAJBgNVBAYTAkJSMRMwEQYDVQQKEwpJ
Q1AtQnJhc2lsMSUwIwYDVQQLExxTZWNyZXRhcmlhIGRhIFJlY2VpdGEgRmVkZXJh
bDEeMBwGA1UECxMVUkZCIGUtQ05QSiBBMSAoSEFSRFdBUkUpMSEwHwYDVQQDExhF
TlRSRVBSSVNBIEVYRU1QTE8gTFREQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCC
AQoCggEBAK4d3KxZhp8/N6Z4dY8dCo6s3hmAcqJ9sM5O9s8xO3Tc8e2sXKxF9kLT
rKm8dmU6m1s8fR5sOi5hU8F3jS3hKjm9Tx6A1A1z2M4Oc8F1Nc5L9FoX6b8zK+iD
wJfEZ1m1J2ZLb1xNhGFnL8K0y9zIbM7qJ0SfJ2Kj7Ug2+8ZLy9V3A7U9dLvK1YsU
sLmNPg8+LrA4VuHEYsLLYL2mJ8KJ2Lc8M4hN8b1i0H+iPu9l7Iq3DJY/3Q7K8t1V
rQxj9tV9sVt8WqW1M0n7JQZo2TcGNx8Q0WUGf8W8q0nD5d7cCQE9m8dKf4lN3Wbn
s4xvL8F3bHzO+K8xgp8vNz+B8xc1cRECAwEAAaOCArEwggKtMAwGA1UdEwEB/wQC
MAAwHwYDVR0jBBgwFoAU6Ecli1KLQh6PgQ8X4tOwHyMmtMAwggF+BgNVHSAEggF1
MIIBcTCCAW0GCisGAQQBgjcVAgIwggFdMIIBWQYIKwYBBQUHAgIwggFLHoIBRwBD
AGUAcgB0AGkAZgBpAGMAYQBkAG8AIABkAGUAIABQAGUAcwBzAG8AYQAgAEYAaQBz
AGkAYwBhAC4AIABBAG0AZQB3AGQAdwA=`;
  }

  /**
   * Validar se o certificado está válido
   */
  public async validarCertificado(): Promise<ValidacaoCertificado> {
    if (!this.certificado) {
      return {
        valido: false,
        erro: 'Certificado não carregado'
      };
    }

    try {
      // TODO: Implementar validação real do certificado
      // Verificar validade, cadeia de certificação, etc.
      
      return {
        valido: true,
        dataVencimento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        cnpj: '12345678000195',
        razaoSocial: 'Empresa Exemplo LTDA'
      };
    } catch (error) {
      return {
        valido: false,
        erro: error instanceof Error ? error.message : 'Erro na validação'
      };
    }
  }

  /**
   * Extrair informações do certificado
   */
  public async obterInformacoesCertificado(): Promise<ValidacaoCertificado> {
    return this.validarCertificado();
  }

  /**
   * Verificar se o certificado está próximo do vencimento
   */
  public async verificarVencimento(diasAntecedencia: number = 30): Promise<{
    proximoVencimento: boolean;
    diasRestantes?: number;
    dataVencimento?: Date;
  }> {
    const validacao = await this.validarCertificado();
    
    if (!validacao.valido || !validacao.dataVencimento) {
      return { proximoVencimento: false };
    }

    const agora = new Date();
    const vencimento = validacao.dataVencimento;
    const diffTime = vencimento.getTime() - agora.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      proximoVencimento: diasRestantes <= diasAntecedencia && diasRestantes > 0,
      diasRestantes,
      dataVencimento: vencimento
    };
  }

  /**
   * Limpar certificado da memória
   */
  public limparCertificado(): void {
    this.certificado = undefined;
  }
}

/**
 * Função utilitária para criar instância de AssinaturaDigital
 */
export function criarAssinadorDigital(certificado?: CertificadoDigital): AssinaturaDigital {
  return new AssinaturaDigital(certificado);
}

/**
 * Validar formato do arquivo de certificado
 */
export function validarFormatoCertificado(arquivo: ArrayBuffer): boolean {
  try {
    // Verificar se o arquivo tem o formato básico de um .pfx
    const bytes = new Uint8Array(arquivo);
    
    // Verificar magic bytes do formato PKCS#12 (.pfx)
    // Simplificado para desenvolvimento
    return bytes.length > 100; // Arquivo deve ter tamanho mínimo
  } catch {
    return false;
  }
}

/**
 * Gerar hash SHA-256 (implementação simplificada para desenvolvimento)
 */
export async function gerarHashSHA256(input: string): Promise<string> {
  try {
    // Usar Web Crypto API se disponível
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const hashHex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return hashHex;
    }
    
    // Fallback simples para desenvolvimento
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  } catch {
    throw new Error('Erro ao gerar hash SHA-256');
  }
}