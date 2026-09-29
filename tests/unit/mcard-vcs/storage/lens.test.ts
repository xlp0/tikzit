import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OperadicMCardVfs } from '../../../../src/packages/mcard-vcs/storage/OperadicMCardVfs';
import { MemoryStorageVFS } from '../../../../src/packages/mcard-vcs/storage/vfs/MemoryStorageVFS';

describe('ConversationalLens Laws (S ⊣ G)', () => {
  let vfs: OperadicMCardVfs;
  let mem: MemoryStorageVFS;

  beforeEach(async () => {
    mem = new MemoryStorageVFS();
    await mem.init();
    vfs = new OperadicMCardVfs(mem);
  });

  afterEach(async () => {
    await vfs.close();
  });

  it('satisfies the Get-Put law: S(s, G(s)) = s', async () => {
    const handle = 'zx:diagrams:bell-state';
    const content = '\\begin{tikzpicture}\\end{tikzpicture}';

    await vfs.set(handle, content);
    const initial = await vfs.get(handle);
    expect(initial).not.toBeNull();

    // Re-set with the observed value
    await vfs.set(handle, initial!.content);
    const after = await vfs.get(handle);

    expect(after?.hash).toBe(initial?.hash);
    expect(after?.text).toBe(initial?.text);
  });

  it('satisfies the Put-Get law: G(S(s, b)) = b', async () => {
    const handle = 'zx:diagrams:ghz-state';
    const content = '% GHZ State TikZ Source';

    await vfs.set(handle, content);
    const observed = await vfs.get(handle);

    expect(observed).not.toBeNull();
    expect(observed!.text).toBe(content);
  });

  it('satisfies the Put-Put law: S(S(s, b1), b2) = S(s, b2)', async () => {
    const handle = 'zx:drafts:w-state';
    const val1 = '% Draft Version 1';
    const val2 = '% Draft Version 2 (Final)';

    await vfs.set(handle, val1);
    await vfs.set(handle, val2);

    const observed = await vfs.get(handle);
    expect(observed?.text).toBe(val2);
  });

  it('verifies all three lens laws automatically via verifyLensLaws', async () => {
    const handle = 'zx:diagrams:automated-lens-check';
    const result = await vfs.verifyLensLaws(handle, 'State One', 'State Two');

    expect(result.getPutPassed).toBe(true);
    expect(result.putGetPassed).toBe(true);
    expect(result.putPutPassed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
