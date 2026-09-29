/** @layer L4 interface/membrane */
import type { CardPort } from '../ports';

export interface StudioPortDescriptor {
  readonly id: string;
  readonly kind: 'in' | 'out';
  readonly mime: string;
  readonly universe?: string;
  readonly label: string;
  readonly required: boolean;
}

/**
 * toStudioPortDescriptor (ADR D34 / ADR D54):
 * Maps CardPort to mcard-studio port descriptor with field-for-field parity.
 */
export function toStudioPortDescriptor(port: CardPort): StudioPortDescriptor {
  return {
    id: port.id,
    kind: port.direction,
    mime: port.type.mime,
    universe: port.type.universe,
    label: port.label,
    required: port.required
  };
}
