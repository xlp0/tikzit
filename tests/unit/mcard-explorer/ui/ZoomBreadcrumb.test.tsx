import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ZoomBreadcrumb } from '../../../../src/packages/mcard-explorer/ui/ZoomBreadcrumb';
import type { ZoomCrumb } from '../../../../src/packages/mcard-explorer/zoom/types';

describe('ZoomBreadcrumb Viewlet (38-DOD-09)', () => {
  const crumbs: ZoomCrumb[] = [
    { label: 'Root', handle: 'root', cursor: 0 },
    { label: 'collection.db', handle: 'collection.db', cursor: 1 },
    { label: 'users', handle: 'collection.db:users', cursor: 2 }
  ];

  it('renders data-testid="zoom-breadcrumb" with clickable crumb links', () => {
    const html = renderToString(
      <ZoomBreadcrumb crumbs={crumbs} activeCursor={2} onNavigate={() => {}} />
    );

    expect(html).toContain('data-testid="zoom-breadcrumb"');
    expect(html).toContain('data-testid="zoom-crumb-0"');
    expect(html).toContain('data-testid="zoom-crumb-1"');
    expect(html).toContain('data-testid="zoom-crumb-2"');
    expect(html).toContain('Root');
    expect(html).toContain('collection.db');
    expect(html).toContain('users');
  });

  it('clicking non-active crumb dispatches onNavigate with crumb cursor (root restores level 0)', () => {
    const onNavigate = vi.fn();
    const element = ZoomBreadcrumb({
      crumbs,
      activeCursor: 2,
      onNavigate
    }) as any;

    // In React element tree, element is <nav>, children is array of React.Fragment
    const navChildren = React.Children.toArray(element.props.children);
    expect(navChildren.length).toBe(3);

    // Fragment 0 contains crumb 0 (Root)
    const frag0 = navChildren[0] as any;
    const button0 = React.Children.toArray(frag0.props.children).find(
      (c: any) => c?.props?.['data-testid'] === 'zoom-crumb-0'
    ) as any;
    expect(button0).toBeDefined();

    button0.props.onClick();
    expect(onNavigate).toHaveBeenCalledWith(0);

    // Fragment 1 contains crumb 1 (collection.db)
    const frag1 = navChildren[1] as any;
    const button1 = React.Children.toArray(frag1.props.children).find(
      (c: any) => c?.props?.['data-testid'] === 'zoom-crumb-1'
    ) as any;
    expect(button1).toBeDefined();

    button1.props.onClick();
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
});
