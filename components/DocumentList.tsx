'use client';

import React from 'react';
import { DocumentItem } from './types';
import { IconFileText, IconFile, IconTrash, IconBookOpen } from './Icons';

interface DocumentListProps {
  documents: DocumentItem[];
  onRemoveDocument: (id: string) => void;
  onClearAll: () => void;
  deletingId?: string | null;
}

export function DocumentList({
  documents,
  onRemoveDocument,
  onClearAll,
  deletingId,
}: DocumentListProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <span className="uppercase tracking-wider">
          Uploaded Documents ({documents.length})
        </span>
        {documents.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] text-zinc-400 hover:text-red-500 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl my-2">
          <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800/60 mb-2">
            <IconBookOpen className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">No documents yet</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[180px]">
            Upload PDF or TXT business documents to start asking questions.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {documents.map((doc) => {
            const isPdf = doc.name.toLowerCase().endsWith('.pdf');
            const isDeletingThis = deletingId === doc.id;

            return (
              <div
                key={doc.id}
                className={`group flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition shadow-2xs ${
                  isDeletingThis ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`p-1.5 rounded shrink-0 ${
                      isPdf
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                    }`}
                  >
                    {isPdf ? (
                      <IconFile className="w-4 h-4" />
                    ) : (
                      <IconFileText className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate"
                      title={doc.name}
                    >
                      {doc.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {doc.size > 0 && <span>{formatBytes(doc.size)}</span>}
                      {doc.size > 0 && doc.chunkCount !== undefined && <span>•</span>}
                      {doc.chunkCount !== undefined ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'}
                        </span>
                      ) : (
                        <span>{doc.uploadedAt}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveDocument(doc.id)}
                  disabled={isDeletingThis}
                  title="Delete document"
                  aria-label={`Delete ${doc.name}`}
                  className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-1.5 rounded-md transition shrink-0 ml-1 disabled:opacity-50"
                >
                  {isDeletingThis ? (
                    <IconTrash className="w-3.5 h-3.5 animate-pulse text-red-500" />
                  ) : (
                    <IconTrash className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
