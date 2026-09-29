/**
 * PTR Microkernel Plugin Specification Types
 *
 * Canonical definition for Petri Net transition plugins (Contract-First).
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

export interface PtrTransitionDefinition {
  name: string;
  inputSchema: string;
  outputSchema: string;
  morphism: (input: any) => Promise<any>;
}

export interface PtrPluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  places: string[];
  transitions: PtrTransitionDefinition[];
  coeffects: string[];
  enabled: boolean;
}
