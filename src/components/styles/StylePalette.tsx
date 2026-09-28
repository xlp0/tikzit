import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import type { TikzStyle } from '../../core/domain/types';
import {
  getStyleCategory,
  getStyleFillColor,
  getStyleStrokeColor,
  getStyleShape,
  isEdgeStyle,
  isStyleDashed,
} from '../../core/styles/TikzStyleModel';

export interface StylePaletteProps {
  stylesCatalogStore: any;
  activeStyleStore: any;
  selectedElementsStore: any;
  onApplyStyle: (styleName: string) => void;
  onOpenStyleEditor: () => void;
}

export const StylePalette: React.FC<StylePaletteProps> = ({
  stylesCatalogStore,
  activeStyleStore,
  selectedElementsStore,
  onApplyStyle,
  onOpenStyleEditor,
}) => {
  const catalog = useStore(stylesCatalogStore);
  const activeStyle = useStore(activeStyleStore);
  const selected = useStore(selectedElementsStore);

  const styles: TikzStyle[] = catalog?.styles || [];

  // Group styles by category
  const categories = Array.from(
    new Set(styles.map((s) => getStyleCategory(s)))
  );

  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filteredStyles =
    activeCategory === 'All'
      ? styles
      : styles.filter((s) => getStyleCategory(s) === activeCategory);

  const handleSwatchClick = (styleName: string) => {
    activeStyleStore.set(styleName);
    const hasSelection = (selected?.nodes?.length || 0) > 0 || (selected?.edges?.length || 0) > 0;
    if (hasSelection) {
      onApplyStyle(styleName);
    }
  };

  return (
    <div id="style-palette-island" className="flex flex-col h-full bg-[#161922] text-xs text-[#94a3b8]">
      {/* Header with Style Editor Launcher */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e3446]">
        <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
          Style Palette
        </span>
        <button
          id="open-style-editor-btn"
          onClick={onOpenStyleEditor}
          className="px-2 py-0.5 text-[10px] font-medium bg-[#1f2330] hover:bg-[#2b3145] text-slate-300 rounded border border-[#2e3446] transition-colors"
          title="Open Style Editor"
        >
          Manage Styles
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-1 p-2 overflow-x-auto border-b border-[#2e3446]/60 scrollbar-thin">
        <button
          onClick={() => setActiveCategory('All')}
          className={`style-category-tab px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'All'
              ? 'bg-blue-600 text-white'
              : 'bg-[#1f2330] hover:bg-[#282e40] text-[#94a3b8]'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`style-category-tab px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-[#1f2330] hover:bg-[#282e40] text-[#94a3b8]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Swatches Grid */}
      <div className="p-2 overflow-y-auto flex-1 grid grid-cols-2 gap-1.5 auto-rows-max">
        {filteredStyles.map((s) => {
          const isEdge = isEdgeStyle(s);
          const fill = getStyleFillColor(s);
          const stroke = getStyleStrokeColor(s);
          const shape = getStyleShape(s);
          const isDashed = isStyleDashed(s);
          const isActive = activeStyle === s.name;

          return (
            <button
              key={s.name}
              data-style-name={s.name}
              onClick={() => handleSwatchClick(s.name)}
              className={`flex items-center space-x-2 px-2 py-1.5 rounded border text-left transition-all group ${
                isActive
                  ? 'bg-blue-950/40 border-blue-500 shadow-sm text-blue-200'
                  : 'bg-[#1a1d26] hover:bg-[#222736] border-[#2e3446] text-slate-300'
              }`}
              title={`Apply style: ${s.name} (${getStyleCategory(s)})`}
            >
              {/* Miniature Glyphs */}
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {isEdge ? (
                  <div
                    className="w-4 h-0.5"
                    style={{
                      backgroundColor: stroke !== 'transparent' ? stroke : '#94a3b8',
                      borderTop: isDashed ? '1px dashed currentColor' : undefined,
                    }}
                  />
                ) : shape === 'rectangle' ? (
                  <div
                    className="w-3.5 h-3.5 rounded-sm"
                    style={{
                      backgroundColor: fill !== 'transparent' ? fill : 'transparent',
                      border: `1.5px solid ${stroke !== 'transparent' ? stroke : '#94a3b8'}`,
                    }}
                  />
                ) : shape === 'none' ? (
                  <div className="w-2 h-2 rounded-full border border-dashed border-[#64748b]" />
                ) : (
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{
                      backgroundColor: fill !== 'transparent' ? fill : 'transparent',
                      border: `1.5px solid ${stroke !== 'transparent' ? stroke : '#94a3b8'}`,
                    }}
                  />
                )}
              </div>
              <span className="truncate text-[11px] font-medium">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
