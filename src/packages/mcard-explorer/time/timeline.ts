/** @layer L4 interface/membrane */
import type { NavigationProvider, Position } from '../poly/types';
import type { InteractionTree } from './InteractionTree';

export interface TimelinePosition extends Position {
  readonly timelineNodeId: string;
}

export function encodeTimelineHash(nodeId: string): string {
  return `#t=${encodeURIComponent(nodeId)}`;
}

export function decodeTimelineHash(hash: string): string | null {
  const match = hash.match(/^#t=([^&]+)/) || hash.match(/^#\/timeline\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const TimelineNavigationProvider: NavigationProvider = {
  id: 'core.timeline',
  label: 'Timeline Navigation',
  appliesTo: (position) => Boolean(position && 'timelineNodeId' in position),
  resolveRoot: async () => [],
  encodeAddress: (position) => {
    const nodeId = (position as TimelinePosition).timelineNodeId || position.id;
    return encodeTimelineHash(nodeId);
  },
  decodeAddress: (address) => {
    const nodeId = decodeTimelineHash(address);
    if (!nodeId) return null;
    return {
      id: `pos:timeline:${nodeId}`,
      handle: '',
      hash: '',
      mimeType: 'application/json',
      surface: 'timeline',
      timelineNodeId: nodeId
    } as TimelinePosition;
  }
};

export function restoreTimelineFromAddress(
  tree: InteractionTree,
  address: string
): string | null {
  const targetId = decodeTimelineHash(address);
  if (targetId) {
    tree.rewind(targetId);
    return targetId;
  }
  return null;
}
