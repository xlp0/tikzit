/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';

/** A port type is a kernel-grounded content type: mime + universe + optional category. */
export interface PortType {
  readonly mime: string;
  readonly universe?: string;
  readonly category?: string;
  readonly arity?: 'one' | 'many' | 'optional';
}

export interface CardPort {
  readonly id: string;
  readonly direction: 'in' | 'out';
  readonly type: PortType;
  readonly label: string;
  readonly required: boolean;
}

export interface CardInterface {
  readonly handle: string;
  readonly hash: string;
  readonly judgment: TypeJudgment;
  readonly ports: readonly CardPort[];
}

export interface CardPortInput {
  readonly handle: string;
  readonly hash: string;
  readonly judgment: TypeJudgment;
  readonly content?: Uint8Array;
  readonly text?: string;
}

export interface CardPortProvider {
  readonly id: string;
  readonly appliesTo: (j: TypeJudgment, handle: string) => boolean;
  readonly derivePorts: (input: CardPortInput) => readonly CardPort[];
}

export class CardPortRegistry {
  private providers: CardPortProvider[] = [];

  public register(provider: CardPortProvider): () => void {
    this.providers.unshift(provider);
    return () => {
      this.providers = this.providers.filter(p => p !== provider);
    };
  }

  public listProviders(): readonly CardPortProvider[] {
    return this.providers;
  }

  public derivePorts(input: CardPortInput): readonly CardPort[] {
    for (const provider of this.providers) {
      try {
        if (provider.appliesTo(input.judgment, input.handle)) {
          return provider.derivePorts(input);
        }
      } catch {
        // fail closed
      }
    }
    return [];
  }

  public createInterface(
    handle: string,
    hash: string,
    judgment: TypeJudgment,
    content?: Uint8Array,
    text?: string
  ): CardInterface {
    const ports = this.derivePorts({ handle, hash, judgment, content, text });
    return { handle, hash, judgment, ports };
  }
}
