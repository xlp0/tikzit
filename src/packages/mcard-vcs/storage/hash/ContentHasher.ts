/**
 * ContentHasher: BLAKE3 & SHA-256 CAS Hasher
 *
 * Grounded in clm-kernel's Blake3Provider with canonical 'blake3:' prefix.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { Blake3Provider, BLAKE3_HASH_PREFIX, Sha256Provider, SHA256_HASH_PREFIX } from 'clm-kernel';

export class ContentHasher {
  private blake3 = new Blake3Provider();
  private sha256 = new Sha256Provider();

  /**
   * Hashes content using BLAKE3 and returns canonical 'blake3:<hex>' string.
   */
  public hash(content: Uint8Array | string): string {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const rawHex = this.blake3.hash(bytes);
    return `${BLAKE3_HASH_PREFIX}${rawHex}`;
  }

  /**
   * Hashes content using SHA-256 and returns canonical 'sha256:<hex>' string.
   */
  public hashSha256(content: Uint8Array | string): string {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const rawHex = this.sha256.hash(bytes);
    return `${SHA256_HASH_PREFIX}${rawHex}`;
  }

  /**
   * Verifies that the given content matches the expected hash.
   */
  public verify(content: Uint8Array | string, expectedHash: string): boolean {
    if (expectedHash.startsWith(SHA256_HASH_PREFIX)) {
      return this.hashSha256(content) === expectedHash;
    }
    // Default to BLAKE3
    const actual = this.hash(content);
    if (expectedHash.startsWith(BLAKE3_HASH_PREFIX)) {
      return actual === expectedHash;
    }
    // Raw hex without prefix comparison fallback
    return actual === `${BLAKE3_HASH_PREFIX}${expectedHash}`;
  }

  /**
   * Strips any recognized hash prefix ('blake3:', 'sha256:', 'urn:mcard:blake3:').
   */
  public static stripPrefix(hash: string): string {
    if (hash.startsWith(BLAKE3_HASH_PREFIX)) {
      return hash.slice(BLAKE3_HASH_PREFIX.length);
    }
    if (hash.startsWith(SHA256_HASH_PREFIX)) {
      return hash.slice(SHA256_HASH_PREFIX.length);
    }
    if (hash.startsWith('urn:mcard:blake3:')) {
      return hash.slice('urn:mcard:blake3:'.length);
    }
    return hash;
  }

  /**
   * Normalizes any raw hex or legacy URN hash into canonical 'blake3:<hex>'.
   */
  public static canonicalize(hash: string): string {
    const raw = ContentHasher.stripPrefix(hash);
    return `${BLAKE3_HASH_PREFIX}${raw}`;
  }
}
