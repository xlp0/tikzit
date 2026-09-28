import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';

export const ConsolePanel: React.FC<IDockviewPanelProps> = () => {
  return (
    <div className="w-full h-full bg-[#0f1117] p-2.5 font-mono text-[11px] text-[#94a3b8] overflow-y-auto space-y-1" data-testid="panel-console" data-panel="console">
      <div className="text-emerald-400">[INIT] TikZiT Web Runtime v2.2.0 initialized.</div>
      <div className="text-blue-400">[CORDIS] Service mesh context mounted. Services: graph, parser, styles, mcard.</div>
      <div className="text-slate-400">[CLM] Active MCard CID: blake3:7a4f32... (sequence: 0, author: did:key:z6Mk...)</div>
      <div className="text-slate-500">[AST] Parsed 2 nodes, 2 edges from 01_spider_fusion.tikz (0 syntax errors).</div>
    </div>
  );
};
