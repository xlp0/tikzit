import { describe, it, expect, vi } from 'vitest';
import {
  forwardTargetsToDirections,
  type ForwardTarget
} from '../../../../src/packages/mcard-explorer/renderers/forwardBrowsingAdapter';
import type { Position } from '../../../../src/packages/mcard-explorer/poly/types';

describe('forwardBrowsingAdapter (ADR D54)', () => {
  const dummyPos: Position = {
    id: 'pos:1',
    handle: 'zx:diagrams:ghz',
    hash: 'h1',
    mimeType: 'text/x-tikz',
    surface: 'list'
  };

  it('maps studio ForwardTarget reasons to direction groups', () => {
    const targets: ForwardTarget[] = [
      { handle: 'model:gpt4', reason: 'consumes' },
      { handle: 'runtime:node', reason: 'same-runtime' },
      { handle: 'state:done', reason: 'transition' }
    ];

    const directions = forwardTargetsToDirections(targets);
    expect(directions).toHaveLength(3);

    expect(directions[0].group).toBe('forward.consumes');
    expect(directions[0].id).toBe('forward.consumes.model:gpt4');

    expect(directions[1].group).toBe('forward.same-runtime');
    expect(directions[2].group).toBe('forward.transition');
  });

  it('executes navigation callback on execution', async () => {
    const navigateSpy = vi.fn(async () => {});
    const targets: ForwardTarget[] = [
      { handle: 'model:gpt4', reason: 'consumes' }
    ];

    const directions = forwardTargetsToDirections(targets, navigateSpy);
    const result = await directions[0].execute(dummyPos);

    expect(navigateSpy).toHaveBeenCalledWith('model:gpt4');
    expect(result.success).toBe(true);
    expect(result.producedHandle).toBe('model:gpt4');
  });
});
