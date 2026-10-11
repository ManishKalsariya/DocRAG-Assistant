'use client';

import React from 'react';
import { DocumentItem } from './types';
import { FileUpload } from './FileUpload';
import { DocumentList } from './DocumentList';
import { IconSparkles, IconX, IconAlertCircle } from './Icons';

interface SidebarProps {
  documents: DocumentItem[];
  onUploadSuccess: (doc: DocumentItem) => void;
  onRemoveDocument: (id: string) => void;
  onClearAllDocuments: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isStreaming?: boolean;
  deletingId?: string | null;
  error?: string | null;
  onClearError?: () => void;
}

export function Sidebar({
  documents,
  onUploadSuccess,
  onRemoveDocument,
  onClearAllDocuments,
  isOpenMobile,
  onCloseMobile,
  isStreaming,
  deletingId,
  error,
  onClearError,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-80 max-w-[85vw] flex flex-col bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 p-4 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <IconSparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                DocRAG Assistant
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Business Document Intelligence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div className="py-2">
          <FileUpload onUploadSuccess={onUploadSuccess} disabled={isStreaming} />
        </div>

        {/* Friendly Error Banner in Sidebar */}
        {error && (
          <div className="my-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
            <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 leading-tight">{error}</span>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                aria-label="Dismiss error"
                className="text-red-400 hover:text-red-600 font-bold ml-1"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Document List */}
        <DocumentList
          documents={documents}
          onRemoveDocument={onRemoveDocument}
          onClearAll={onClearAllDocuments}
          deletingId={deletingId}
        />

        {/* Footer info */}
        <div className="pt-3 mt-auto border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Supabase + Gemini</span>
          </div>
          <span>Strict Citation Grounding</span>
        </div>
      </aside>
    </>
  );
}
