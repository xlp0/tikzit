import { describe, it, expect } from 'vitest';
import {
  tensor,
  substitute,
  coproduct,
  type CompositionPlan
} from '../../src/packages/mcard-explorer/cards/composition';
import type { CardInterface, CardPort } from '../../src/packages/mcard-explorer/cards/ports';
import type { TypeJudgment } from 'clm-kernel';

function makeJudgment(mime: string): TypeJudgment {
  return {
    mime,
    universe: 'U0',
    isBinary: false,
    confidence: 1.0,
    category: 'data',
    matchedRule: 'default'
  };
}

function portSig(p: CardPort): string {
  return `${p.id}:${p.direction}:${p.type.mime}:${p.type.universe ?? ''}`;
}

function expectPortsEquivalent(actual: readonly CardPort[], expected: readonly CardPort[]) {
  const actualSigs = Array.from(new Set(actual.map(portSig))).sort();
  const expectedSigs = Array.from(new Set(expected.map(portSig))).sort();
  expect(actualSigs).toEqual(expectedSigs);
}

function toCardInterface(plan: CompositionPlan, handle: string): CardInterface {
  return {
    handle,
    hash: `blake3:${handle}`,
    judgment: makeJudgment('application/x-composite'),
    ports: plan.unbound
  };
}

describe('Polynomial Operad Laws (40-DOD-01)', () => {
  const cardA: CardInterface = {
    handle: 'card:A',
    hash: 'hash:A',
    judgment: makeJudgment('text/vnd.tikz'),
    ports: [
      { id: 'in:A1', direction: 'in', type: { mime: 'text/vnd.tikz' }, label: 'In A1', required: true },
      { id: 'in:A2', direction: 'in', type: { mime: 'application/json' }, label: 'In A2', required: false },
      { id: 'out:A', direction: 'out', type: { mime: 'image/svg+xml' }, label: 'Out A', required: true }
    ]
  };

  const cardB: CardInterface = {
    handle: 'card:B',
    hash: 'hash:B',
    judgment: makeJudgment('text/vnd.tikz'),
    ports: [
      { id: 'in:B', direction: 'in', type: { mime: 'text/plain' }, label: 'In B', required: true },
      { id: 'out:B', direction: 'out', type: { mime: 'text/vnd.tikz' }, label: 'Out B', required: true }
    ]
  };

  const cardC: CardInterface = {
    handle: 'card:C',
    hash: 'hash:C',
    judgment: makeJudgment('text/plain'),
    ports: [
      { id: 'out:C', direction: 'out', type: { mime: 'text/plain' }, label: 'Out C', required: true }
    ]
  };

  const unitCard: CardInterface = {
    handle: 'card:unit',
    hash: 'hash:unit',
    judgment: makeJudgment('application/x-empty'),
    ports: []
  };

  describe('Tensor (⊗) Laws', () => {
    it('satisfies Associativity: (a ⊗ b) ⊗ c ≅ a ⊗ (b ⊗ c)', () => {
      const leftTensor = tensor(toCardInterface(tensor(cardA, cardB), 'AB'), cardC);
      const rightTensor = tensor(cardA, toCardInterface(tensor(cardB, cardC), 'BC'));

      expect(leftTensor.legality.ok).toBe(true);
      expect(rightTensor.legality.ok).toBe(true);
      expectPortsEquivalent(leftTensor.unbound, rightTensor.unbound);
    });

    it('satisfies Unit: a ⊗ I ≅ a and I ⊗ a ≅ a', () => {
      const rightUnit = tensor(cardA, unitCard);
      const leftUnit = tensor(unitCard, cardA);

      expectPortsEquivalent(rightUnit.unbound, cardA.ports);
      expectPortsEquivalent(leftUnit.unbound, cardA.ports);
    });
  });

  describe('Coproduct (+) Laws', () => {
    it('satisfies Associativity: (a + b) + c ≅ a + (b + c)', () => {
      const leftCoprod = coproduct(toCardInterface(coproduct(cardA, cardB), 'A+B'), cardC);
      const rightCoprod = coproduct(cardA, toCardInterface(coproduct(cardB, cardC), 'B+C'));

      expect(leftCoprod.legality.ok).toBe(true);
      expect(rightCoprod.legality.ok).toBe(true);
      expectPortsEquivalent(leftCoprod.unbound, rightCoprod.unbound);
    });

    it('satisfies Commutativity: a + b ≅ b + a', () => {
      const coprodAB = coproduct(cardA, cardB);
      const coprodBA = coproduct(cardB, cardA);

      expectPortsEquivalent(coprodAB.unbound, coprodBA.unbound);
    });

    it('satisfies Unit: a + 0 ≅ a', () => {
      const coprodUnit = coproduct(cardA, unitCard);
      expectPortsEquivalent(coprodUnit.unbound, cardA.ports);
    });
  });

  describe('Port-Level Distributivity Law', () => {
    it('satisfies (a + b) ⊗ c ≅ (a ⊗ c) + (b ⊗ c)', () => {
      // (a + b) ⊗ c
      const leftPlan = tensor(toCardInterface(coproduct(cardA, cardB), 'A+B'), cardC);

      // (a ⊗ c) + (b ⊗ c)
      const ac = toCardInterface(tensor(cardA, cardC), 'AxC');
      const bc = toCardInterface(tensor(cardB, cardC), 'BxC');
      const rightPlan = coproduct(ac, bc);

      expectPortsEquivalent(leftPlan.unbound, rightPlan.unbound);
    });
  });

  describe('Substitution (◁) Associativity Law', () => {
    it('satisfies (a ◁ b) ◁ c ≅ a ◁ (b ◁ c)', () => {
      // (a ◁ b) where b's out:B plugs into a's in:A1
      const planAB = substitute(cardA, cardB, 'in:A1');
      expect(planAB.legality.ok).toBe(true);
      const cardAB = toCardInterface(planAB, 'AB');

      // (a ◁ b) ◁ c where c's out:C plugs into b's in:B
      const planAB_C = substitute(cardAB, cardC, 'in:B');
      expect(planAB_C.legality.ok).toBe(true);

      // (b ◁ c) where c's out:C plugs into b's in:B
      const planBC = substitute(cardB, cardC, 'in:B');
      expect(planBC.legality.ok).toBe(true);
      const cardBC = toCardInterface(planBC, 'BC');

      // a ◁ (b ◁ c) where bc's out:B plugs into a's in:A1
      const planA_BC = substitute(cardA, cardBC, 'in:A1');
      expect(planA_BC.legality.ok).toBe(true);

      expectPortsEquivalent(planAB_C.unbound, planA_BC.unbound);
    });
  });
});
