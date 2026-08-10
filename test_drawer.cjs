const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true });
  const page = await context.newPage();

  // Navigate to localhost:5173
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    localStorage.setItem('timenest_onboarding_completed', 'true');
    localStorage.setItem('timenest_preferences', JSON.stringify({ isTestEnvironment: true }));
  });
  await page.reload();
  await page.waitForTimeout(2000);

  // Click on a test event on timeline
  const eventEl = await page.locator('.cursor-grab').first();
  if (eventEl) {
    await eventEl.click();
    await page.waitForTimeout(500);

    // Capture collapsed drawer screenshot
    const collapsedPath = 'C:\\Users\\Pedro\\.gemini\\antigravity\\brain\\cf151435-de28-498e-9722-61b47ee8064e\\drawer_collapsed.png';
    await page.screenshot({ path: collapsedPath });
    console.log('Saved collapsed drawer screenshot to', collapsedPath);

    // Expand drawer by clicking chevron
    const chevronBtn = await page.locator('button[title="Expandir detalhes"]').first();
    if (chevronBtn) {
      await chevronBtn.click();
      await page.waitForTimeout(500);
      const expandedPath = 'C:\\Users\\Pedro\\.gemini\\antigravity\\brain\\cf151435-de28-498e-9722-61b47ee8064e\\drawer_expanded.png';
      await page.screenshot({ path: expandedPath });
      console.log('Saved expanded drawer screenshot to', expandedPath);
    }
  }

  await browser.close();
})();
