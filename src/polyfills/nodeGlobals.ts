/**
 * src/polyfills/nodeGlobals.ts — Browser Node-global polyfills
 *
 * clm-kernel's TypeInterpreter (and other kernel paths) call Node globals like
 * Buffer.isBuffer/Buffer.from/Buffer.concat/Buffer.alloc. These do not exist in
 * the browser, so every OperadicMCardVfs.set() (type judgment) threw
 * "Buffer.isBuffer is not a function" — silently breaking sovereign-VFS writes.
 *
 * Import this module FIRST in browser entry points (before anything that can
 * transitively import clm-kernel). In Node/test environments Buffer already
 * exists and is left untouched.
 */
import { Buffer } from 'buffer';

if (typeof globalThis !== 'undefined' && typeof (globalThis as { Buffer?: unknown }).Buffer === 'undefined') {
  (globalThis as { Buffer?: unknown }).Buffer = Buffer;
}

export {};
