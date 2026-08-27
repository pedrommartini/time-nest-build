/**
 * test_app_diagnostics.cjs
 * Diagnóstico automatizado do aplicativo Time Nest rodando no Emulador/Dispositivo Android.
 * Captura telas, analisa logcat em busca de exceções/erros de JS e valida saúde da aplicação.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EnvDir = "E:\\AI\\Programas\\Emulador Android";
const ADB_PATH = path.join(EnvDir, 'sdk', 'platform-tools', 'adb.exe');
const REPORTS_DIR = path.join(__dirname, 'reports');
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');

// Garantir diretórios de relatório
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function runAdb(args) {
    try {
        return execSync(`"${ADB_PATH}" ${args}`, { encoding: 'utf8', timeout: 30000 });
    } catch (e) {
        return e.stdout || e.stderr || e.message;
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(name) {
    const remotePath = `/sdcard/screenshot_${Date.now()}.png`;
    const localPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
    
    runAdb(`shell screencap -p ${remotePath}`);
    runAdb(`pull ${remotePath} "${localPath}"`);
    runAdb(`shell rm ${remotePath}`);
    
    console.log(`📸 Screenshot salvo: ${localPath}`);
    return localPath;
}

async function runDiagnostics() {
    console.log("=================================================");
    console.log("🔍 Iniciando Diagnóstico Automatizado do Time Nest");
    console.log("=================================================");

    const devices = runAdb("devices");
    console.log("📱 Dispositivos conectados:\n", devices.trim());

    if (!devices.includes("\tdevice")) {
        console.error("❌ Nenhum dispositivo ativo encontrado no ADB!");
        return;
    }

    // 1. Limpar logcat anterior
    console.log("\n🧹 Limpando buffer de logs do Logcat...");
    runAdb("logcat -c");

    // 2. Trazer app para primeiro plano
    console.log("🚀 Abrindo tela inicial do app...");
    runAdb("shell am start -n io.timenest.app/io.timenest.app.MainActivity");
    
    // Aguardar inicialização completa do React e plugins do Capacitor
    console.log("⏳ Aguardando renderização da interface e plugins...");
    await sleep(6000);

    // 3. Captura de tela da view principal
    console.log("\n📷 Capturando tela principal do Time Nest...");
    await takeScreenshot("01_main_view");

    // 4. Teste de toque/interação (ex: abrir menu/drawer ou tocar em botão de ação)
    console.log("👆 Testando interação com a interface (toque na tela)...");
    runAdb("shell input tap 100 120"); // Top-left menu / drawer
    await sleep(2000);
    await takeScreenshot("02_menu_drawer");

    // Toque no centro para testar timers / abas
    runAdb("shell input tap 540 1800"); // Bottom bar / center action
    await sleep(2000);
    await takeScreenshot("03_interaction");

    // 5. Coleta de Logs de Erros e JS Console
    console.log("\n📑 Coletando e analisando logs do aplicativo...");
    const rawLogs = runAdb('logcat -d -v time *:V');
    
    const logLines = rawLogs.split('\n');
    const errors = [];
    const warnings = [];
    const appLogs = [];

    for (const line of logLines) {
        if (line.includes('io.timenest.app') || line.includes('Capacitor') || line.includes('Chromium') || line.includes('AndroidRuntime') || line.includes('Console')) {
            appLogs.push(line.trim());
            if (line.includes(' E ') || line.includes('FATAL') || line.includes('Error') || line.includes('Uncaught') || line.includes('Exception')) {
                // Ignore benign chromium harmless logs if any
                if (!line.includes('autofill') && !line.includes('FontFamily')) {
                    errors.push(line.trim());
                }
            } else if (line.includes(' W ') || line.includes('Warning')) {
                warnings.push(line.trim());
            }
        }
    }

    // 6. Salvar Relatório
    const reportPath = path.join(REPORTS_DIR, `diagnostic_report_${Date.now()}.json`);
    const reportMdPath = path.join(REPORTS_DIR, `diagnostic_report.md`);

    const reportData = {
        timestamp: new Date().toISOString(),
        totalRelevantLogs: appLogs.length,
        errorsFound: errors.length,
        warningsFound: warnings.length,
        errors: errors.slice(0, 50),
        warnings: warnings.slice(0, 50),
        recentLogs: appLogs.slice(-100)
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    const mdContent = `# Relatório de Diagnóstico do App Time Nest

- **Data/Hora**: ${new Date().toLocaleString('pt-BR')}
- **Total de Logs Relevantes**: ${appLogs.length}
- **Erros Críticos Detectados**: ${errors.length}
- **Avisos Detectados**: ${warnings.length}

---

## 🚨 Erros Detectados
${errors.length > 0 ? errors.map(e => `- \`${e}\``).join('\n') : '✅ Nenhum erro crítico ou crash detectado.'}

---

## ⚠️ Avisos Relevantes
${warnings.length > 0 ? warnings.slice(0, 20).map(w => `- \`${w}\``).join('\n') : '✅ Nenhum aviso significativo.'}

---

## 📸 Screenshots Gerados
- \`reports/screenshots/01_main_view.png\`
- \`reports/screenshots/02_menu_drawer.png\`
- \`reports/screenshots/03_interaction.png\`
`;

    fs.writeFileSync(reportMdPath, mdContent);

    console.log("\n=================================================");
    console.log(`📊 Diagnóstico Concluído com Sucesso!`);
    console.log(`- Total de logs analisados: ${appLogs.length}`);
    console.log(`- Erros encontrados: ${errors.length}`);
    console.log(`- Avisos encontrados: ${warnings.length}`);
    console.log(`- Relatório Markdown: ${reportMdPath}`);
    console.log("=================================================");
}

runDiagnostics().catch(console.error);
