import { describe, it, expect } from 'vitest';
import { runHostSelfCheck } from '../../../../src/packages/mcard-vcs/conformance/hostSelfCheck';

describe('Sprint 28: Host Conformance Self-Check Runner', () => {
  it('28-DOD-15: executes full host self-check suite and verifies 100% green conformance', async () => {
    const report = await runHostSelfCheck();
    expect(report.results.length).toBeGreaterThan(0);

    for (const item of report.results) {
      if (!item.passed) {
        console.error(`Self-check failed: ${item.name} -> ${item.error}`);
      }
      expect(item.passed).toBe(true);
    }

    expect(report.success).toBe(true);
  });
});
