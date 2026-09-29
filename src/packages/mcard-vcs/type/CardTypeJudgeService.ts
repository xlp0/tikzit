/**
 * CardTypeJudgeService: Universal 5-Phase Type Judgment & Universe Stratification Engine
 *
 * Wraps clm-kernel's TypeInterpreter (48 SSOT types) and registers delta types.
 * Zero DOM dependencies. Contract D ceiling: <= 240 LOC. Contract E compliant.
 */

import {
  TypeInterpreter,
  UniverseLevel,
  classifyClm,
  detectDialect,
  type TypeJudgment
} from 'clm-kernel';
import {
  type CardCategory,
  type ExtendedTypeJudgment,
  type TypeJudgeOptions,
  universeLevelOf,
  universeNameOf
} from './types';

interface ClmOverride {
  clmCategory?: CardCategory;
  universe?: string;
  universeLevel?: UniverseLevel;
}

const CLM_OVERRIDES: Record<string, ClmOverride> = {
  'text/x-tikz': { clmCategory: 'diagram' },
  'application/vnd.zx-graph+json': { clmCategory: 'diagram', universe: 'U0', universeLevel: UniverseLevel.U0_Mcard },
  'application/vnd.pcard+json': { clmCategory: 'process', universe: 'U1', universeLevel: UniverseLevel.U1_Pcard },
  'application/vnd.vcard+json': { clmCategory: 'proof', universe: 'U2', universeLevel: UniverseLevel.U2_Vcard },
  'application/vnd.satori.turn+xml': { clmCategory: 'conversation', universe: 'U3', universeLevel: UniverseLevel.U3_Satori },
  'application/x-sqlite3': { clmCategory: 'collection' }
};

export class CardTypeJudgeService {
  private interpreter: TypeInterpreter;

  constructor() {
    this.interpreter = TypeInterpreter.createDefault();
    this.registerDeltaTypes();
  }

  private registerDeltaTypes(): void {
    // 1. ZX-Calculus Graph specification
    this.interpreter.registerType({
      mime: 'application/vnd.zx-graph+json',
      extensions: ['.zx.json', '.zx'],
      universe: 'U0',
      isBinary: false,
      category: 'diagram',
      description: 'ZX-Calculus graph specification format.',
      magicBytes: [],
      textPatterns: ['"spiders":', '"spider_type":'],
      validator: (content: string | Uint8Array) => {
        if (typeof content === 'string') {
          const trimmed = content.trimStart();
          if (trimmed.startsWith('{')) {
            return content.includes('"spiders"') || content.includes('"spider_type"');
          }
        }
        return false;
      },
      priority: 10
    });

    // 2. Satori Dialogue Turn specification
    this.interpreter.registerType({
      mime: 'application/vnd.satori.turn+xml',
      extensions: ['.satori.xml', '.turn.xml'],
      universe: 'U3',
      isBinary: false,
      category: 'conversation',
      description: 'Satori dialogue turn specification format.',
      magicBytes: [],
      textPatterns: ['<satori', '<card', '<execute', '<turn', '<message'],
      validator: (content: string | Uint8Array) => {
        if (typeof content === 'string') {
          return /<(satori|card|execute|turn|message)\b/i.test(content);
        }
        return false;
      },
      priority: 10
    });
  }

  public judge(options: TypeJudgeOptions): ExtendedTypeJudgment {
    let { data, handle, filename, extHint, declaredMime } = options;

    // Handle-prefix hints before judging when declaredMime is absent
    if (!declaredMime && handle) {
      if (handle.startsWith('zx:diagrams:')) {
        extHint = extHint || '.tikz';
      } else if (handle.startsWith('zx:meta:')) {
        extHint = extHint || '.json';
      }
    }

    // Compound extension mapping
    const pathCandidate = (filename || handle || '').toLowerCase();
    if (!extHint) {
      if (pathCandidate.endsWith('.zx.json')) extHint = '.zx.json';
      else if (pathCandidate.endsWith('.pcard.json')) extHint = '.pcard';
      else if (pathCandidate.endsWith('.vcard.json')) extHint = '.vcard';
      else if (pathCandidate.endsWith('.satori.xml') || pathCandidate.endsWith('.turn.xml')) extHint = '.satori.xml';
    }

    // Execute 5-phase deterministic pipeline in clm-kernel TypeInterpreter
    const baseJudgment: TypeJudgment = this.interpreter.judge({
      data: data as any,
      filename,
      extHint
    });

    // Apply declared MIME if explicitly provided
    let finalMime = baseJudgment.mime;
    let finalUniverse = baseJudgment.universe;
    let finalCategory = baseJudgment.category;
    let confidence = baseJudgment.confidence;

    if (declaredMime && declaredMime.trim() !== '') {
      finalMime = declaredMime.trim();
      const declaredType = this.interpreter.getType(finalMime);
      if (declaredType) {
        finalUniverse = declaredType.universe || finalUniverse;
        finalCategory = declaredType.category || finalCategory;
      }
      confidence = 1.0;
    }

    // Apply single-site CLM overrides (ADR D43)
    const override = CLM_OVERRIDES[finalMime];
    if (override) {
      if (override.universe) finalUniverse = override.universe;
    }

    const universeLevel = override?.universeLevel ?? universeLevelOf(finalUniverse);
    const universeName = universeNameOf(finalUniverse);

    const clmCategory = override?.clmCategory ?? this.mapCategory(finalCategory, finalMime);

    // FND and dialect classification for structured payloads
    const { fndClassification, dialect } = this.probeClmFeatures(data);

    return {
      ...baseJudgment,
      mime: finalMime,
      universe: finalUniverse,
      category: finalCategory,
      confidence,
      universeLevel,
      universeName,
      clmCategory,
      ...(fndClassification ? { fndClassification } : {}),
      ...(dialect ? { dialect } : {})
    };
  }

  private mapCategory(dictCategory: string, mime: string): CardCategory {
    if (mime.startsWith('image/')) return 'blob';
    if (
      mime === 'application/json' ||
      mime === 'application/yaml' ||
      mime === 'application/x-yaml' ||
      mime === 'text/csv'
    ) {
      return 'data';
    }
    switch (dictCategory) {
      case 'code':
      case 'text':
        return 'text';
      case 'data':
        return 'data';
      case 'blob':
      case 'binary':
        return 'blob';
      default:
        return 'data';
    }
  }

  private probeClmFeatures(data: Uint8Array | string): {
    fndClassification?: 'Function' | 'Number';
    dialect?: string;
  } {
    let parsed: unknown = null;
    try {
      if (typeof data === 'string') {
        const trimmed = data.trimStart();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          parsed = JSON.parse(data);
        }
      } else if (data instanceof Uint8Array && data.length > 0) {
        const text = new TextDecoder().decode(data);
        const trimmed = text.trimStart();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          parsed = JSON.parse(text);
        }
      }
    } catch {
      return {};
    }

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const fnd = classifyClm(parsed) as 'Function' | 'Number';
    const dialect = detectDialect(parsed, fnd);
    return {
      fndClassification: fnd,
      dialect: dialect && dialect !== 'UNKNOWN' ? dialect : undefined
    };
  }
}

/**
 * Cordis Service Registration (Gap 6 / DoD 30-DOD-11)
 * Follows clm-kernel's registerCollectionService pattern.
 */
export function registerTypeJudgeService(
  ctx: any,
  service: CardTypeJudgeService = new CardTypeJudgeService()
): CardTypeJudgeService {
  if (ctx && typeof ctx.provide === 'function') {
    ctx.provide('mcard.typeJudge', service);
  } else if (ctx) {
    ctx['mcard.typeJudge'] = service;
  }
  return service;
}
