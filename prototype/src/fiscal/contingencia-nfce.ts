/**
 * Sistema de Contingência NFC-e
 * FS-DA (Formulário de Segurança para Documento Auxiliar)
 * Operação offline quando SEFAZ indisponível
 */

import { ConfigNFCe } from './nfce-types';
import { SEFAZClient } from './sefaz-client';

export interface OperacaoContingencia {
  id: string;
  chaveNFe: string;
  xmlNFe: string;
  xmlAssinado: string;
  dataOperacao: Date;
  tentativas: number;
  ultimaTentativa?: Date;
  status: 'pendente' | 'transmitida' | 'erro' | 'cancelada';
  motivoContingencia: string;
  erro?: string;
}

export interface StatusContingencia {
  ativo: boolean;
  motivoAtivacao?: string;
  dataAtivacao?: Date;
  operacoesPendentes: number;
  ultimaVerificacaoSEFAZ?: Date;
  proximaVerificacao?: Date;
}

export class ContingenciaNFCe {
  private operacoesPendentes: Map<string, OperacaoContingencia> = new Map();
  private statusContingencia: StatusContingencia = {
    ativo: false,
    operacoesPendentes: 0
  };
  private sefazClient: SEFAZClient;
  private config: ConfigNFCe;
  private intervalVerificacao?: number;
  private readonly INTERVALO_VERIFICACAO = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_TENTATIVAS = 10;
  private readonly TIMEOUT_TRANSMISSAO = 24 * 60 * 60 * 1000; // 24 horas

  constructor(sefazClient: SEFAZClient, config: ConfigNFCe) {
    this.sefazClient = sefazClient;
    this.config = config;
    this.inicializarVerificacaoPeriodica();
  }

  /**
   * Ativar modo de contingência
   */
  public ativarContingencia(motivo: string): void {
    console.log('🚨 Ativando contingência NFC-e:', motivo);
    
    this.statusContingencia = {
      ativo: true,
      motivoAtivacao: motivo,
      dataAtivacao: new Date(),
      operacoesPendentes: this.operacoesPendentes.size,
      ultimaVerificacaoSEFAZ: new Date()
    };

    // Atualizar configuração para emissão em contingência
    this.config.contingencia = true;

    this.agendarProximaVerificacao();
  }

  /**
   * Desativar modo de contingência
   */
  public async desativarContingencia(): Promise<void> {
    console.log('✅ Desativando contingência NFC-e');
    
    this.statusContingencia.ativo = false;
    this.config.contingencia = false;

    // Tentar transmitir operações pendentes imediatamente
    await this.transmitirOperacoesPendentes();
  }

  /**
   * Adicionar operação para fila de contingência
   */
  public adicionarOperacao(chave: string, xmlNFe: string, xmlAssinado: string): void {
    const operacao: OperacaoContingencia = {
      id: this.gerarIdOperacao(),
      chaveNFe: chave,
      xmlNFe,
      xmlAssinado,
      dataOperacao: new Date(),
      tentativas: 0,
      status: 'pendente',
      motivoContingencia: this.statusContingencia.motivoAtivacao || 'SEFAZ indisponível'
    };

    this.operacoesPendentes.set(chave, operacao);
    this.statusContingencia.operacoesPendentes = this.operacoesPendentes.size;

    console.log(`📝 Operação ${chave} adicionada à fila de contingência`);
  }

  /**
   * Verificar status do SEFAZ e tentar sair da contingência
   */
  public async verificarStatusSEFAZ(): Promise<void> {
    try {
      console.log('🔍 Verificando status do SEFAZ...');
      
      const statusSefaz = await this.sefazClient.consultarStatusServico();
      this.statusContingencia.ultimaVerificacaoSEFAZ = new Date();

      if (statusSefaz.success && statusSefaz.status === 'online') {
        console.log('✅ SEFAZ online - Saindo da contingência');
        
        if (this.statusContingencia.ativo) {
          await this.desativarContingencia();
        }
      } else {
        console.log('❌ SEFAZ offline - Mantendo contingência');
        
        if (!this.statusContingencia.ativo) {
          this.ativarContingencia(statusSefaz.motivoStatus || 'SEFAZ indisponível');
        }
        
        this.agendarProximaVerificacao();
      }
    } catch (error) {
      console.error('Erro ao verificar status SEFAZ:', error);
      
      if (!this.statusContingencia.ativo) {
        this.ativarContingencia('Erro de comunicação com SEFAZ');
      }
      
      this.agendarProximaVerificacao();
    }
  }

  /**
   * Transmitir operações pendentes
   */
  public async transmitirOperacoesPendentes(): Promise<void> {
    if (this.operacoesPendentes.size === 0) {
      console.log('📋 Nenhuma operação pendente para transmitir');
      return;
    }

    console.log(`🔄 Transmitindo ${this.operacoesPendentes.size} operação(ões) pendente(s)...`);

    const operacoes = Array.from(this.operacoesPendentes.values())
      .filter(op => op.status === 'pendente')
      .sort((a, b) => a.dataOperacao.getTime() - b.dataOperacao.getTime());

    for (const operacao of operacoes) {
      await this.transmitirOperacao(operacao);
      
      // Aguardar um pouco entre transmissões para não sobrecarregar SEFAZ
      await this.sleep(1000);
    }

    // Limpar operações transmitidas com sucesso
    this.limparOperacoesTransmitidas();
  }

  /**
   * Transmitir uma operação específica
   */
  private async transmitirOperacao(operacao: OperacaoContingencia): Promise<void> {
    try {
      operacao.tentativas++;
      operacao.ultimaTentativa = new Date();

      console.log(`📤 Transmitindo operação ${operacao.chaveNFe} (tentativa ${operacao.tentativas})`);

      // Verificar se não excedeu tempo limite
      const agora = new Date();
      const tempoEspera = agora.getTime() - operacao.dataOperacao.getTime();
      
      if (tempoEspera > this.TIMEOUT_TRANSMISSAO) {
        operacao.status = 'erro';
        operacao.erro = 'Timeout - Operação muito antiga para transmitir';
        console.error(`❌ Timeout na operação ${operacao.chaveNFe}`);
        return;
      }

      // Tentar autorizar na SEFAZ
      const resultado = await this.sefazClient.autorizarNFCe(operacao.xmlAssinado, operacao.chaveNFe);

      if (resultado.success) {
        operacao.status = 'transmitida';
        console.log(`✅ Operação ${operacao.chaveNFe} transmitida com sucesso`);
      } else {
        if (operacao.tentativas >= this.MAX_TENTATIVAS) {
          operacao.status = 'erro';
          operacao.erro = `Máximo de tentativas excedido: ${resultado.motivoStatus}`;
          console.error(`❌ Falha definitiva na operação ${operacao.chaveNFe}: ${resultado.motivoStatus}`);
        } else {
          console.warn(`⚠️ Tentativa ${operacao.tentativas} falhou para ${operacao.chaveNFe}: ${resultado.motivoStatus}`);
        }
      }

    } catch (error) {
      operacao.erro = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (operacao.tentativas >= this.MAX_TENTATIVAS) {
        operacao.status = 'erro';
        console.error(`❌ Erro definitivo na operação ${operacao.chaveNFe}:`, error);
      } else {
        console.warn(`⚠️ Erro na tentativa ${operacao.tentativas} para ${operacao.chaveNFe}:`, error);
      }
    }

    // Atualizar no mapa
    this.operacoesPendentes.set(operacao.chaveNFe, operacao);
  }

  /**
   * Obter status atual da contingência
   */
  public getStatusContingencia(): StatusContingencia {
    return {
      ...this.statusContingencia,
      operacoesPendentes: this.operacoesPendentes.size
    };
  }

  /**
   * Obter lista de operações pendentes
   */
  public getOperacoesPendentes(): OperacaoContingencia[] {
    return Array.from(this.operacoesPendentes.values())
      .sort((a, b) => a.dataOperacao.getTime() - b.dataOperacao.getTime());
  }

  /**
   * Cancelar operação pendente
   */
  public cancelarOperacao(chave: string): boolean {
    const operacao = this.operacoesPendentes.get(chave);
    
    if (operacao && operacao.status === 'pendente') {
      operacao.status = 'cancelada';
      this.operacoesPendentes.set(chave, operacao);
      this.statusContingencia.operacoesPendentes = this.getOperacoesPendentesCount();
      
      console.log(`❌ Operação ${chave} cancelada`);
      return true;
    }
    
    return false;
  }

  /**
   * Limpar operações já transmitidas ou com erro definitivo
   */
  public limparOperacoesTransmitidas(): void {
    const chavesParaRemover: string[] = [];
    
    for (const [chave, operacao] of this.operacoesPendentes.entries()) {
      if (operacao.status === 'transmitida' || operacao.status === 'erro' || operacao.status === 'cancelada') {
        chavesParaRemover.push(chave);
      }
    }

    for (const chave of chavesParaRemover) {
      this.operacoesPendentes.delete(chave);
    }

    this.statusContingencia.operacoesPendentes = this.operacoesPendentes.size;
    
    if (chavesParaRemover.length > 0) {
      console.log(`🧹 Limpas ${chavesParaRemover.length} operação(ões) da fila`);
    }
  }

  /**
   * Forçar transmissão manual
   */
  public async forcerTransmissao(): Promise<void> {
    console.log('🔄 Forçando transmissão manual...');
    await this.transmitirOperacoesPendentes();
  }

  /**
   * Inicializar verificação periódica do SEFAZ
   */
  private inicializarVerificacaoPeriodica(): void {
    // Verificar status inicial
    setTimeout(() => {
      this.verificarStatusSEFAZ();
    }, 5000);
  }

  /**
   * Agendar próxima verificação do SEFAZ
   */
  private agendarProximaVerificacao(): void {
    if (this.intervalVerificacao) {
      clearTimeout(this.intervalVerificacao);
    }

    const proximaVerificacao = new Date(Date.now() + this.INTERVALO_VERIFICACAO);
    this.statusContingencia.proximaVerificacao = proximaVerificacao;

    this.intervalVerificacao = setTimeout(() => {
      this.verificarStatusSEFAZ();
    }, this.INTERVALO_VERIFICACAO);

    console.log(`⏰ Próxima verificação SEFAZ em: ${proximaVerificacao.toLocaleTimeString()}`);
  }

  /**
   * Gerar ID único para operação
   */
  private gerarIdOperacao(): string {
    return `CTG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Contar operações pendentes reais
   */
  private getOperacoesPendentesCount(): number {
    return Array.from(this.operacoesPendentes.values())
      .filter(op => op.status === 'pendente').length;
  }

  /**
   * Utilitário para aguardar
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destruir instância e limpar timers
   */
  public destruir(): void {
    if (this.intervalVerificacao) {
      clearTimeout(this.intervalVerificacao);
    }
    
    this.operacoesPendentes.clear();
    console.log('🔄 Sistema de contingência finalizado');
  }

  /**
   * Exportar dados de contingência para backup
   */
  public exportarDados(): {
    status: StatusContingencia;
    operacoes: OperacaoContingencia[];
  } {
    return {
      status: this.getStatusContingencia(),
      operacoes: this.getOperacoesPendentes()
    };
  }

  /**
   * Importar dados de contingência do backup
   */
  public importarDados(dados: {
    status: StatusContingencia;
    operacoes: OperacaoContingencia[];
  }): void {
    this.statusContingencia = dados.status;
    
    this.operacoesPendentes.clear();
    for (const operacao of dados.operacoes) {
      this.operacoesPendentes.set(operacao.chaveNFe, operacao);
    }

    console.log(`📥 Importados dados: ${dados.operacoes.length} operação(ões) de contingência`);
  }
}