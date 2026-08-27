// scratch/run_unit_tests.mjs
// Lightweight Node unit test runner for Time Nest

function timeStringToMinutes(time) {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calculateFreeIntervals(events, targetDate, safetyMarginMinutes = 0, dayStart = '00:00', dayEnd = '24:00') {
  const dayEvents = events
    .filter(e => e.date === targetDate)
    .sort((a, b) => timeStringToMinutes(a.start) - timeStringToMinutes(b.start));

  const intervals = [];
  let currentStart = timeStringToMinutes(dayStart);
  const endOfDay = timeStringToMinutes(dayEnd);

  for (const event of dayEvents) {
    const eventStart = timeStringToMinutes(event.start);
    const eventEnd = Math.max(eventStart + 15, timeStringToMinutes(event.end));
    
    if (eventStart > currentStart) {
      const gross = eventStart - currentStart;
      const usable = Math.max(0, gross - safetyMarginMinutes);
      intervals.push({
        start: minutesToTimeString(currentStart),
        end: event.start,
        grossMinutes: gross,
        usableMinutes: usable
      });
    }
    
    if (eventEnd > currentStart) {
      currentStart = eventEnd;
    }
  }

  if (currentStart < endOfDay) {
    const gross = endOfDay - currentStart;
    const usable = Math.max(0, gross - safetyMarginMinutes);
    intervals.push({
      start: minutesToTimeString(currentStart),
      end: dayEnd,
      grossMinutes: gross,
      usableMinutes: usable
    });
  }

  return intervals.filter(i => i.grossMinutes >= 15);
}

console.log("=================================================");
console.log("🧪 EXECUTANDO TESTES UNITÁRIOS DA FASE 3: TIMELINE");
console.log("=================================================");

const today = "2026-08-27";
let passed = 0;
let failed = 0;

function assertTest(name, condition) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${name}`);
    failed++;
  }
}

// Teste 1: Intervalo Livre com Margem de Segurança
const events1 = [
  { id: '1', title: 'Reunião', start: '10:00', end: '11:00', date: today },
  { id: '2', title: 'Almoço', start: '12:30', end: '13:30', date: today }
];
const gaps1 = calculateFreeIntervals(events1, today, 15, '08:00', '18:00');
assertTest("Gap entre 11:00 e 12:30 é de 90min brutos e 75min úteis", 
  gaps1.some(g => g.start === '11:00' && g.grossMinutes === 90 && g.usableMinutes === 75));

// Teste 2: Eventos consecutivos sem gap
const events2 = [
  { id: '1', title: 'A', start: '10:00', end: '11:00', date: today },
  { id: '2', title: 'B', start: '11:00', end: '12:00', date: today }
];
const gaps2 = calculateFreeIntervals(events2, today, 10, '10:00', '12:00');
assertTest("Eventos colados (10:00-11:00 e 11:00-12:00) resultam em 0 gaps", gaps2.length === 0);

// Teste 3: Limites de sono respeitados (07:00 as 23:00)
const emptyEvents = [];
const gaps3 = calculateFreeIntervals(emptyEvents, today, 0, '07:00', '23:00');
assertTest("Dia livre respeita limites de sono (07:00 -> 23:00 = 16h)", 
  gaps3.length === 1 && gaps3[0].start === '07:00' && gaps3[0].end === '23:00' && gaps3[0].usableMinutes === 960);

// Teste 4: Conversão de horários bidirecional
const mins = timeStringToMinutes("15:45");
assertTest("Conversão 15:45 -> 945 minutos", mins === 945);
assertTest("Conversão 945 minutos -> 15:45", minutesToTimeString(945) === "15:45");

console.log(`\nResultado: ${passed} passaram, ${failed} falharam.`);
if (failed > 0) process.exit(1);
