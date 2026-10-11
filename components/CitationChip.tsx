'use client';

import React, { useState } from 'react';
import { CitationSource } from './types';
import { IconChevronDown, IconChevronUp, IconCopy, IconCheck, IconFileText } from './Icons';

interface CitationChipProps {
  source: CitationSource;
  /** All source IDs merged into this chip (same file + page) */
  mergedIds?: number[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function CitationChip({ source, mergedIds, isExpanded, onToggle }: CitationChipProps) {
  const [copied, setCopied] = useState(false);

  const docName = source.documentName || source.document_name || 'Document';
  const pageLabel = source.page ? `, p.${source.page}` : '';
  const chipText = `${docName}${pageLabel}`;
  // Badge shows all merged IDs (e.g. [1] or [1,3])
  const idBadge = mergedIds && mergedIds.length > 1 ? mergedIds.join(',') : String(source.id);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(source.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed silently
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-all text-left ${
          isExpanded
            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700/80 text-indigo-700 dark:text-indigo-300 shadow-sm'
            : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 hover:border-zinc-300 dark:hover:border-zinc-600'
        }`}
      >
        <span className="flex items-center justify-center px-1 h-4 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 min-w-[16px]">
          {idBadge}
        </span>
        <span className="truncate max-w-[200px] sm:max-w-[260px]">{chipText}</span>
        {isExpanded ? (
          <IconChevronUp className="w-3.5 h-3.5 shrink-0 opacity-70" />
        ) : (
          <IconChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900/90 rounded-lg border border-indigo-200 dark:border-indigo-800/60 text-xs text-zinc-700 dark:text-zinc-300 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100 truncate">
              <IconFileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{docName}</span>
              {source.page && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  Page {source.page}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition"
              title="Copy snippet"
            >
              {copied ? (
                <>
                  <IconCheck className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <IconCopy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto text-[11px] font-mono bg-white/60 dark:bg-black/30 p-2 rounded border border-zinc-200/60 dark:border-zinc-800">
            {source.snippet}
          </div>
        </div>
      )}
    </div>
  );
}
