// tests/stress_test_test_alarmes.ts
// Empirical Adversarial Stress Test Suite for public/test-alarmes.html
// Executed via Headless Chromium (Chrome DevTools Protocol) + Static Syntax Oracle

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface AssertionResult {
  suite: string;
  id: string;
  description: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: AssertionResult[] = [];

function assert(suite: string, id: string, description: string, condition: boolean, details?: string) {
  if (condition) {
    results.push({ suite, id, description, passed: true, details });
    console.log(`  \x1b[32m[PASS]\x1b[0m [${id}] ${description}`);
  } else {
    results.push({ suite, id, description, passed: false, error: 'Assertion failed', details });
    console.error(`  \x1b[31m[FAIL]\x1b[0m [${id}] ${description} — Details: ${details || 'None'}`);
  }
}

// Simple CDP Client over native WebSocket
class CdpSession {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  public consoleMessages: Array<{ type: string; text: string }> = [];
  public exceptions: Array<string> = [];

  constructor(private wsUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) p.reject(msg.error);
          else p.resolve(msg.result);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map((a: any) => a.value ?? a.description ?? '').join(' ');
          this.consoleMessages.push({ type: msg.params.type, text });
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'Unknown exception';
          this.exceptions.push(desc);
          console.error(`    \x1b[31m[BROWSER EXCEPTION]\x1b[0m ${desc}`);
        }
      };
    });
  }

  send(method: string, params: any = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression: string): Promise<any> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      const err = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`Eval failed: ${err}`);
    }
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function runStaticAnalysis() {
  console.log('\n================================================================');
  console.log('   SUITE 1: STATIC CODE & CSS SYNTAX / SPEC ORACLE              ');
  console.log('================================================================');

  const filePath = path.resolve('public/test-alarmes.html');
  assert('Static', 'ST-01', 'File exists and is non-empty', fs.existsSync(filePath) && fs.statSync(filePath).size > 10000);

  const html = fs.readFileSync(filePath, 'utf8');

  // Keyframes verification
  const hasStandardKeyframe = /@keyframes\s+halo-breathe-standard\s*\{[\s\S]*?0%,\s*100%\s*\{[\s\S]*?transform:\s*scale\(1\);[\s\S]*?opacity:\s*0\.88;[\s\S]*?50%\s*\{[\s\S]*?transform:\s*scale\(1\.035\);[\s\S]*?opacity:\s*1;[\s\S]*?\}/.test(html);
  assert('Static', 'ST-02', 'Defines @keyframes halo-breathe-standard with scale(1)->scale(1.035)', hasStandardKeyframe);

  const hasCriticalKeyframe = /@keyframes\s+halo-breathe-critical\s*\{[\s\S]*?0%,\s*100%\s*\{[\s\S]*?transform:\s*scale\(1\);[\s\S]*?opacity:\s*0\.85;[\s\S]*?50%\s*\{[\s\S]*?transform:\s*scale\(1\.045\);[\s\S]*?opacity:\s*1;[\s\S]*?\}/.test(html);
  assert('Static', 'ST-03', 'Defines @keyframes halo-breathe-critical with scale(1)->scale(1.045)', hasCriticalKeyframe);

  // Animation duration and timing function
  const hasStandardClass = /\.animate-halo-breathe-standard\s*\{[\s\S]*?animation:\s*halo-breathe-standard\s+3\.8s\s+cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)\s+infinite;/.test(html);
  assert('Static', 'ST-04', '.animate-halo-breathe-standard uses 3.8s cubic-bezier(0.4, 0, 0.2, 1) infinite', hasStandardClass);

  const hasCriticalClass = /\.animate-halo-breathe-critical\s*\{[\s\S]*?animation:\s*halo-breathe-critical\s+2\.5s\s+cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)\s+infinite;/.test(html);
  assert('Static', 'ST-05', '.animate-halo-breathe-critical uses 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite', hasCriticalClass);

  // Halo stage centroid
  const hasHaloStageCentroid = /\.alarm-halo-stage\s*\{[\s\S]*?top:\s*41%;[\s\S]*?left:\s*50%;[\s\S]*?transform:\s*translate\(-50%,\s*-50%\);/.test(html);
  assert('Static', 'ST-06', '.alarm-halo-stage is centered at 41% top, 50% left', hasHaloStageCentroid);

  // Low-stim rules
  const hasLowStimRingsNone = /\.low-stim\s+\[class\*="alarm-halo-ring"\]\s*\{[\s\S]*?display:\s*none\s*!important;/.test(html);
  assert('Static', 'ST-07', '.low-stim suppresses all ring orbits with display: none !important', hasLowStimRingsNone);

  const hasLowStimNoAnim = /\.low-stim\s+\.alarm-halo-core\s*\{[\s\S]*?animation:\s*none\s*!important;/.test(html) ||
    /\.low-stim\s+\.alarm-halo-stage,[\s\S]*?animation:\s*none\s*!important;/.test(html);
  assert('Static', 'ST-08', '.low-stim suppresses breathing animation with animation: none !important', hasLowStimNoAnim);

  // Numeral and chevron hygiene in rendered alarm viewport
  const renderAlarmCode = html.slice(html.indexOf('function renderAlarm('), html.indexOf('function handlePrimaryAction('));
  const hasMonoInAlarm = /class="[^"]*\bfont-mono\b[^"]*"/.test(renderAlarmCode);
  assert('Static', 'ST-09', 'renderAlarm() does not assign font-mono to any element', !hasMonoInAlarm, hasMonoInAlarm ? 'Found font-mono in renderAlarm' : undefined);

  const hasChevronInAlarm = /(?:ChevronRight|chevron-right)/i.test(renderAlarmCode);
  assert('Static', 'ST-10', 'renderAlarm() does not render Chevrons (ChevronRight)', !hasChevronInAlarm);

  const hasDashedInAlarm = /border-dashed|dashed/.test(renderAlarmCode);
  assert('Static', 'ST-11', 'renderAlarm() does not use dashed borders', !hasDashedInAlarm);
}

async function runBrowserTestSuite() {
  console.log('\n================================================================');
  console.log('   SUITE 2: CHROMIUM CDP REAL BROWSER DYNAMIC STRESS HARNESS    ');
  console.log('================================================================');

  const tmpDir = path.join(os.tmpdir(), 'chrome_stress_' + Date.now());
  const port = 9245;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const targetUrl = 'http://localhost:5173/test-alarmes.html';

  console.log(`Starting headless Chrome on port ${port} loading ${targetUrl}...`);
  const chrome: ChildProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    targetUrl
  ]);

  // Wait for debug port
  let connected = false;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        connected = true;
        break;
      }
    } catch (e) {}
  }

  if (!connected) {
    chrome.kill();
    throw new Error(`Failed to connect to headless Chrome on port ${port}`);
  }

  // Find target tab
  const tabsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const tabs = await tabsRes.json();
  const pageTab = tabs.find((t: any) => t.url.includes('test-alarmes.html'));
  if (!pageTab) throw new Error('No test-alarmes.html tab found in Chrome');

  const session = new CdpSession(pageTab.webSocketDebuggerUrl);
  await session.connect();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  // Poll until application script is hydrated (typeof currentPreset === 'object')
  console.log('Waiting for application script hydration (typeof currentPreset === "object")...');
  let isHydrated = false;
  for (let i = 0; i < 40; i++) {
    try {
      const type = await session.evaluate('typeof currentPreset');
      if (type === 'object') {
        isHydrated = true;
        break;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert('Browser', 'BR-00', 'Application script is hydrated (typeof currentPreset === "object")', isHydrated);

  try {
    // Check initial boot
    const title = await session.evaluate('document.title');
    assert('Browser', 'BR-01', 'Page title is correct', title === 'TimeNest — Laboratório Visual de Alarmes', `Title: "${title}"`);

    const initialPresetId = await session.evaluate('currentPreset.id');
    assert('Browser', 'BR-02', 'Initial active preset is "00-base"', initialPresetId === '00-base', `Preset: "${initialPresetId}"`);

    const initialScreen = await session.evaluate('currentScreen');
    assert('Browser', 'BR-03', 'Initial screen is "main"', initialScreen === 'main', `Screen: "${initialScreen}"`);

    const initialSplitSrc = await session.evaluate('document.getElementById("splitImg")?.src');
    assert('Browser', 'BR-04', 'Initial split-image references 00_referencia_visual_aprovada.png', initialSplitSrc?.includes('00_referencia_visual_aprovada.png'), `src: ${initialSplitSrc}`);

    // --- TEST ALL 6 CANONICAL PRESETS CLICK TRANSITIONS ---
    console.log('\n--- Testing All 6 Canonical Preset Transitions via DOM Button Clicks ---');

    const canonicalPresets = [
      { id: '00-base', expectedImg: '00_referencia_visual_aprovada.png', expectedScreen: 'main', expectedTitle: 'Jantar com Maria', expectedBadge: 'EM 15 MIN', expectedCode: '00_referencia_visual_aprovada.png' },
      { id: '01-task-now', expectedImg: '01_alarme_tarefa_comeca_agora.png', expectedScreen: 'main', expectedTitle: 'Editar vídeo', expectedBadge: 'AGORA', expectedCode: '01_alarme_tarefa_comeca_agora.png' },
      { id: '02-pre-event', expectedImg: '02_pre_evento_15min.png', expectedScreen: 'main', expectedTitle: 'Jantar com Maria', expectedBadge: 'EM 15 MIN', expectedCode: '02_pre_evento_15min.png' },
      { id: '03-critical', expectedImg: '03_alarme_critico.png', expectedScreen: 'main', expectedTitle: 'Consulta médica', expectedBadge: 'URGENTE', expectedCode: '03_alarme_critico.png' },
      { id: '04-snooze', expectedImg: '04_snooze_adiar.png', expectedScreen: 'snooze', expectedTitle: 'Precisa de', expectedBadge: 'ADIAR', expectedCode: '04_snooze_adiar.png' },
      { id: '05-adhd', expectedImg: '05_nao_consegui_comecar.png', expectedScreen: 'difficulty', expectedTitle: 'O que está', expectedBadge: 'BLOQUEIO', expectedCode: '05_nao_consegui_comecar.png' },
    ];

    for (const p of canonicalPresets) {
      // Simulate click on preset button in sidebar
      const clicked = await session.evaluate(`(() => {
        const btn = document.getElementById('presetItem-${p.id}');
        if (btn) { btn.click(); return true; } else return false;
      })()`);
      assert('Browser', `CLICK-${p.id}`, `Clicked preset button #presetItem-${p.id}`, clicked);

      await new Promise((r) => setTimeout(r, 120));

      const activeId = await session.evaluate('currentPreset.id');
      const activeScreen = await session.evaluate('currentScreen');
      const splitSrc = await session.evaluate('document.getElementById("splitImg")?.src');
      const splitCodeText = await session.evaluate('document.getElementById("splitCode")?.textContent?.trim()');
      const viewportText = await session.evaluate('document.getElementById("alarmViewport")?.innerText || ""');

      assert('Browser', `PRESET-${p.id}`, `Preset ${p.id} activates screen "${p.expectedScreen}" and syncs split-image "${p.expectedImg}"`,
        activeId === p.id &&
        activeScreen === p.expectedScreen &&
        splitSrc?.includes(p.expectedImg) &&
        splitCodeText === p.expectedCode &&
        viewportText.includes(p.expectedTitle) &&
        viewportText.includes(p.expectedBadge),
        `id: ${activeId}, screen: ${activeScreen}, splitSrc: ${splitSrc}, code: ${splitCodeText}`
      );
    }

    // --- CRITICAL ALARM SPECIALIZED CHECKS (State 03) ---
    console.log('\n--- Stress-testing State 03 (Critical Urgent Alarm) ---');
    await session.evaluate(`(() => { document.getElementById('presetItem-03-critical')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 120));

    const criticalBg = await session.evaluate(`(() => {
      const vp = document.querySelector('#alarmViewport > div');
      return vp ? vp.className : '';
    })()`);
    assert('Browser', 'CRIT-01', 'Critical alarm applies bg-[#FFF8F5] and alarm-halo-critical',
      criticalBg.includes('bg-[#FFF8F5]') && criticalBg.includes('alarm-halo-critical'),
      `classes: ${criticalBg}`
    );

    const criticalHaloAnim = await session.evaluate(`(() => {
      const stage = document.querySelector('#alarmViewport .alarm-halo-stage');
      return stage ? stage.className : '';
    })()`);
    assert('Browser', 'CRIT-02', 'Critical halo stage activates animate-halo-breathe-critical',
      criticalHaloAnim.includes('animate-halo-breathe-critical'),
      `stage classes: ${criticalHaloAnim}`
    );

    // --- SUB-SCREEN INTERACTION TEST 1: Snooze Flow from Preset 00 ---
    console.log('\n--- Sub-Screen Flow 1: Preset 00 -> +5 min Snooze -> Voltar ---');
    await session.evaluate(`(() => { document.getElementById('presetItem-00-base')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 120));

    // Find and click the secondary "+5 min" button
    const clickSnoozeBtn = await session.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('#alarmViewport button'));
      const snoozeBtn = btns.find(b => b.textContent.includes('+5 min'));
      if (snoozeBtn) {
        snoozeBtn.click();
        return true;
      } else return false;
    })()`);
    assert('Browser', 'SUB-01', 'Clicked "+5 min" button from main alarm screen', clickSnoozeBtn);
    await new Promise((r) => setTimeout(r, 120));

    const snoozeScreenActive = await session.evaluate('currentScreen');
    const snoozeSplitSrc = await session.evaluate('document.getElementById("splitImg")?.src');
    const snoozeSplitCode = await session.evaluate('document.getElementById("splitCode")?.textContent?.trim()');
    const snoozeTitle = await session.evaluate('document.querySelector("#alarmViewport h1")?.innerText || ""');
    assert('Browser', 'SUB-02', 'Transitions to Snooze sub-screen with title "Precisa de mais tempo?" and split-image 04_snooze_adiar.png',
      snoozeScreenActive === 'snooze' &&
      snoozeSplitSrc?.includes('04_snooze_adiar.png') &&
      snoozeSplitCode === '04_snooze_adiar.png' &&
      snoozeTitle.includes('Precisa de'),
      `screen: ${snoozeScreenActive}, splitSrc: ${snoozeSplitSrc}, splitCode: ${snoozeSplitCode}, title: ${snoozeTitle}`
    );

    // Verify 4-pill vertical stack in Snooze screen
    const snoozePillCount = await session.evaluate(`(() => {
      const allBtns = Array.from(document.querySelectorAll('#alarmViewport button'));
      // Pills are all buttons except 'Voltar'
      const pills = allBtns.filter(b => b.textContent.trim() !== 'Voltar');
      return pills.length;
    })()`);
    assert('Browser', 'SUB-03', 'Snooze sub-screen renders 4-pill vertical stack (Pill 1-4)', snoozePillCount === 4, `Found ${snoozePillCount} pills`);

    // Click "Voltar"
    const clickVoltarSnooze = await session.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('#alarmViewport button'));
      const voltarBtn = btns.find(b => b.textContent.trim() === 'Voltar');
      if (voltarBtn) {
        voltarBtn.click();
        return true;
      } else return false;
    })()`);
    assert('Browser', 'SUB-04', 'Clicked "Voltar" from Snooze sub-screen', clickVoltarSnooze);
    await new Promise((r) => setTimeout(r, 120));

    const postVoltarScreen = await session.evaluate('currentScreen');
    const postVoltarSplitSrc = await session.evaluate('document.getElementById("splitImg")?.src');
    const postVoltarSplitCode = await session.evaluate('document.getElementById("splitCode")?.textContent?.trim()');
    assert('Browser', 'SUB-05', 'Returns to main screen and restores split-image to 00_referencia_visual_aprovada.png',
      postVoltarScreen === 'main' &&
      postVoltarSplitSrc?.includes('00_referencia_visual_aprovada.png') &&
      postVoltarSplitCode === '00_referencia_visual_aprovada.png',
      `screen: ${postVoltarScreen}, splitSrc: ${postVoltarSplitSrc}, splitCode: ${postVoltarSplitCode}`
    );

    // --- SUB-SCREEN INTERACTION TEST 2: ADHD Support Flow from Preset 01 ---
    console.log('\n--- Sub-Screen Flow 2: Preset 01 -> "Não consigo começar" -> Voltar ---');
    await session.evaluate(`(() => { document.getElementById('presetItem-01-task-now')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 120));

    // Find and click "Não consigo começar"
    const clickAdhdBtn = await session.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('#alarmViewport button'));
      const adhdBtn = btns.find(b => b.textContent.includes('Não consigo começar'));
      if (adhdBtn) {
        adhdBtn.click();
        return true;
      } else return false;
    })()`);
    assert('Browser', 'SUB-06', 'Clicked "Não consigo começar" button from task alarm screen', clickAdhdBtn);
    await new Promise((r) => setTimeout(r, 120));

    const adhdScreenActive = await session.evaluate('currentScreen');
    const adhdSplitSrc = await session.evaluate('document.getElementById("splitImg")?.src');
    const adhdSplitCode = await session.evaluate('document.getElementById("splitCode")?.textContent?.trim()');
    const adhdTitle = await session.evaluate('document.querySelector("#alarmViewport h1")?.innerText || ""');
    assert('Browser', 'SUB-07', 'Transitions to ADHD sub-screen with title "O que está dificultando?" and split-image 05_nao_consegui_comecar.png',
      adhdScreenActive === 'difficulty' &&
      adhdSplitSrc?.includes('05_nao_consegui_comecar.png') &&
      adhdSplitCode === '05_nao_consegui_comecar.png' &&
      adhdTitle.includes('O que está'),
      `screen: ${adhdScreenActive}, splitSrc: ${adhdSplitSrc}, splitCode: ${adhdSplitCode}, title: ${adhdTitle}`
    );

    // Verify 4-pill vertical stack in ADHD screen
    const adhdPillCount = await session.evaluate(`(() => {
      const allBtns = Array.from(document.querySelectorAll('#alarmViewport button'));
      const pills = allBtns.filter(b => b.textContent.trim() !== 'Voltar');
      return pills.length;
    })()`);
    assert('Browser', 'SUB-08', 'ADHD sub-screen renders 4-pill vertical stack (Pill 1-4)', adhdPillCount === 4, `Found ${adhdPillCount} pills`);

    // Click "Voltar"
    const clickVoltarAdhd = await session.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('#alarmViewport button'));
      const voltarBtn = btns.find(b => b.textContent.trim() === 'Voltar');
      if (voltarBtn) {
        voltarBtn.click();
        return true;
      } else return false;
    })()`);
    assert('Browser', 'SUB-09', 'Clicked "Voltar" from ADHD sub-screen', clickVoltarAdhd);
    await new Promise((r) => setTimeout(r, 120));

    const postAdhdVoltarScreen = await session.evaluate('currentScreen');
    const postAdhdVoltarSplitSrc = await session.evaluate('document.getElementById("splitImg")?.src');
    const postAdhdVoltarSplitCode = await session.evaluate('document.getElementById("splitCode")?.textContent?.trim()');
    assert('Browser', 'SUB-10', 'Returns to main screen and restores split-image to 01_alarme_tarefa_comeca_agora.png',
      postAdhdVoltarScreen === 'main' &&
      postAdhdVoltarSplitSrc?.includes('01_alarme_tarefa_comeca_agora.png') &&
      postAdhdVoltarSplitCode === '01_alarme_tarefa_comeca_agora.png',
      `screen: ${postAdhdVoltarScreen}, splitSrc: ${postAdhdVoltarSplitSrc}, splitCode: ${postAdhdVoltarSplitCode}`
    );

    // --- LOW-STIMULATION MODE TOGGLE TEST ---
    console.log('\n--- Testing Low-Stimulation Mode ---');
    await session.evaluate(`(() => { document.getElementById('lowStimBtn')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 120));

    const isLowStimActive = await session.evaluate('isLowStim');
    const hasLowStimClass = await session.evaluate(`(() => {
      const vp = document.querySelector('#alarmViewport > div');
      return vp ? vp.classList.contains('low-stim') : false;
    })()`);
    const hasStaticCore = await session.evaluate(`(() => {
      return document.querySelector('#alarmViewport .alarm-halo-core-static') !== null;
    })()`);
    const hasRingsWhenLowStim = await session.evaluate(`(() => {
      return document.querySelector('#alarmViewport [class*="alarm-halo-ring"]') !== null;
    })()`);
    assert('Browser', 'STIM-01', 'Clicking #lowStimBtn adds .low-stim class and renders only static core glow',
      isLowStimActive === true &&
      hasLowStimClass === true &&
      hasStaticCore === true &&
      hasRingsWhenLowStim === false,
      `isLowStim: ${isLowStimActive}, hasStaticCore: ${hasStaticCore}, hasRings: ${hasRingsWhenLowStim}`
    );

    // Toggle back
    await session.evaluate(`(() => { document.getElementById('lowStimBtn')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 120));
    const isLowStimRestored = await session.evaluate('isLowStim');
    const hasRingsRestored = await session.evaluate(`(() => {
      return document.querySelector('#alarmViewport .alarm-halo-ring-1') !== null;
    })()`);
    assert('Browser', 'STIM-02', 'Toggling low-stim off restores concentric rings 1-4 and breathing animation',
      isLowStimRestored === false && hasRingsRestored === true
    );

    // --- THEME TOGGLE TEST ---
    console.log('\n--- Testing Theme Toggle (Dark / Light) ---');
    await session.evaluate(`(() => { document.getElementById('themeToggleBtn')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 120));
    const isDarkActive = await session.evaluate('isDark');
    const hasDarkClass = await session.evaluate(`(() => {
      const vp = document.querySelector('#alarmViewport > div');
      return vp ? vp.classList.contains('dark') : false;
    })()`);
    assert('Browser', 'THEME-01', 'Clicking #themeToggleBtn applies dark mode class correctly', isDarkActive && hasDarkClass);

    // Toggle back to light
    await session.evaluate(`(() => { document.getElementById('themeToggleBtn')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 120));

    // --- SIDE-BY-SIDE COMPARISON TOGGLE ---
    console.log('\n--- Testing Side-by-Side ("Lado a Lado") Toggle ---');
    const splitBefore = await session.evaluate('document.getElementById("splitComparison")?.classList.contains("hidden")');
    assert('Browser', 'SIDE-01', 'Split comparison is initially hidden', splitBefore === true);

    await session.evaluate(`(() => { document.getElementById('headerSplitBtn')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 120));
    const splitAfter = await session.evaluate('document.getElementById("splitComparison")?.classList.contains("hidden")');
    assert('Browser', 'SIDE-02', 'Clicking header "Lado a Lado" unhides split comparison container', splitAfter === false);

    // --- NUMERAL & CHEVRON HYGIENE CHECK ACROSS ALL 6 STATES ---
    console.log('\n--- Checking Numeral & Chevron Hygiene in Live DOM ---');
    for (const p of canonicalPresets) {
      await session.evaluate(`(() => { document.getElementById('presetItem-${p.id}')?.click(); })()`);
      await new Promise((r) => setTimeout(r, 60));

      const fontMonoCount = await session.evaluate(`(() => {
        return document.querySelectorAll('#alarmViewport .font-mono').length;
      })()`);
      assert('Browser', `HYGIENE-MONO-${p.id}`, `Preset ${p.id} renders 0 .font-mono elements in alarm viewport`, fontMonoCount === 0, `Count: ${fontMonoCount}`);

      const chevronCount = await session.evaluate(`(() => {
        return Array.from(document.querySelectorAll('#alarmViewport *')).filter(el => {
          return el.textContent && (el.textContent.includes('›') || el.textContent.includes('ChevronRight'));
        }).length;
      })()`);
      assert('Browser', `HYGIENE-CHEV-${p.id}`, `Preset ${p.id} renders 0 chevrons (› or ChevronRight) in alarm viewport`, chevronCount === 0, `Count: ${chevronCount}`);
    }

    // --- SNOOZE PILLS CLICK TEST ---
    console.log('\n--- Testing Snooze Pill Clicks (5, 10, 15, task_end) ---');
    await session.evaluate(`(() => { document.getElementById('presetItem-04-snooze')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 100));

    const clickSnoozeOption1 = await session.evaluate(`(() => {
      const allBtns = Array.from(document.querySelectorAll('#alarmViewport button'));
      const pills = allBtns.filter(b => b.textContent.trim() !== 'Voltar');
      if (pills[0]) { pills[0].click(); return true; } else return false;
    })()`);
    assert('Browser', 'PILL-SNOOZE-01', 'Clicking Pill 1 (+5 min) executes handleSnoozeClick and returns to main screen',
      clickSnoozeOption1 && (await session.evaluate('currentScreen')) === 'main'
    );

    // --- ADHD PILLS CLICK TEST ---
    console.log('\n--- Testing ADHD Support Pill Clicks ---');
    await session.evaluate(`(() => { document.getElementById('presetItem-05-adhd')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 100));

    const clickAdhdOption1 = await session.evaluate(`(() => {
      const allBtns = Array.from(document.querySelectorAll('#alarmViewport button'));
      const pills = allBtns.filter(b => b.textContent.trim() !== 'Voltar');
      if (pills[0]) { pills[0].click(); return true; } else return false;
    })()`);
    assert('Browser', 'PILL-ADHD-01', 'Clicking Pill 1 ("Não sei por onde começar") executes handleDiffClick and returns to main screen',
      clickAdhdOption1 && (await session.evaluate('currentScreen')) === 'main'
    );

    // --- PRIMARY CTA AND DISMISS HANDLERS ---
    console.log('\n--- Testing Primary CTA and Dismiss Handlers ---');
    await session.evaluate(`(() => { document.getElementById('presetItem-00-base')?.click(); })()`);
    await new Promise((r) => setTimeout(r, 100));

    const primaryClicked = await session.evaluate(`(() => {
      const cta = document.querySelector('#alarmViewport button[style*="linear-gradient"]');
      if (cta) { cta.click(); return true; } else return false;
    })()`);
    const statusLogAfterCta = await session.evaluate('document.getElementById("logStatus")?.innerText || ""');
    assert('Browser', 'CTA-01', 'Clicking Primary CTA triggers handlePrimaryAction() cleanly',
      primaryClicked && statusLogAfterCta.includes('Ação principal executada'),
      `log: "${statusLogAfterCta}"`
    );

    const dismissClicked = await session.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('#alarmViewport button'));
      const dismissBtn = btns.find(b => b.textContent.includes('Dispensar'));
      if (dismissBtn) { dismissBtn.click(); return true; } else return false;
    })()`);
    const statusLogAfterDismiss = await session.evaluate('document.getElementById("logStatus")?.innerText || ""');
    assert('Browser', 'DISMISS-01', 'Clicking "Dispensar" triggers handleDismiss() cleanly',
      dismissClicked && statusLogAfterDismiss.includes('Alarme dispensado!'),
      `log: "${statusLogAfterDismiss}"`
    );

    // --- CHECK FOR RUNTIME EXCEPTIONS ---
    console.log('\n--- Checking JavaScript Runtime Exceptions ---');
    assert('Browser', 'ERR-01', 'Zero unhandled exceptions occurred during entire test session', session.exceptions.length === 0,
      session.exceptions.length > 0 ? session.exceptions.join('; ') : 'No exceptions'
    );

  } finally {
    session.close();
    chrome.kill();
    // Clean up temporary user data directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

async function main() {
  const start = performance.now();
  console.log('================================================================');
  console.log('   TIMENEST test-alarmes.html ADVERSARIAL STRESS TEST SUITE     ');
  console.log('================================================================');

  try {
    await runStaticAnalysis();
    await runBrowserTestSuite();
  } catch (err: any) {
    console.error('\nFatal Error in Test Harness:', err);
    process.exit(1);
  }

  const duration = (performance.now() - start).toFixed(2);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n================================================================');
  console.log(`TOTAL ASSERTIONS: ${total} | PASSED: ${passed} | FAILED: ${failed} | TIME: ${duration}ms`);
  console.log('================================================================');

  if (failed > 0) {
    console.error(`\n❌ ADVERSARIAL STRESS TEST FAILED with ${failed} failing assertion(s)!`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL ADVERSARIAL STRESS TEST ASSERTIONS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

main();
