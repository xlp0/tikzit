import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PositionTree, type PositionTreeNode } from '../../../../src/packages/mcard-explorer/ui/PositionTree';

describe('PositionTree (38-DOD-08)', () => {
  const sampleNodes: PositionTreeNode[] = [
    {
      id: 'ns:zx',
      path: 'zx',
      name: 'zx',
      isFolder: true,
      kind: 'namespace',
      children: [
        {
          id: 'ns:zx:diagrams',
          path: 'zx:diagrams',
          name: 'diagrams',
          isFolder: true,
          kind: 'namespace',
          children: [
            {
              id: 'card:ghz',
              path: 'zx:diagrams:ghz',
              name: 'ghz',
              isFolder: false,
              kind: 'card',
              handle: 'zx:diagrams:ghz',
              hash: 'h_ghz12345678'
            }
          ]
        }
      ]
    },
    {
      id: 'card:collection',
      path: 'collection.db',
      name: 'collection.db',
      isFolder: true,
      kind: 'table',
      children: [
        {
          id: 'card:nested',
          path: 'collection.db/users',
          name: 'users',
          isFolder: false,
          kind: 'card',
          handle: 'collection.db:users',
          hash: 'h_nested123'
        }
      ]
    }
  ];

  it('renders namespace and containment levels with data-node-kind attribute', () => {
    const html = renderToString(
      <PositionTree
        nodes={sampleNodes}
        expandedFolders={['zx', 'zx:diagrams', 'collection.db']}
        activeHandle="zx:diagrams:ghz"
      />
    );

    expect(html).toContain('data-testid="mcard-tree-view"');
    expect(html).toContain('data-testid="folder-zx"');
    expect(html).toContain('data-node-kind="namespace"');
    expect(html).toContain('data-testid="folder-collection.db"');
    expect(html).toContain('data-node-kind="table"');
    expect(html).toContain('data-testid="tree-item-zx:diagrams:ghz"');
    expect(html).toContain('data-node-kind="card"');
    expect(html).toContain('h_ghz123');
  });

  it('folder click triggers resolved zoom direction and onToggleFolder', () => {
    const onExecuteDirection = vi.fn();
    const onToggleFolder = vi.fn();

    const element = PositionTree({
      nodes: sampleNodes,
      expandedFolders: [],
      onExecuteDirection,
      onToggleFolder
    }) as any;

    // In React element tree, find folder-zx div and simulate click
    const folderWrapper = element.props.children[0];
    const folderHeader = folderWrapper.props.children[0];
    folderHeader.props.onClick();

    expect(onExecuteDirection).toHaveBeenCalledWith('zoom.enter', { path: 'zx' });
    expect(onToggleFolder).toHaveBeenCalledWith('zx');
  });

  it('card item click invokes onSelectCard', () => {
    const onSelectCard = vi.fn();

    const element = PositionTree({
      nodes: [
        {
          id: 'card:test',
          path: 'test',
          name: 'test',
          isFolder: false,
          kind: 'card',
          handle: 'test:handle'
        }
      ],
      onSelectCard
    }) as any;

    const item = element.props.children[0];
    item.props.onClick();

    expect(onSelectCard).toHaveBeenCalledWith('test:handle');
  });
});
