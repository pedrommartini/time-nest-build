// tests/e2e/run_all_tests.ts
// TimeNest Full-Screen Alarms E2E Test Suite Runner (Tiers 1-4)

import { runTier1Tests } from './tier1_features.test';
import { runTier2Tests } from './tier2_boundaries.test';
import { runTier3Tests } from './tier3_combinations.test';
import { runTier4Tests } from './tier4_real_world.test';
import type { TestResult } from './harness';

function main() {
  console.log('================================================================');
  console.log('   TIMENEST FULL-SCREEN ALARMS — E2E TEST RUNNER (TIERS 1-4)    ');
  console.log('================================================================\n');

  const suiteStart = performance.now();

  // Execute all tiers
  const tier1Results = runTier1Tests();
  const tier2Results = runTier2Tests();
  const tier3Results = runTier3Tests();
  const tier4Results = runTier4Tests();

  const allResults: TestResult[] = [
    ...tier1Results,
    ...tier2Results,
    ...tier3Results,
    ...tier4Results,
  ];

  const total = allResults.length;
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;
  const suiteDuration = (performance.now() - suiteStart).toFixed(2);

  // Grouped presentation
  const tiers = [
    { name: 'Tier 1: Feature Coverage (Visual Layout & States)', items: tier1Results },
    { name: 'Tier 2: Boundary & Corner Cases', items: tier2Results },
    { name: 'Tier 3: Cross-Feature Combinations & State Machine', items: tier3Results },
    { name: 'Tier 4: Real-World Scenarios & User Journeys', items: tier4Results },
  ];

  for (const tier of tiers) {
    const tierPassed = tier.items.filter(i => i.passed).length;
    const tierTotal = tier.items.length;
    console.log(`\n--- ${tier.name} [${tierPassed}/${tierTotal}] ---`);

    for (const item of tier.items) {
      const statusTag = item.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
      const durationTag = `(${item.durationMs.toFixed(2)}ms)`;
      console.log(`  ${statusTag} ${item.name} ${durationTag}`);
      if (!item.passed && item.error) {
        console.error(`         \x1b[31mError: ${item.error}\x1b[0m`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed} | TIME: ${suiteDuration}ms`);
  console.log('================================================================');

  if (failed > 0) {
    console.error(`\n❌ TEST SUITE FAILED: ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL 4 TIERS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

main();
