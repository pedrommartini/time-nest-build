// scratch/test_nlp_runner.mjs

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\b(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|para|pro|pra|com)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNLPInput(text, referenceDate = new Date("2026-08-27T12:00:00Z")) {
  let cleanText = text;
  
  const timeRegexes = [
    /\b(?:às|as)\s+(\d{1,2})(?:[:h](\d{2}))?(?:\s*(?:h|horas|m|min)?)?\b/i,
    /\b(\d{1,2})h(\d{2})?\b/i,
    /\b(\d{1,2}):(\d{2})\b/i,
    /\b(\d{1,2})\s*h(?:oras?)?\b/i,
  ];
  
  const dateRegexes = [
    /(?:^|\s|\b)(?:para\s+)?amanh[aã](?:\b|\s|$)/i,
    /(?:^|\s|\b)(?:para\s+)?hoje(?:\b|\s|$)/i,
    /\b(?:na\s+)?(?:próxima\s+)?(segunda|terça|quarta|quinta|sexta|sábado|domingo)(?:-feira)?\b/i
  ];

  let timeMatch = null;
  for (const r of timeRegexes) {
    const match = cleanText.match(r);
    if (match) { timeMatch = match; break; }
  }

  let dateMatch = null;
  for (const r of dateRegexes) {
    const match = cleanText.match(r);
    if (match) { dateMatch = match; break; }
  }

  let type = 'task_flexible';
  if (timeMatch) type = 'event';
  else if (dateMatch) type = 'task_deadline';

  return { type, text, hasTime: !!timeMatch, hasDate: !!dateMatch };
}

console.log("=================================================");
console.log("🧪 TESTES DO PARSER DE LINGUAGEM NATURAL (NLP)");
console.log("=================================================");

const r1 = parseNLPInput("Reunião com equipe amanhã às 15:30");
console.log(`Input 1: "${r1.text}" -> Tipo: ${r1.type} (Esperado: event)`);

const r2 = parseNLPInput("Pagar boleto da luz amanhã");
console.log(`Input 2: "${r2.text}" -> Tipo: ${r2.type} (Esperado: task_deadline)`);

const r3 = parseNLPInput("Comprar frutas no mercado");
console.log(`Input 3: "${r3.text}" -> Tipo: ${r3.type} (Esperado: task_flexible)`);

if (r1.type === 'event' && r2.type === 'task_deadline' && r3.type === 'task_flexible') {
  console.log("\n✅ TODOS OS TESTES DE NLP PASSARAM COM SUCESSO!");
} else {
  console.error("\n❌ Falha em um dos testes de NLP");
  process.exit(1);
}
