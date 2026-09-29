import { describe, it, expect } from 'vitest';
import { SelectionModel } from '../../../../src/packages/mcard-explorer/core/SelectionModel';
import { INITIAL_EXPLORER_STATE, type ExplorerState } from '../../../../src/packages/mcard-explorer/core/ExplorerStateStore';

describe('SelectionModel', () => {
  const baseState: ExplorerState = {
    ...INITIAL_EXPLORER_STATE,
    items: [
      { handle: 'h1', hash: '1', mimeType: 'text/plain', updatedAt: '2026-09-01' },
      { handle: 'h2', hash: '2', mimeType: 'text/plain', updatedAt: '2026-09-01' },
      { handle: 'h3', hash: '3', mimeType: 'text/plain', updatedAt: '2026-09-01' },
      { handle: 'h4', hash: '4', mimeType: 'text/plain', updatedAt: '2026-09-01' }
    ]
  };

  it('selects active handle and includes it in selectedHandles', () => {
    const s1 = SelectionModel.select(baseState, 'h2');
    expect(s1.activeHandle).toBe('h2');
    expect(s1.selectedHandles).toEqual(['h2']);

    const s2 = SelectionModel.select(s1, null);
    expect(s2.activeHandle).toBeNull();
  });

  it('toggles selection membership', () => {
    const s1 = SelectionModel.select(baseState, 'h1');
    const s2 = SelectionModel.toggle(s1, 'h3');
    expect(s2.selectedHandles).toEqual(['h1', 'h3']);

    const s3 = SelectionModel.toggle(s2, 'h1');
    expect(s3.selectedHandles).toEqual(['h3']);
  });

  it('selects contiguous range between two handles', () => {
    const s1 = SelectionModel.selectRange(baseState, 'h2', 'h4');
    expect(s1.selectedHandles).toEqual(['h2', 'h3', 'h4']);
    expect(s1.activeHandle).toBe('h4');

    const sReverse = SelectionModel.selectRange(baseState, 'h3', 'h1');
    expect(sReverse.selectedHandles).toEqual(['h1', 'h2', 'h3']);
  });

  it('clears all selections', () => {
    const s1 = SelectionModel.select(baseState, 'h2');
    const cleared = SelectionModel.clear(s1);
    expect(cleared.activeHandle).toBeNull();
    expect(cleared.selectedHandles).toEqual([]);
  });
});
