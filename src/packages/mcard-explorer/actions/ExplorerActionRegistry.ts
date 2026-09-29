/**
 * ExplorerActionRegistry: Pluggable Mealy Machine Action Registry
 *
 * Implements extensible action morphisms O = δ(s, i) for card items.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

export interface CardSummaryItem {
  handle: string;
  hash: string;
  mimeType?: string;
  updatedAt?: string;
  companionMetadata?: Record<string, unknown>;
}

export interface ExplorerActionContext {
  [key: string]: unknown;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface ExplorerAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  isAvailable?: (card: CardSummaryItem) => boolean;
  execute: (card: CardSummaryItem, context?: ExplorerActionContext) => Promise<ActionResult>;
}

export class ExplorerActionRegistry {
  private actions = new Map<string, ExplorerAction>();

  public register(action: ExplorerAction): () => void {
    this.actions.set(action.id, action);
    return () => {
      this.actions.delete(action.id);
    };
  }

  public getAvailableActions(card: CardSummaryItem): ExplorerAction[] {
    return Array.from(this.actions.values()).filter(a => !a.isAvailable || a.isAvailable(card));
  }

  public getAction(id: string): ExplorerAction | undefined {
    return this.actions.get(id);
  }

  public async execute(
    actionId: string,
    handle: string,
    payload?: Partial<CardSummaryItem>
  ): Promise<ActionResult> {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Action '${actionId}' is not registered`);
    }

    const cardItem: CardSummaryItem = {
      handle,
      hash: payload?.hash ?? '',
      mimeType: payload?.mimeType,
      updatedAt: payload?.updatedAt,
      ...payload
    };

    return await action.execute(cardItem, {});
  }
}
