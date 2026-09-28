import { describe, it, expect } from 'vitest';
import { createKernelContext } from '../../../src/services/kernel';
import { createKeybindingDispatcher, isInputSuppressed } from '../../../src/services/keybindings';

describe('Global Keybinding Engine (Sprint 02)', () => {
  it('detects input suppression for interactive form controls', () => {
    expect(isInputSuppressed(null)).toBe(false);
    expect(isInputSuppressed({ tagName: 'DIV' })).toBe(false);
    expect(isInputSuppressed({ tagName: 'BUTTON' })).toBe(false);

    expect(isInputSuppressed({ tagName: 'INPUT' })).toBe(true);
    expect(isInputSuppressed({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isInputSuppressed({ tagName: 'SELECT' })).toBe(true);
    expect(isInputSuppressed({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(
      isInputSuppressed({
        tagName: 'SPAN',
        closest: (sel: string) => sel.includes('cm-editor') ? {} : null,
      })
    ).toBe(true);
  });

  it('dispatches hotkeys S, V, N, E, B to ToolService', () => {
    const ctx = createKernelContext();
    const eventTarget = new EventTarget();
    const cleanup = createKeybindingDispatcher(ctx, eventTarget);

    expect(ctx.tool.current).toBe('select');

    // Press 'v' -> vertex
    eventTarget.dispatchEvent(new CustomEvent('keydown', { detail: {} }));
    // Custom key event simulation:
    const dispatchKey = (key: string, target?: any) => {
      const event: any = new Event('keydown');
      event.key = key;
      Object.defineProperty(event, 'target', { value: target || { tagName: 'DIV' } });
      eventTarget.dispatchEvent(event);
    };

    dispatchKey('v');
    expect(ctx.tool.current).toBe('vertex');

    dispatchKey('s');
    expect(ctx.tool.current).toBe('select');

    dispatchKey('n');
    expect(ctx.tool.current).toBe('vertex');

    dispatchKey('e');
    expect(ctx.tool.current).toBe('edge');

    dispatchKey('b');
    expect(ctx.tool.current).toBe('bbox');

    cleanup();
  });

  it('suppresses tool shortcuts when user is focused inside an input element', () => {
    const ctx = createKernelContext();
    const eventTarget = new EventTarget();
    const cleanup = createKeybindingDispatcher(ctx, eventTarget);

    expect(ctx.tool.current).toBe('select');

    const dispatchKey = (key: string, target?: any) => {
      const event: any = new Event('keydown');
      event.key = key;
      Object.defineProperty(event, 'target', { value: target });
      eventTarget.dispatchEvent(event);
    };

    // Dispatch 'e' with input target
    dispatchKey('e', { tagName: 'INPUT' });
    // Tool must remain 'select', not switch to 'edge'
    expect(ctx.tool.current).toBe('select');

    // Dispatch 'v' with textarea target
    dispatchKey('v', { tagName: 'TEXTAREA' });
    expect(ctx.tool.current).toBe('select');

    cleanup();
  });
});
