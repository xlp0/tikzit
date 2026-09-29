import { describe, it, expect } from 'vitest';
import {
  allOf,
  anyOf,
  never,
  isUniverse,
  isCategory,
  isSurface,
  isMutable,
  isImmutable,
  isHead,
  hasExporter,
  isSource,
  isArtifact,
  isCollection,
  isProcess,
  hasMime
} from '../../../../src/packages/mcard-explorer/poly/guardrails';
import type { Position } from '../../../../src/packages/mcard-explorer/poly/types';

describe('Poly Guardrails Combinators', () => {
  const dummyPos: Position = {
    id: 'pos:1',
    handle: 'zx:diagrams:ghz',
    hash: '0123456789abcdef',
    mimeType: 'text/x-tikz',
    universe: 'U2',
    category: 'diagram',
    clmCategory: 'diagram',
    surface: 'list',
    meta: {
      mutable: true,
      isHead: true,
      exportFormats: ['svg', 'png']
    }
  };

  it('allOf returns true when all predicates pass, and short-circuits on first false', () => {
    let secondCalled = false;
    const p1 = () => false;
    const p2 = () => {
      secondCalled = true;
      return true;
    };

    const combined = allOf(p1, p2);
    expect(combined(dummyPos)).toBe(false);
    expect(secondCalled).toBe(false);

    const allTrue = allOf(() => true, () => true);
    expect(allTrue(dummyPos)).toBe(true);
  });

  it('anyOf returns true if at least one predicate passes', () => {
    const combined = anyOf(() => false, () => true);
    expect(combined(dummyPos)).toBe(true);

    const allFalse = anyOf(() => false, () => false);
    expect(allFalse(dummyPos)).toBe(false);
  });

  it('never always returns false', () => {
    const n = never();
    expect(n(dummyPos)).toBe(false);
  });

  it('isUniverse matches universe levels', () => {
    expect(isUniverse('U2')(dummyPos)).toBe(true);
    expect(isUniverse('U1', 'U3')(dummyPos)).toBe(false);
  });

  it('isCategory matches category and clmCategory', () => {
    expect(isCategory('diagram')(dummyPos)).toBe(true);
    expect(isCategory('source', 'data')(dummyPos)).toBe(false);
  });

  it('isSurface matches position surface', () => {
    expect(isSurface('list', 'tree')(dummyPos)).toBe(true);
    expect(isSurface('composition')(dummyPos)).toBe(false);
  });

  it('isMutable and isImmutable observe meta.mutable', () => {
    expect(isMutable(dummyPos)).toBe(true);
    expect(isImmutable(dummyPos)).toBe(false);

    const immPos: Position = {
      ...dummyPos,
      meta: { mutable: false }
    };
    expect(isMutable(immPos)).toBe(false);
    expect(isImmutable(immPos)).toBe(true);
  });

  it('isHead and hasExporter observe metadata properties', () => {
    expect(isHead(dummyPos)).toBe(true);
    expect(hasExporter(dummyPos)).toBe(true);

    const noExpPos: Position = {
      ...dummyPos,
      meta: { exportFormats: [] }
    };
    expect(hasExporter(noExpPos)).toBe(false);
  });

  it('domain predicates: isSource, isArtifact, isCollection, isProcess, hasMime', () => {
    expect(hasMime('text/x-tikz')(dummyPos)).toBe(true);
    expect(hasMime('application/json')(dummyPos)).toBe(false);

    const artifactPos: Position = {
      ...dummyPos,
      handle: 'zx:artifacts:export1',
      category: 'artifact'
    };
    expect(isArtifact(artifactPos)).toBe(true);

    const procPos: Position = {
      ...dummyPos,
      universe: 'U1',
      category: 'process'
    };
    expect(isProcess(procPos)).toBe(true);

    const colPos: Position = {
      ...dummyPos,
      category: 'collection',
      mimeType: 'application/x-sqlite3'
    };
    expect(isCollection(colPos)).toBe(true);

    const srcPos: Position = {
      ...dummyPos,
      handle: 'src:main.ts',
      category: 'source'
    };
    expect(isSource(srcPos)).toBe(true);
  });
});
