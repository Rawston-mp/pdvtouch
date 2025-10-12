/**
 * Exemplo de Integração e Testes do Sistema NFC-e
 * Demonstra como utilizar o sistema completo
 */

import { SistemaNFCe, ConfiguracaoSistema } from './sistema-nfce';
import { ConfigNFCe } from './nfce-types';
import { CertificadoDigital } from './assinatura-digital';

/**
 * Configuração de exemplo para teste
 */
export function criarConfiguracaoTeste(): ConfiguracaoSistema {
  // Certificado simulado para desenvolvimento
  const certificado: CertificadoDigital = {
    arquivo: new ArrayBuffer(100), // Simulado
    senha: '123456'
  };

  // Configuração da empresa para testes
  const configuracaoNFCe: ConfigNFCe = {
    certificado,
    empresa: {
      cnpj: '12.345.678/0001-95',
      razaoSocial: 'RESTAURANTE EXEMPLO LTDA',
      nomeFantasia: 'Restaurante Exemplo',
      inscricaoEstadual: '123.456.789.123',
      crt: '1', // Simples Nacional
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        bairro: 'Centro',
        codigoMunicipio: '3550308', // São Paulo/SP
        municipio: 'São Paulo',
        uf: 'SP',
        cep: '01234-567',
        telefone: '11987654321'
      }
    },
    serie: '1',
    proximoNumero: 1,
    csc: {
      id: '1',
      codigo: 'CODIGO-CSC-EXEMPLO-12345'
    },
    ambiente: 'homologacao',
    contingencia: false
  };

  return {
    certificado,
    configuracaoNFCe
  };
}

/**
 * Dados de exemplo para teste de emissão
 */
export function criarItensExemplo() {
  return [
    {
      produto: {
        id: 1,
        nome: 'Hambúrguer Artesanal',
        preco: 25.90,
        ncm: '21069090',
        unidade: 'UN'
      },
      quantidade: 2
    },
    {
      produto: {
        id: 2,
        nome: 'Refrigerante Lata 350ml',
        preco: 4.50,
        ncm: '22021000',
        unidade: 'UN'
      },
      quantidade: 2
    },
    {
      produto: {
        id: 3,
        nome: 'Batata Frita Porção',
        preco: 12.00,
        ncm: '20041000',
        unidade: 'UN'
      },
      quantidade: 1
    }
  ];
}

/**
 * Classe para demonstração e testes do sistema
 */
export class ExemploSistemaNFCe {
  private sistema: SistemaNFCe;

  constructor(configuracao?: ConfiguracaoSistema) {
    const config = configuracao || criarConfiguracaoTeste();
    this.sistema = new SistemaNFCe(config);
    
    console.log('🧪 Sistema de exemplo NFC-e inicializado');
  }

  /**
   * Exemplo completo de emissão de NFC-e
   */
  async exemploEmissaoCompleta(): Promise<void> {
    try {
      console.log('\n=== EXEMPLO DE EMISSÃO COMPLETA DE NFC-e ===');

      // 1. Verificar status do sistema
      console.log('\n1️⃣ Verificando status do sistema...');
      const status = await this.sistema.verificarStatusSistema();
      console.log('Status:', {
        sefazOnline: status.sefazOnline ? '✅ Online' : '❌ Offline',
        certificado: status.certificadoValido ? '✅ Válido' : '❌ Inválido',
        contingencia: status.contingenciaAtiva ? '⚠️ Ativa' : '✅ Inativa',
        pendentes: status.operacoesPendentes
      });

      // 2. Preparar dados da venda
      console.log('\n2️⃣ Preparando dados da venda...');
      const itens = criarItensExemplo();
      const valorTotal = itens.reduce((total, item) => 
        total + (item.produto.preco * item.quantidade), 0
      );
      
      console.log('Itens:', itens.length);
      console.log('Valor total: R$', valorTotal.toFixed(2));

      // 3. Emitir NFC-e
      console.log('\n3️⃣ Emitindo NFC-e...');
      const resultado = await this.sistema.emitirNFCe(
        itens,
        'pix', // Forma de pagamento
        valorTotal, // Valor pago
        0, // Troco
        '12345678901' // CPF do consumidor (opcional)
      );

      if (resultado.success) {
        console.log('✅ NFC-e emitida com sucesso!');
        console.log('Detalhes:', {
          chave: resultado.chave,
          numero: resultado.numeroNFe,
          contingencia: resultado.contingencia ? '⚠️ Sim' : '✅ Não',
          protocolo: resultado.protocolo || 'N/A (contingência)',
          qrCode: resultado.qrCode?.substring(0, 50) + '...'
        });

        // 4. Exemplo de consulta (se autorizada online)
        if (resultado.chave && !resultado.contingencia) {
          console.log('\n4️⃣ Consultando NFC-e na SEFAZ...');
          const consulta = await this.sistema.consultarNFCe(resultado.chave);
          console.log('Resultado consulta:', {
            status: consulta.success ? '✅ Autorizada' : '❌ Problema',
            codigo: consulta.codigoStatus,
            motivo: consulta.motivoStatus
          });
        }

        return;
      } else {
        console.error('❌ Erro na emissão:', resultado.erro);
      }

    } catch (error) {
      console.error('❌ Erro no exemplo:', error);
    }
  }

  /**
   * Exemplo de teste de contingência
   */
  async exemploContingencia(): Promise<void> {
    try {
      console.log('\n=== EXEMPLO DE SISTEMA DE CONTINGÊNCIA ===');

      // 1. Forçar contingência
      console.log('\n1️⃣ Simulando problemas de conexão (ativando contingência)...');
      this.sistema.atualizarConfiguracao({ contingencia: true });

      // 2. Emitir algumas NFC-e em contingência
      console.log('\n2️⃣ Emitindo NFC-e em modo contingência...');
      
      for (let i = 1; i <= 3; i++) {
        const itens = criarItensExemplo();
        const valorTotal = itens.reduce((total, item) => 
          total + (item.produto.preco * item.quantidade), 0
        );

        const resultado = await this.sistema.emitirNFCe(
          itens,
          'dinheiro',
          valorTotal + 10, // Valor pago com troco
          10 // Troco
        );

        if (resultado.success) {
          console.log(`📋 NFC-e ${i} emitida em contingência: ${resultado.chave}`);
        }
      }

      // 3. Verificar status da contingência
      console.log('\n3️⃣ Status da contingência:');
      const statusContingencia = this.sistema.getStatusContingencia();
      console.log({
        ativo: statusContingencia.ativo ? '⚠️ Sim' : '✅ Não',
        motivo: statusContingencia.motivoAtivacao,
        pendentes: statusContingencia.operacoesPendentes,
        proximaVerificacao: statusContingencia.proximaVerificacao?.toLocaleTimeString()
      });

      // 4. Simular volta do SEFAZ (desativando contingência)
      console.log('\n4️⃣ Simulando volta do SEFAZ (desativando contingência)...');
      this.sistema.atualizarConfiguracao({ contingencia: false });

      // 5. Tentar transmitir pendentes
      console.log('\n5️⃣ Tentando transmitir operações pendentes...');
      await this.sistema.transmitirPendentes();

      console.log('✅ Exemplo de contingência concluído');

    } catch (error) {
      console.error('❌ Erro no exemplo de contingência:', error);
    }
  }

  /**
   * Exemplo de cancelamento
   */
  async exemploCancelamento(): Promise<void> {
    try {
      console.log('\n=== EXEMPLO DE CANCELAMENTO DE NFC-e ===');

      // 1. Emitir uma NFC-e primeiro
      console.log('\n1️⃣ Emitindo NFC-e para cancelar...');
      const itens = criarItensExemplo();
      const valorTotal = itens.reduce((total, item) => 
        total + (item.produto.preco * item.quantidade), 0
      );

      const resultado = await this.sistema.emitirNFCe(
        itens,
        'cartao_credito',
        valorTotal
      );

      if (!resultado.success || !resultado.chave) {
        console.error('❌ Não foi possível emitir NFC-e para cancelar');
        return;
      }

      console.log('✅ NFC-e emitida:', resultado.chave);

      // 2. Simular cancelamento (só funciona se foi autorizada)
      if (resultado.protocolo && !resultado.contingencia) {
        console.log('\n2️⃣ Cancelando NFC-e...');
        
        const cancelamento = await this.sistema.cancelarNFCe(
          resultado.chave,
          resultado.protocolo,
          'Cancelamento solicitado pelo cliente'
        );

        if (cancelamento.success) {
          console.log('✅ NFC-e cancelada com sucesso');
          console.log('Protocolo cancelamento:', cancelamento.protocolo);
        } else {
          console.log('❌ Erro no cancelamento:', cancelamento.motivoStatus);
        }
      } else {
        console.log('⚠️ NFC-e em contingência - cancelamento não disponível');
      }

    } catch (error) {
      console.error('❌ Erro no exemplo de cancelamento:', error);
    }
  }

  /**
   * Exemplo de inutilização
   */
  async exemploInutilizacao(): Promise<void> {
    try {
      console.log('\n=== EXEMPLO DE INUTILIZAÇÃO DE NUMERAÇÃO ===');

      console.log('\n1️⃣ Inutilizando faixa de numeração...');
      
      const inutilizacao = await this.sistema.inutilizarNumeracao(
        '1', // Série
        100, // Número inicial
        105, // Número final
        'Inutilização de teste - numeração pulada por erro do sistema'
      );

      if (inutilizacao.success) {
        console.log('✅ Numeração inutilizada com sucesso');
        console.log('Protocolo:', inutilizacao.protocolo);
      } else {
        console.log('❌ Erro na inutilização:', inutilizacao.motivoStatus);
      }

    } catch (error) {
      console.error('❌ Erro no exemplo de inutilização:', error);
    }
  }

  /**
   * Executar todos os exemplos
   */
  async executarTodosExemplos(): Promise<void> {
    console.log('🧪 INICIANDO DEMONSTRAÇÃO COMPLETA DO SISTEMA NFC-e');
    console.log('=' .repeat(60));

    await this.exemploEmissaoCompleta();
    await this.exemploContingencia();
    await this.exemploCancelamento();
    await this.exemploInutilizacao();

    console.log('\n' + '='.repeat(60));
    console.log('✅ DEMONSTRAÇÃO CONCLUÍDA');
    
    // Finalizar sistema
    this.sistema.destruir();
  }

  /**
   * Obter instância do sistema para uso direto
   */
  getSistema(): SistemaNFCe {
    return this.sistema;
  }
}

/**
 * Função para executar exemplo rápido
 */
export async function exemploRapido(): Promise<void> {
  const exemplo = new ExemploSistemaNFCe();
  await exemplo.exemploEmissaoCompleta();
  exemplo.getSistema().destruir();
}

/**
 * Função para executar demonstração completa
 */
export async function demonstracaoCompleta(): Promise<void> {
  const exemplo = new ExemploSistemaNFCe();
  await exemplo.executarTodosExemplos();
}

// As funções já estão exportadas acima