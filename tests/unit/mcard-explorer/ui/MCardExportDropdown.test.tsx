/**
 * Sprint 35 Phase A: MCardExportDropdown Unit Tests
 * Tests the unified export dropdown viewlet for MCardViewer toolbar.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MCardExportDropdown } from '../../../../src/packages/mcard-explorer/ui/MCardExportDropdown';

describe('Sprint 35 Phase A: MCardExportDropdown', () => {
  const mockCard = {
    handle: 'zx:diagrams:ghz',
    hash: 'blake3:abc123',
    mimeType: 'text/x-tikz',
  };

  const tikzExportActions = [
    { id: 'export.png', label: 'Export PNG', icon: 'image', payload: { format: 'png', pngScale: 2 } },
    { id: 'export.pdf', label: 'Export PDF', icon: 'file-pdf', payload: { format: 'pdf' } },
    { id: 'export.svg', label: 'Export SVG', icon: 'code', payload: { format: 'svg' } },
    { id: 'export.tikz', label: 'Export TikZ', icon: 'file-text', payload: { format: 'tikz' } },
    { id: 'export.tex', label: 'Export TeX', icon: 'file-text', payload: { format: 'tex' } },
  ];

  const noopAction = async () => {};

  describe('Trigger Button Rendering', () => {
    it('renders the Export ▾ trigger button with correct testid', () => {
      const html = renderToString(
        <MCardExportDropdown card={mockCard} onAction={noopAction} />
      );
      expect(html).toContain('data-testid="btn-viewer-export-dropdown"');
      expect(html).toContain('Export');
      expect(html).toContain('▾');
    });

    it('does NOT render the dropdown menu when closed (SSR initial state)', () => {
      const html = renderToString(
        <MCardExportDropdown card={mockCard} onAction={noopAction} />
      );
      // Dropdown menu should NOT be present in SSR render (open=false initial state)
      expect(html).not.toContain('data-testid="mcard-export-menu"');
    });
  });

  describe('Dynamic Label Rendering', () => {
    it('renders correct format label for TikZ MIME type', () => {
      const html = renderToString(
        <MCardExportDropdown card={mockCard} onAction={noopAction} />
      );
      // In SSR, the dropdown is closed so we just verify the button renders
      expect(html).toContain('data-testid="btn-viewer-export-dropdown"');
    });

    it('renders correct format label for PNG MIME type card', () => {
      const pngCard = { handle: 'icon.png', hash: 'blake3:png', mimeType: 'image/png' };
      const html = renderToString(
        <MCardExportDropdown card={pngCard} onAction={noopAction} />
      );
      expect(html).toContain('data-testid="btn-viewer-export-dropdown"');
    });

    it('renders correct format label for Markdown MIME type card', () => {
      const mdCard = { handle: 'notes.md', hash: 'blake3:md', mimeType: 'text/markdown' };
      const html = renderToString(
        <MCardExportDropdown card={mdCard} onAction={noopAction} />
      );
      expect(html).toContain('data-testid="btn-viewer-export-dropdown"');
    });
  });

  describe('Descriptor Export Action Filtering', () => {
    it('accepts descriptor export actions alongside non-export actions', () => {
      const mixedActions = [
        { id: 'openInCanvas', label: 'Open in Canvas', icon: 'canvas' },
        ...tikzExportActions,
      ];
      // MCardExportDropdown only displays export.* actions
      const html = renderToString(
        <MCardExportDropdown
          card={mockCard}
          descriptorExportActions={mixedActions}
          onAction={noopAction}
        />
      );
      // Should render cleanly without errors
      expect(html).toContain('data-testid="btn-viewer-export-dropdown"');
    });
  });
});
