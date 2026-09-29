/**
 * HostSelfCheck: Conformance & Self-Check Runner
 *
 * Runs headless under Node without DOM to verify all VCS & Explorer invariants:
 * 1. Conversational Lens laws (Get-Put, Put-Get, Put-Put)
 * 2. Plain DTO serializability (survives structuredClone)
 * 3. LIFO resource unwinding
 * 4. Merkle 3-way merge basics
 * 5. History row shape compatibility
 *
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../storage/vfs/MemoryStorageVFS';
import { MCardVcsEngine } from '../vcs/MCardVcsEngine';
import { ExplorerQueryFacade } from '../explorer/ExplorerQueryFacade';
import { VcsFiber } from '../cordis/VcsFiber';

export interface SelfCheckItemResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface SelfCheckReport {
  success: boolean;
  results: SelfCheckItemResult[];
}

export async function runHostSelfCheck(): Promise<SelfCheckReport> {
  const results: SelfCheckItemResult[] = [];
  const mem = new MemoryStorageVFS();
  await mem.init();
  const vfs = new OperadicMCardVfs(mem);
  const vcs = new MCardVcsEngine(vfs);
  await vcs.init();
  const facade = new ExplorerQueryFacade(vfs, vcs);

  // 1. Lens Laws Verification
  try {
    const lensRes = await vfs.verifyLensLaws('selfcheck:lens', 'val_A', 'val_B');
    const passed = lensRes.getPutPassed && lensRes.putGetPassed && lensRes.putPutPassed;
    results.push({
      name: 'Lens Laws (Get-Put, Put-Get, Put-Put)',
      passed,
      error: lensRes.violations.join('; ') || undefined
    });
  } catch (err: any) {
    results.push({ name: 'Lens Laws', passed: false, error: err?.message });
  }

  // 2. DTO Serializability Check
  try {
    await vfs.set('selfcheck:dto', 'sample content');
    const searchRes = await facade.search({ pattern: 'selfcheck:dto' });
    const cloned = structuredClone(searchRes);
    const passed = cloned.length > 0 && cloned[0].handle === 'selfcheck:dto';
    results.push({ name: 'DTO structuredClone Serializability', passed });
  } catch (err: any) {
    results.push({ name: 'DTO structuredClone Serializability', passed: false, error: err?.message });
  }

  // 3. LIFO Resource Unwinding
  try {
    const fiber = new VcsFiber('selfcheck_fiber');
    const order: number[] = [];
    await fiber.executeSandwich(
      async () => { fiber.register(() => { order.push(1); }); },
      async () => { fiber.register(() => { order.push(2); }); },
      async () => { order.push(3); }
    );
    const passed = order[0] === 2 && order[1] === 3 && order[2] === 1;
    results.push({ name: 'LIFO DisposableList Unwinding', passed });
  } catch (err: any) {
    results.push({ name: 'LIFO DisposableList Unwinding', passed: false, error: err?.message });
  }

  // 4. Merkle 3-Way Merge Basics
  try {
    await vcs.step({ type: 'stage', handle: 'doc:1', payload: 'base' });
    const c0 = await vcs.step({ type: 'commit', authorDid: 'alice', message: 'c0' });
    await vcs.step({ type: 'branch', name: 'feat', startRef: c0.commitHash });
    await vcs.step({ type: 'checkout', ref: 'feat' });
    await vcs.step({ type: 'stage', handle: 'doc:2', payload: 'feat' });
    await vcs.step({ type: 'commit', authorDid: 'bob', message: 'c1' });
    await vcs.step({ type: 'checkout', ref: 'master' });
    const mergeRes = await vcs.step({ type: 'merge', baseRef: 'master', incomingRef: 'feat', authorDid: 'alice' });
    const passed = mergeRes.status === 'merged' || mergeRes.status === 'transitioned';
    results.push({ name: 'Merkle 3-Way Merge Basics', passed });
  } catch (err: any) {
    results.push({ name: 'Merkle 3-Way Merge Basics', passed: false, error: err?.message });
  }

  // 5. History Row Shape Compatibility
  try {
    const history = await vcs.getMCardHashHistory('doc:1');
    const passed = history.length > 0 && typeof history[0].hash === 'string' && typeof history[0].changedAt === 'string';
    results.push({ name: 'History Row Shape Compatibility', passed });
  } catch (err: any) {
    results.push({ name: 'History Row Shape Compatibility', passed: false, error: err?.message });
  }

  await vfs.close();
  const allPassed = results.every(r => r.passed);
  return { success: allPassed, results };
}
