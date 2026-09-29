/** @layer L4 interface/membrane */
import type { Position } from './types';

export const allOf = <P extends Position>(...ps: Array<(x: P) => boolean>) => (x: P): boolean => {
  for (const p of ps) {
    if (!p(x)) return false;
  }
  return true;
};

export const anyOf = <P extends Position>(...ps: Array<(x: P) => boolean>) => (x: P): boolean => {
  for (const p of ps) {
    if (p(x)) return true;
  }
  return false;
};

export const never = <P extends Position>() => (_x: P): boolean => false;

export const isUniverse = (...u: string[]) => (p: Position): boolean =>
  Boolean(p.universe && u.includes(p.universe));

export const isCategory = (...c: string[]) => (p: Position): boolean => {
  const cat = p.clmCategory || p.category;
  return Boolean(cat && c.includes(cat));
};

export const isSurface = (...s: Position['surface'][]) => (p: Position): boolean =>
  s.includes(p.surface);

export const isMutable = (p: Position): boolean => p.meta?.mutable === true;

export const isImmutable = (p: Position): boolean => p.meta?.mutable === false;

export const isHead = (p: Position): boolean => p.meta?.isHead !== false;

export const hasExporter = (p: Position): boolean =>
  Array.isArray(p.meta?.exportFormats) && (p.meta?.exportFormats as string[]).length > 0;

export const isSource = (p: Position): boolean =>
  p.category === 'source' || p.clmCategory === 'source' || p.handle.startsWith('src:');

export const isArtifact = (p: Position): boolean =>
  p.category === 'artifact' || p.clmCategory === 'artifact' || p.handle.startsWith('zx:artifacts:');

export const isCollection = (p: Position): boolean =>
  p.category === 'collection' || p.mimeType === 'application/x-sqlite3';

export const isProcess = (p: Position): boolean =>
  p.universe === 'U1' || p.category === 'process' || p.clmCategory === 'process';

export const hasMime = (...mimes: string[]) => (p: Position): boolean =>
  mimes.includes(p.mimeType);
