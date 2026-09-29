/**
 * SatoriVcsRenderer: React Viewlets for Satori VCS & Explorer Elements
 *
 * Renders <version-dag>, <diff-view>, and <mcard-explorer> in React.
 * Zero DOM globals (window/document). Contract D ceiling: <= 250 LOC.
 */

import React from 'react';
import type {
  SatoriVersionDagElement,
  SatoriDiffViewElement,
  SatoriExplorerElement
} from '../../satori/types';

export interface VersionDagRendererProps {
  dag: SatoriVersionDagElement;
  onCommitSelect?: (commitId: string) => void;
}

export const VersionDagRenderer: React.FC<VersionDagRendererProps> = ({ dag, onCommitSelect }) => {
  return (
    <div className="satori-dag-container p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800" data-testid="satori-version-dag">
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
        <span>Lineage DAG: {dag.attrs.handle}</span>
        <span className="text-xs font-mono text-slate-500">HEAD: {dag.attrs.headCommit.slice(0, 8)}</span>
      </div>
      <ul className="space-y-2 border-l-2 border-indigo-500 pl-3 ml-2">
        {dag.children.map((commit, idx) => (
          <li
            key={commit.attrs.id || idx}
            className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded transition-colors"
            onClick={() => onCommitSelect?.(commit.attrs.id)}
            data-testid={`commit-node-${commit.attrs.id.slice(0, 8)}`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {commit.attrs.id.slice(0, 8)}
              </span>
              <span className="text-slate-400">{commit.attrs.date.slice(0, 10)}</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">{commit.attrs.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export interface DiffViewRendererProps {
  diff: SatoriDiffViewElement;
}

export const DiffViewRenderer: React.FC<DiffViewRendererProps> = ({ diff }) => {
  const lines = diff.content.split('\n');

  return (
    <div className="satori-diff-container rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden" data-testid="satori-diff-view">
      <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-300">
        <span>{diff.attrs.handle}</span>
        <div className="flex gap-2">
          <span className="text-emerald-600">+{diff.attrs.additions}</span>
          <span className="text-rose-600">-{diff.attrs.deletions}</span>
        </div>
      </div>
      <pre className="p-3 text-xs font-mono bg-white dark:bg-slate-950 overflow-x-auto leading-relaxed">
        {lines.map((line, idx) => {
          let lineClass = 'text-slate-700 dark:text-slate-300';
          if (line.startsWith('+')) lineClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600';
          if (line.startsWith('-')) lineClass = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600';
          return (
            <div key={idx} className={`px-2 rounded ${lineClass}`}>
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
};

export interface ExplorerRendererProps {
  explorer: SatoriExplorerElement;
  onSelect?: (handle: string) => void;
}

export const ExplorerRenderer: React.FC<ExplorerRendererProps> = ({ explorer, onSelect }) => {
  const items = explorer.children ?? [];

  return (
    <div className="satori-explorer-container rounded-lg border border-slate-200 dark:border-slate-800 p-3" data-testid="satori-explorer-viewlet">
      <div className="text-xs font-semibold text-slate-500 mb-2">
        MCard Corpus ({items.length} cards)
      </div>
      <ul className="space-y-1">
        {items.map(item => (
          <li
            key={item.attrs.handle}
            className="flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs cursor-pointer"
            onClick={() => onSelect?.(item.attrs.handle)}
            data-testid={`mcard-row-${item.attrs.handle}`}
          >
            <span className="font-medium text-slate-800 dark:text-slate-200">{item.attrs.handle}</span>
            <span className="font-mono text-slate-400">{item.attrs.hash.slice(0, 10)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
