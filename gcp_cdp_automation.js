const { chromium } = require('E:/AI/Antigravity/Time Nest/node_modules/playwright');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
    console.log("=================================================");
    console.log("🚀 Iniciando Automação no Chrome Visível");
    console.log("=================================================");

    const targetUrl = 'https://console.cloud.google.com/apis/credentials';

    // Store user data dir on E: drive to save C: disk space
    const userDataDir = path.join('E:', 'AI', 'Antigravity', 'Time Nest', '.chrome-gcp-profile');

    let context;
    try {
        console.log("Abrindo Chrome com perfil em E:...");
        context = await chromium.launchPersistentContext(userDataDir, {
            channel: 'chrome',
            headless: false,
            viewport: null,
            args: [
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    } catch (e) {
        console.error("Erro ao iniciar o Chrome:", e.message);
        return;
    }

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log(`🌐 Navegando para ${targetUrl}...`);
    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    } catch (e) {
        console.log("Aviso de navegação:", e.message);
    }

    // Check if login is needed
    try {
        let currentUrl = page.url();
        if (currentUrl.includes('accounts.google.com')) {
            console.log("\n🔑 LOGIN NECESSÁRIO:");
            console.log("Por favor, realize o login na sua Conta Google na janela do Chrome aberta.");
            console.log("Aguardando conclusão do login pelo usuário...\n");
            
            while (!page.isClosed() && page.url().includes('accounts.google.com')) {
                await page.waitForTimeout(2000).catch(() => {});
            }
            if (page.isClosed()) {
                console.log("A janela do navegador foi fechada pelo usuário.");
                return;
            }
            console.log("✅ Login concluído com sucesso!");
        }
    } catch (e) {
        console.log("Loop de login finalizado:", e.message);
        if (page.isClosed()) return;
    }

    console.log("⏳ Aguardando carregamento da página de Credenciais do GCP...");
    try {
        await page.waitForURL(url => url.toString().includes('console.cloud.google.com'), { timeout: 120000 });
        await page.waitForTimeout(5000);
    } catch (e) {
        console.log("Aviso aguardando GCP:", e.message);
        if (page.isClosed()) return;
    }

    // Passo 1: Verificar / Selecionar Projeto "Time Nest"
    console.log("\n[Passo 1] Verificando Seleção do Projeto 'Time Nest'...");
    try {
        const projectPicker = page.locator('button[aria-label*="Selecione um projeto"], button[aria-label*="Select a project"], .cfc-project-picker-button, #cf-project-switcher-button').first();
        if (await projectPicker.isVisible({ timeout: 5000 })) {
            const projectText = await projectPicker.innerText();
            console.log(`Projeto atual no cabeçalho: "${projectText.trim()}"`);
            if (!projectText.toLowerCase().includes('time nest') && !projectText.toLowerCase().includes('timenest')) {
                console.log("Abrindo seletor de projetos...");
                await projectPicker.click();
                await page.waitForTimeout(2000);

                const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"], input[aria-label*="Search"]').first();
                if (await searchInput.isVisible({ timeout: 5000 })) {
                    await searchInput.fill('Time Nest');
                    await page.waitForTimeout(2000);
                }

                const projectRow = page.locator('tr:has-text("Time Nest"), [role="row"]:has-text("Time Nest"), td:has-text("Time Nest"), span:has-text("Time Nest")').first();
                if (await projectRow.isVisible({ timeout: 5000 })) {
                    await projectRow.click();
                    console.log("✅ Projeto 'Time Nest' selecionado!");
                    await page.waitForTimeout(5000);
                }
            } else {
                console.log("✅ Projeto 'Time Nest' já está selecionado.");
            }
        }
    } catch (e) {
        console.log("Info sobre seleção de projeto:", e.message);
    }

    if (!page.url().includes('/apis/credentials')) {
        console.log("Redirecionando para a URL de credenciais...");
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
    }

    // Passo 2: Clique em "+ Criar Credenciais" -> "ID do cliente OAuth"
    console.log("\n[Passo 2] Clicando em '+ Criar Credenciais' -> 'ID do cliente OAuth'...");
    const createBtn = page.locator('button:has-text("Criar credenciais"), button:has-text("Create credentials"), [aria-label*="Criar credenciais"], [aria-label*="Create credentials"]').first();
    await createBtn.waitFor({ state: 'visible', timeout: 30000 });
    await createBtn.click();
    console.log("Menu 'Criar Credenciais' aberto.");
    await page.waitForTimeout(1500);

    const oauthOption = page.locator('[role="menuitem"]:has-text("ID do cliente OAuth"), [role="option"]:has-text("ID do cliente OAuth"), button:has-text("ID do cliente OAuth"), a:has-text("ID do cliente OAuth"), :has-text("OAuth client ID")').first();
    await oauthOption.waitFor({ state: 'visible', timeout: 10000 });
    await oauthOption.click();
    console.log("Opção 'ID do cliente OAuth' clicada.");

    console.log("Aguardando carregamento do formulário de criação de ID do cliente OAuth...");
    await page.waitForTimeout(5000);

    // Passo 3: Selecionar o Tipo de Aplicativo: "Android"
    console.log("\n[Passo 3] Selecionando Tipo de Aplicativo: 'Android'...");
    const appTypeSelect = page.locator('mat-select, select, [role="combobox"], [aria-label*="Tipo de aplicativo"], [aria-label*="Application type"]').first();
    await appTypeSelect.waitFor({ state: 'visible', timeout: 30000 });
    await appTypeSelect.click();
    await page.waitForTimeout(1500);

    const androidOption = page.locator('mat-option:has-text("Android"), [role="option"]:has-text("Android"), option:has-text("Android")').first();
    await androidOption.waitFor({ state: 'visible', timeout: 10000 });
    await androidOption.click();
    console.log("✅ Tipo de aplicativo 'Android' selecionado!");
    await page.waitForTimeout(2000);

    // Passo 4: Preencher o Nome do Pacote: "io.timenest.app"
    console.log("\n[Passo 4] Preenchendo Nome do Pacote: 'io.timenest.app'...");
    const packageInput = page.locator('input[formcontrolname*="package"], input[name*="package"], input[aria-label*="pacote"], input[aria-label*="package"], input[placeholder*="pacote"]').first();
    
    let pkgField = packageInput;
    if (!(await pkgField.isVisible().catch(() => false))) {
        const inputs = page.locator('input[type="text"]');
        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
            const inp = inputs.nth(i);
            const ariaLabel = await inp.getAttribute('aria-label').catch(() => '') || '';
            const placeholder = await inp.getAttribute('placeholder').catch(() => '') || '';
            const id = await inp.getAttribute('id').catch(() => '') || '';
            if (ariaLabel.toLowerCase().includes('pacote') || ariaLabel.toLowerCase().includes('package') || placeholder.toLowerCase().includes('com.example') || id.toLowerCase().includes('package')) {
                pkgField = inp;
                break;
            }
        }
    }

    await pkgField.waitFor({ state: 'visible', timeout: 15000 });
    await pkgField.fill('io.timenest.app');
    console.log("✅ Nome do Pacote preenchido com 'io.timenest.app'");
    await page.waitForTimeout(1000);

    // Passo 5: Preencher a Impressão digital SHA-1
    console.log("\n[Passo 5] Preenchendo Impressão digital SHA-1: '4D:C5:B8:7A:F8:68:C7:0D:F3:96:55:C4:A3:D8:7E:85:FD:51:62:B4'...");
    const sha1Value = "4D:C5:B8:7A:F8:68:C7:0D:F3:96:55:C4:A3:D8:7E:85:FD:51:62:B4";
    
    const sha1Input = page.locator('input[formcontrolname*="fingerprint"], input[formcontrolname*="sha"], input[aria-label*="SHA"], input[aria-label*="fingerprint"], input[placeholder*="SHA"]').first();
    
    let shaField = sha1Input;
    if (!(await shaField.isVisible().catch(() => false))) {
        const inputs = page.locator('input[type="text"]');
        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
            const inp = inputs.nth(i);
            const ariaLabel = await inp.getAttribute('aria-label').catch(() => '') || '';
            const placeholder = await inp.getAttribute('placeholder').catch(() => '') || '';
            if (ariaLabel.toLowerCase().includes('sha') || ariaLabel.toLowerCase().includes('fingerprint') || placeholder.includes(':')) {
                shaField = inp;
                break;
            }
        }
    }

    await shaField.waitFor({ state: 'visible', timeout: 15000 });
    await shaField.fill(sha1Value);
    console.log("✅ Impressão digital SHA-1 preenchida!");
    await page.waitForTimeout(1000);

    // Passo 6: Clique no botão Criar/Salvar
    console.log("\n[Passo 6] Clicando no botão Criar/Salvar...");
    const saveBtn = page.locator('button:has-text("Criar"), button:has-text("CRIAR"), button:has-text("Create"), button:has-text("CREATE"), button:has-text("Salvar"), button:has-text("Save")').first();
    await saveBtn.waitFor({ state: 'visible', timeout: 15000 });
    await saveBtn.click();
    console.log("✅ Botão Criar/Salvar clicado!");

    console.log("\n=================================================");
    console.log("🎉 Processo concluído com sucesso!");
    console.log("=================================================");
})();
