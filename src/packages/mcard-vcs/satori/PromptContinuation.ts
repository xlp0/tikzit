/**
 * PromptContinuation: Conversational Prompt Continuation & Conflict Handler
 *
 * Implements conversational prompt continuation for conflict resolution and exploratory filters.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import type { TurnProposal, TurnExecutionResult } from './types';

export class PromptContinuation {
  public resolveContinuation(
    previousResult: TurnExecutionResult,
    userReply: string,
    authorDid: string
  ): TurnProposal | null {
    const text = userReply.trim().toLowerCase();

    // 1. Conflict resolution continuation
    if (previousResult.status === 'conflict') {
      if (text.includes('ours') || text === 'keep ours' || text === 'use ours') {
        return {
          command: 'commit',
          authorDid,
          message: 'Resolve conflict using ours strategy'
        };
      }
      if (text.includes('theirs') || text === 'keep theirs' || text === 'use theirs') {
        return {
          command: 'commit',
          authorDid,
          message: 'Resolve conflict using theirs strategy'
        };
      }
    }

    // 2. Exploration refinement continuation
    if (previousResult.status === 'queried') {
      if (text.startsWith('filter:') || text.startsWith('search:')) {
        const query = userReply.split(':')[1]?.trim() ?? '';
        return {
          command: 'explore',
          query,
          authorDid
        };
      }
      if (text.startsWith('show ') || text.startsWith('diff ')) {
        const parts = userReply.trim().split(/\s+/);
        const handle = parts[1];
        return {
          command: 'diff',
          handle,
          authorDid
        };
      }
    }

    return null;
  }
}
