/**
 * Coeffect Resolution & Verification for Cordis Context
 *
 * Enforces declarative coeffect contracts without runtime ambient globals.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { Context } from 'cordis';

export interface CoeffectValidationResult {
  valid: boolean;
  missing: string[];
}

export function isServiceAvailable(ctx: Context, key: string): boolean {
  if (!ctx) return false;
  return (ctx as any)[key] !== undefined && (ctx as any)[key] !== null;
}

export function validateCoeffects(ctx: Context, requiredKeys: string[]): CoeffectValidationResult {
  const missing: string[] = [];

  for (const key of requiredKeys) {
    if (!isServiceAvailable(ctx, key)) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

export function assertCoeffects(ctx: Context, requiredKeys: string[]): void {
  const { valid, missing } = validateCoeffects(ctx, requiredKeys);
  if (!valid) {
    throw new Error(
      `Coeffect check failed: missing required services on Context: [${missing.join(', ')}]`
    );
  }
}
