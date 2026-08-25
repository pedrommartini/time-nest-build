# TimeNest — Sistema de Alarmes em Tela Cheia
## Resumo do brainstorm + referência funcional e visual para o Antigravity

## 1. Objetivo

O sistema de alarmes do TimeNest deve interromper o usuário em tela cheia de forma comparável a um alarme nativo de celular, mas respeitando a identidade do app e o público com TDAH.

O alarme não deve ser apenas uma notificação maior. Ele deve funcionar como uma transição de contexto: chamar atenção, mostrar de forma instantânea o que precisa acontecer e oferecer poucas ações objetivas.

Princípio central:

> Interromper o suficiente para funcionar, sem transformar organização em ansiedade.

O foco é reduzir a fricção entre “eu sei que tenho algo” e “eu realmente comecei / estou indo fazer”.

---

## 2. Princípios de UX

- Tela cheia.
- Pouquíssima informação.
- Nome do evento/tarefa como elemento mais importante.
- Horário ou duração imediatamente abaixo do título.
- Tipografia grande, bold e chamativa.
- Ação principal extremamente evidente.
- Ações secundárias simples.
- Sem “primeiro passo” automático: essa ideia foi descartada.
- Sem navbar, timeline ou elementos normais do app durante o alarme.
- O alarme deve parecer uma camada especial do TimeNest.
- A ação para parar o alarme deve já representar uma intenção concreta, por exemplo:
  - “Vou me preparar agora”
  - “Começar foco agora”
  - “Estou saindo agora”
- Evitar botão genérico “Parar alarme” como ação principal.
- Evitar excesso de detalhes.
- Evitar vermelho no fluxo normal.
- Vermelho/laranja ficam reservados para urgência real.

---

## 3. Hierarquia visual aprovada

A referência visual aprovada usa:

1. badge superior pequeno:
   - “EM 15 MIN”
   - “AGORA”
   - “URGENTE”
   - “ADIAR”
   - “BLOQUEIO”

2. título em fonte muito grande e bold:
   - “Jantar com Maria”
   - “Editar vídeo”
   - “Consulta médica”

3. horário ou duração grande logo abaixo:
   - “19:30”
   - “45 min”
   - “14:30”

4. metadado discreto:
   - Evento · Google Agenda
   - Tarefa · Projeto Trabalho

5. CTA principal forte:
   - “Vou me preparar agora”
   - “Começar foco agora”
   - “Estou saindo agora”

6. ação secundária:
   - “+5 min”

7. ação terciária:
   - “Dispensar”
   - “Pular por enquanto”
   - “Não posso ir”

---

## 4. Efeito visual principal

O elemento visual de atenção deve ser radial, suave e expansivo.

Direção aprovada:
- círculos concêntricos muito suaves;
- halo radial em lavanda;
- brilho concentrado atrás do título e horário;
- fundo off-white/papel muito leve;
- poucas partículas ou nenhuma;
- sem ilustração decorativa;
- sem skeuomorphism pesado.

Esse radial pode animar de forma pulsante:
- expansão lenta;
- opacidade baixa;
- movimento respiratório;
- amplitude um pouco maior em alarmes críticos.

A animação nunca deve atrapalhar a leitura.

---

## 5. Tipos principais de alarme

### 5.1 Pré-evento — 15 minutos antes

Objetivo:
- avisar que a transição precisa começar;
- preparar o usuário antes do horário real.

Exemplo visual:
- badge: “EM 15 MIN”
- título: “Jantar com Maria”
- horário: “19:30”
- metadado: “Evento · Google Agenda”
- CTA: “Vou me preparar agora”
- secundário: “+5 min”
- terciário: “Dispensar”

O alarme para quando o usuário confirma a intenção.

### 5.2 Tarefa — começa agora

Objetivo:
- transformar uma tarefa agendada em ação imediata.

Exemplo:
- badge: “AGORA”
- título: “Editar vídeo”
- duração: “45 min”
- metadado: “Tarefa · Projeto Trabalho”
- CTA: “Começar foco agora”
- secundário: “+5 min”
- terciário: “Pular por enquanto”

O CTA principal deve:
- parar o alarme;
- marcar a tarefa como iniciada;
- iniciar ou preparar o timer de foco;
- levar o usuário ao estado de execução da tarefa.

### 5.3 Alarme crítico

Usado apenas para compromissos marcados como realmente importantes.

Exemplos:
- consulta;
- voo;
- entrevista;
- reunião de alto impacto;
- compromisso que exige saída imediata.

Direção visual:
- manter a estrutura normal;
- trocar lavanda por vermelho/laranja;
- aumentar contraste;
- radial mais forte;
- badge “URGENTE”.

Exemplo:
- “Consulta médica”
- “14:30”
- CTA: “Estou saindo agora”
- secundário: “+5 min”
- terciário: “Não posso ir”

Não transformar todo alarme em crítico.

### 5.4 Snooze / Adiar

Ao escolher adiar, abrir uma tela dedicada.

Exemplo:
- badge: “ADIAR”
- título: “Precisa de mais tempo?”
- contexto: “Jantar com Maria”
- metadado: “Evento · 19:30”

Opções:
- +5 min
- +10 min
- +15 min
- Quando eu terminar a tarefa atual

A opção “Quando eu terminar a tarefa atual” é especialmente importante para TDAH, pois conecta o alarme à atividade em andamento.

O sistema deve evitar criar snooze infinito sem consciência de consequência.

Se o adiamento começar a ameaçar o próximo evento, pode exibir uma mensagem curta de risco.

### 5.5 Tela “não consegui começar”

Tela acionada quando o usuário não consegue iniciar uma tarefa.

Ela não deve dar sermão nem sugerir genericamente “tente de novo”.

Pergunta:
> O que está dificultando?

Contexto:
- tarefa atual;
- duração.

Opções:
- Não sei por onde começar
- Estou terminando outra coisa
- Estou cansado
- Me distraí

Cada opção deve gerar uma resposta funcional futura, não apenas fechar a tela.

Possíveis comportamentos:
- “Não sei por onde começar” → oferecer quebrar a tarefa ou mostrar uma ação mínima.
- “Estou terminando outra coisa” → oferecer adiar por alguns minutos ou até o fim da atividade atual.
- “Estou cansado” → oferecer reduzir a sessão, reagendar ou trocar por uma tarefa menor.
- “Me distraí” → retornar ao modo foco com redução de distrações.

A resposta exata pode ser definida pelo Antigravity na implementação do fluxo.

---

## 6. Diferença entre Evento e Tarefa

Evento:
- tem horário definido;
- CTA deve representar deslocamento, preparação ou presença.

Exemplos:
- “Vou me preparar agora”
- “Estou indo”
- “Estou saindo agora”

Tarefa:
- é algo que o usuário precisa executar;
- CTA deve iniciar a execução.

Exemplos:
- “Começar foco agora”
- “Começar tarefa”

O CTA deve sempre ter significado contextual.

---

## 7. Estados de urgência

### Preparar
- lavanda;
- 15 ou 5 minutos antes;
- animação radial lenta.

### Agora
- lavanda mais intensa;
- contraste maior;
- pulso um pouco mais perceptível.

### Urgente
- laranja/vermelho;
- pulso mais forte;
- vibração mais intensa;
- som mais insistente.

Evitar usar vermelho apenas porque chegou o horário.

---

## 8. Som

Direção sonora do TimeNest:
- orgânico;
- tátil;
- mecânico;
- lúdico;
- sem estética sci-fi;
- sem beep eletrônico genérico;
- sem ticking.

Referências conceituais:
- clique de caneta;
- papel;
- madeira;
- pequeno sino/chime físico;
- percussão orgânica curta.

Exemplo de assinatura:
clique físico → movimento de papel → chime curto.

O som deve:
- chamar atenção;
- ser curto;
- poder repetir em intervalos;
- crescer de intensidade se o usuário não responder;
- ter ataque rápido.

---

## 9. Progressão sonora

Não começar necessariamente no volume máximo.

Sugestão:
- primeiros segundos: volume moderado;
- após alguns segundos: intensidade maior;
- sem resposta prolongada: padrão mais insistente.

Para crítico:
- intensidade inicial maior;
- repetição mais frequente;
- vibração mais forte.

O usuário deve poder personalizar isso futuramente.

---

## 10. Vibração

Sugestões de padrão:

Evento normal:
buzz — pausa — buzz

Tarefa:
buzz buzz — pausa

Crítico:
buzz — buzz — buzz

Não depender apenas de som.

---

## 11. Ação principal para parar o alarme

Esse é um dos conceitos centrais.

A ação que interrompe o alarme deve já representar a próxima intenção.

Evitar:
- “OK”
- “Parar”
- “Fechar”

Preferir:
- “Vou me preparar agora”
- “Começar foco agora”
- “Estou saindo agora”

Ao tocar:
- interromper som;
- interromper vibração;
- salvar a resposta;
- atualizar estado da tarefa/evento;
- executar a ação correspondente.

---

## 12. Snooze

O botão “+5 min” pode existir na tela principal como ação rápida.

Ao tocar, pode:
- adiar imediatamente 5 minutos;
ou
- abrir a tela completa de adiar.

O Antigravity pode decidir a melhor interação.

A tela detalhada deve permitir:
- 5 min;
- 10 min;
- 15 min;
- fim da tarefa atual.

---

## 13. Interrupção de tarefa em andamento

Caso o usuário esteja em foco e outro evento esteja próximo:

Exemplo:
“Jantar com Maria começa em 15 min”

O sistema pode oferecer:
- encerrar foco e preparar;
- +5 min;
- permanecer por enquanto.

O TimeNest deve preservar o contexto da tarefa interrompida para facilitar retomada posterior.

---

## 14. Confirmação de início opcional

Uma funcionalidade futura interessante:

Depois que o usuário toca em “Começar foco agora”, o app pode verificar alguns minutos depois:

> Você conseguiu começar?

Ações:
- Sim
- Ainda não

Se “Ainda não”:
abrir o fluxo “O que está dificultando?”

Esse comportamento deve ser configurável para não se tornar irritante.

---

## 15. Acessibilidade / TDAH

Regras:
- no máximo uma ação primária;
- no máximo 1–2 ações secundárias visíveis;
- alto contraste de texto;
- tipografia grande;
- sem textos longos;
- sem elementos decorativos desnecessários;
- sem animações rápidas;
- suporte a “reduzir movimento”;
- suporte a vibração;
- suporte a volume configurável;
- evitar linguagem culpabilizadora.

Não usar:
- “Você falhou”
- “Você está atrasado de novo”

Preferir:
- “Precisa de mais tempo?”
- “O que está dificultando?”
- “Vamos tentar de outra forma.”

---

## 16. Dark mode

O sistema deve ter versão escura, mantendo:
- mesma hierarquia;
- fundo carvão/roxo muito escuro;
- radial colorido;
- contraste alto;
- CTA forte.

Não inverter simplesmente todas as cores.

---

## 17. Relação com projetos

Se a tarefa estiver em um projeto, mostrar pequeno contexto:

“Tarefa · Projeto Trabalho”

Projeto é informação secundária.

O título da tarefa continua sendo o elemento dominante.

---

## 18. Referências visuais incluídas

A pasta `/imagens` contém:

- `00_referencia_visual_aprovada.png` — referência principal da composição e estilo.
- `01_alarme_tarefa_comeca_agora.png` — tarefa começando agora.
- `02_pre_evento_15min.png` — evento 15 minutos antes.
- `03_alarme_critico.png` — estado crítico.
- `04_snooze_adiar.png` — tela de adiamento.
- `05_nao_consegui_comecar.png` — fluxo de bloqueio / dificuldade de iniciar.

As imagens devem ser usadas como referência de direção visual, não como pixel-perfect obrigatório.

---

## 19. Codebase atual

TimeNest:
- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Capacitor
- Google Auth

Views:
- TimelineView.tsx
- OrganizeView.tsx
- FocusView.tsx
- ProfileView.tsx
- OnboardingView.tsx

Componentes relevantes:
- SmartInputOverlay.tsx
- EventDetailDrawer.tsx
- TimelineEvent.tsx
- AlarmOverlay.tsx
- ActiveEventPill.tsx

App:
- src/App.tsx

IMPORTANTE:
A implementação técnica do sistema de alarmes deve ser escolhida pelo Antigravity.
Esta documentação define comportamento, UX, visual e regras do produto, não obriga uma arquitetura específica.

---

## 20. Entrega esperada do Antigravity

Antes de implementar, o Antigravity deve criar um plano contemplando:

- estados do AlarmOverlay;
- diferença tarefa/evento;
- pré-evento;
- alarme agora;
- crítico;
- snooze;
- bloqueio;
- comportamento sonoro;
- vibração;
- integração com Capacitor;
- tela cheia;
- permissões Android;
- foreground/background;
- persistência do estado do alarme;
- retomada ao abrir o app;
- animações;
- acessibilidade;
- testes.

O plano deve preservar a referência visual aprovada e propor a melhor solução técnica compatível com a codebase atual.
