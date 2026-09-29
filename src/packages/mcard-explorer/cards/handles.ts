/** @layer L4 interface/membrane */

export interface CardStorePort {
  set(
    handle: string,
    content: Uint8Array,
    meta?: Record<string, unknown>
  ): Promise<{ hash: string }>;
  getByHash(
    hash: string
  ): Promise<{ content: Uint8Array; mimeType: string } | null>;
}

export interface CardVcsPort {
  getHistory(
    handle: string
  ): Promise<readonly { hash: string; changedAt: string; message?: string }[]>;
}

export interface CardRuntimePort {
  invoke(
    pcardHandle: string,
    input: Uint8Array
  ): Promise<{ handle: string; hash: string }>;
}

export interface CardContentProvider {
  getContent(handle: string): Promise<{
    handle: string;
    hash: string;
    content?: Uint8Array;
    text?: string;
    mimeType?: string;
  } | null>;
}

/**
 * cardCreate (η): lifts raw content into an MCard.
 */
export async function cardCreate(
  store: CardStorePort,
  handle: string,
  content: Uint8Array,
  meta?: Record<string, unknown>
): Promise<{ handle: string; hash: string }> {
  const res = await store.set(handle, content, meta);
  return { handle, hash: res.hash };
}

/**
 * cardGet: dereferences an MCard handle via the content provider.
 */
export async function cardGet(
  provider: CardContentProvider,
  handle: string
) {
  return provider.getContent(handle);
}

/**
 * cardGetByHash (μ): content-addressed deduplicating read.
 */
export async function cardGetByHash(
  store: CardStorePort,
  hash: string
) {
  return store.getByHash(hash);
}

/**
 * cardDerive: produces a new MCard from an existing card with lineage tracking.
 */
export async function cardDerive(
  store: CardStorePort,
  parentHandle: string,
  newHandle: string,
  transform: (c: Uint8Array) => Uint8Array,
  origContent: Uint8Array,
  meta?: Record<string, unknown>
): Promise<{ handle: string; hash: string }> {
  const derivedBytes = transform(origContent);
  return cardCreate(store, newHandle, derivedBytes, {
    ...meta,
    derivedFrom: parentHandle,
    derivedAt: new Date().toISOString()
  });
}

/**
 * cardInvoke: executes a PCard as a Kleisli arrow A -> MCard(B).
 * Invariant (ADR D48): returns a valid, dereferenceable MCard handle.
 */
export async function cardInvoke(
  runtime: CardRuntimePort,
  pcardHandle: string,
  input: Uint8Array
): Promise<{ handle: string; hash: string }> {
  return runtime.invoke(pcardHandle, input);
}

/**
 * cardFork: creates a variant card with shared ancestral lineage.
 */
export async function cardFork(
  store: CardStorePort,
  handle: string,
  newHandle: string,
  content: Uint8Array,
  meta?: Record<string, unknown>
): Promise<{ handle: string; hash: string }> {
  return cardCreate(store, newHandle, content, {
    ...meta,
    forkedFrom: handle,
    forkedAt: new Date().toISOString()
  });
}

/**
 * cardHistory: reads the Merkle lineage history of a card handle.
 */
export async function cardHistory(
  vcs: CardVcsPort,
  handle: string
) {
  return vcs.getHistory(handle);
}
