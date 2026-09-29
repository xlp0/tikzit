import { describe, it, expect, vi } from 'vitest';
import { handleTimelineKeyboardNavigation } from '../../../../src/packages/mcard-explorer/ui/TimelineScrubber';
import type { InteractionNode } from '../../../../src/packages/mcard-explorer/time';

describe('Timeline Keyboard Navigation (39-DOD-12)', () => {
  const mockPath: readonly InteractionNode[] = [
    {
      id: 'node-0',
      position: { id: 'p0', handle: 'c', hash: 'h0', mimeType: 'text/plain', surface: 'list' },
      arrivedBy: null,
      at: 0,
      children: []
    },
    {
      id: 'node-1',
      position: { id: 'p1', handle: 'c', hash: 'h1', mimeType: 'text/plain', surface: 'list' },
      arrivedBy: 'edit',
      at: 1,
      children: []
    },
    {
      id: 'node-2',
      position: { id: 'p2', handle: 'c', hash: 'h2', mimeType: 'text/plain', surface: 'list' },
      arrivedBy: 'tag',
      at: 2,
      children: []
    }
  ];

  it('39-DOD-12: Left Arrow scrubs to previous timeline node', () => {
    const onSelectNode = vi.fn();
    const preventDefault = vi.fn();

    const handled = handleTimelineKeyboardNavigation(
      { key: 'ArrowLeft', preventDefault },
      {
        path: mockPath,
        activeNodeId: 'node-2',
        onSelectNode
      }
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(onSelectNode).toHaveBeenCalledWith('node-1');
  });

  it('39-DOD-12: Right Arrow scrubs to next timeline node', () => {
    const onSelectNode = vi.fn();
    const preventDefault = vi.fn();

    const handled = handleTimelineKeyboardNavigation(
      { key: 'ArrowRight', preventDefault },
      {
        path: mockPath,
        activeNodeId: 'node-0',
        onSelectNode
      }
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(onSelectNode).toHaveBeenCalledWith('node-1');
  });

  it('39-DOD-12: Boundary guards: Left arrow at index 0 and Right arrow at last index do nothing', () => {
    const onSelectNode = vi.fn();

    const leftHandled = handleTimelineKeyboardNavigation(
      { key: 'ArrowLeft' },
      { path: mockPath, activeNodeId: 'node-0', onSelectNode }
    );
    expect(leftHandled).toBe(false);
    expect(onSelectNode).not.toHaveBeenCalled();

    const rightHandled = handleTimelineKeyboardNavigation(
      { key: 'ArrowRight' },
      { path: mockPath, activeNodeId: 'node-2', onSelectNode }
    );
    expect(rightHandled).toBe(false);
    expect(onSelectNode).not.toHaveBeenCalled();
  });

  it('39-DOD-12: Cmd+Z or Ctrl+Z triggers onUndo()', () => {
    const onUndo = vi.fn();
    const preventDefault = vi.fn();

    // Cmd+Z (macOS)
    const cmdHandled = handleTimelineKeyboardNavigation(
      { key: 'z', metaKey: true, preventDefault },
      { path: mockPath, activeNodeId: 'node-1', onSelectNode: vi.fn(), onUndo }
    );
    expect(cmdHandled).toBe(true);
    expect(onUndo).toHaveBeenCalledTimes(1);

    // Ctrl+Z (Linux/Windows)
    const ctrlHandled = handleTimelineKeyboardNavigation(
      { key: 'Z', ctrlKey: true, preventDefault },
      { path: mockPath, activeNodeId: 'node-1', onSelectNode: vi.fn(), onUndo }
    );
    expect(ctrlHandled).toBe(true);
    expect(onUndo).toHaveBeenCalledTimes(2);
  });

  it('39-DOD-12: Alt+B triggers onBranch() with active node id', () => {
    const onBranch = vi.fn();
    const preventDefault = vi.fn();

    const handled = handleTimelineKeyboardNavigation(
      { key: 'b', altKey: true, preventDefault },
      { path: mockPath, activeNodeId: 'node-1', onSelectNode: vi.fn(), onBranch }
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(onBranch).toHaveBeenCalledWith('node-1');
  });
});
