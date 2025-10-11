# Jornadas do Usuário - PDV Touch

## 🗺️ Fluxos Críticos Mapeados

### **1. Jornada: Login do Operador**
```
[Início] → [Tela PIN] → [Digitar] → [Validar] → [Dashboard]
   ⏱️      ⏱️ 3-5s      ⏱️ 2-3s     ⏱️ 1s      ✅

⚠️  Gargalos identificados:
- PIN input pequeno (dificulta digitação rápida)
- Sem indicação visual durante validação
- Erro não específico (só "PIN inválido")
```

### **2. Jornada: Venda Simples (Produto Fixo)**
```
[Dashboard] → [Venda] → [Categoria] → [Produto] → [Quantidade] → [Finalizar]
    ⏱️ 1s      ⏱️ 1s      ⏱️ 1-2s       ⏱️ 1s       ⏱️ 2-3s        ⏱️ 3-5s

⚠️  Gargalos identificados:
- Muitos cliques para produto comum
- Quantidade padrão não é 1
- Finalização tem muitas telas
```

### **3. Jornada: Venda por Peso**
```
[Dashboard] → [Venda] → [Por Peso] → [Produto] → [Pesar] → [Confirmar] → [Finalizar]
    ⏱️ 1s      ⏱️ 1s      ⏱️ 1-2s       ⏱️ 1s      ⏱️ 5-10s    ⏱️ 2s        ⏱️ 3-5s

⚠️  Gargalos identificados:
- Pesagem manual demorada
- Falta integração automática balança
- Muitas confirmações necessárias
```

### **4. Jornada: Cancelar Venda**
```
[Em Venda] → [Cancelar] → [Confirmar] → [Dashboard]
    ⏱️         ⏱️ 1-2s      ⏱️ 2s         ✅

⚠️  Gargalos identificados:
- Botão cancelar pode estar escondido
- Confirmação não é clara sobre consequências
```

### **5. Jornada: Trocar Operador**
```
[Qualquer tela] → [Logout] → [Confirmar] → [PIN novo] → [Dashboard]
      ⏱️             ⏱️ 1s      ⏱️ 1s         ⏱️ 3-5s      ✅

⚠️  Gargalos identificados:
- Logout não está sempre visível
- Perde contexto da venda em andamento
- Sem "troca rápida" de operador
```

---

## 📊 Análise de Eficiência

### **Tempo Médio por Operação:**
| Operação | Tempo Atual | Tempo Ideal | Gap |
|----------|-------------|-------------|-----|
| Login | 6-8s | 3-4s | **-50%** |
| Venda simples | 8-12s | 5-7s | **-40%** |
| Venda peso | 15-25s | 10-15s | **-30%** |
| Cancelamento | 3-5s | 2-3s | -20% |
| Troca operador | 6-10s | 4-6s | -30% |

### **Toques por Operação:**
| Operação | Toques Atuais | Toques Ideais | Otimização |
|----------|---------------|---------------|------------|
| Login | 4-6 | 4 | PIN pad visual |
| Venda simples | 6-8 | 3-4 | Quick buttons |
| Adicionar qty | 3-4 | 1-2 | +/- diretos |
| Finalizar | 4-6 | 2-3 | Menos telas |

---

## 🎯 Oportunidades de Melhoria

### **Quick Wins (Implementação < 1 dia):**

1. **Botões Maiores**
   ```css
   .btn-touch { min-height: 56px; min-width: 120px; }
   ```

2. **Quantidade Padrão = 1**
   ```tsx
   const [quickQty, setQuickQty] = useState('1') // era '0'
   ```

3. **Loading Visual**
   ```tsx
   {loading && <div className="spinner">Processando...</div>}
   ```

### **Melhorias Médias (1-3 dias):**

4. **PIN Pad Visual**
   - Teclado numérico grande para touch
   - Feedback visual para cada dígito

5. **Quick Actions Toolbar**
   ```tsx
   <QuickActions>
     <QuickButton product="Refrigerante" />
     <QuickButton product="Água" />
     <QuickButton category="Por Peso" />
   </QuickActions>
   ```

6. **Carrinho Lateral Fixo**
   - Sempre visível durante venda
   - Totalizador em destaque
   - Botões +/- por item

### **Melhorias Complexas (1-2 semanas):**

7. **Shortcuts de Teclado**
   ```tsx
   useKeyboard({
     'F2': () => navigateToSale(),
     'F9': () => finalizeSale(),
     'Escape': () => cancelAction()
   })
   ```

8. **Integração Balança Automática**
   - WebSerial API
   - Leitura automática peso
   - Menos intervenção manual

9. **Context Preservation**
   - Salvar estado da venda ao trocar operador
   - Recovery automático de sessões
   - Multi-operador simultâneo

---

## 🚦 Priorização por Impacto

### **🔥 Crítico (Implementar Primeiro):**
- ✅ Botões touch-friendly (56px+)
- ✅ Quantidade padrão = 1
- ✅ Loading states visuais
- ✅ Confirmações mais claras

### **⚡ Alto Impacto:**
- PIN pad visual otimizado
- Quick actions para produtos frequentes
- Carrinho lateral fixo
- Shortcuts básicos (F2, F9, Esc)

### **📈 Médio Impacto:**
- Breadcrumbs navegação
- Undo/Redo actions
- Context preservation
- Modo alto contraste

### **🔮 Futuro:**
- Biometria Windows Hello
- Gestos avançados (swipe/pinch)
- Voice commands
- IA para sugestões

---

## 🧪 Validação com Usuários

### **Teste A/B Propostos:**

1. **PIN Input:**
   - A: Input tradicional (atual)
   - B: PIN pad visual touch

2. **Botões Produto:**
   - A: Botões 42px (atual) 
   - B: Botões 56px + ícones

3. **Fluxo Finalização:**
   - A: Multi-step (atual)
   - B: Single-step otimizado

### **Métricas de Validação:**
- ⏱️ **Tempo por operação** (objetivo: -30%)
- 🎯 **Taxa de erro** (objetivo: <3%)
- 😊 **Satisfação** (objetivo: >8/10)
- 📚 **Curva aprendizado** (objetivo: <2h)

### **Cenários de Teste:**
1. **Operador experiente**: Foco em velocidade
2. **Operador novo**: Foco em simplicidade  
3. **Rush hour**: Foco em eficiência
4. **Problemas/exceções**: Foco em recovery