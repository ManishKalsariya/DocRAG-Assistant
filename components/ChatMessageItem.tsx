'use client';

import React, { useState } from 'react';
import { ChatMessage } from './types';
import { IconBot, IconUser, IconAlertCircle, IconSparkles } from './Icons';
import { CitationChip } from './CitationChip';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user';
  const [expandedCitationId, setExpandedCitationId] = useState<number | null>(null);

  const toggleCitation = (id: number) => {
    setExpandedCitationId((prev) => (prev === id ? null : id));
  };

  // Render markdown-like formatted text with clickable [n] citations
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    // Split paragraphs
    const paragraphs = content.split('\n\n');

    return paragraphs.map((para, pIdx) => {
      // Check for bullet lists
      const lines = para.split('\n');
      const isBulletList = lines.every((line) => line.trim().startsWith('- ') || line.trim().startsWith('* '));

      if (isBulletList) {
        return (
          <ul key={pIdx} className="list-disc pl-5 space-y-1 my-1.5">
            {lines.map((line, lIdx) => (
              <li key={lIdx}>
                {renderInlineText(line.replace(/^[-*]\s+/, ''))}
              </li>
            ))}
          </ul>
        );
      }

      // Check for code block
      if (para.startsWith('```') && para.endsWith('```')) {
        const codeText = para.slice(3, -3).replace(/^[a-z]+\n/, '');
        return (
          <pre
            key={pIdx}
            className="my-2 p-2.5 rounded bg-zinc-900 text-zinc-100 dark:bg-black/80 font-mono text-xs overflow-x-auto border border-zinc-700/60"
          >
            <code>{codeText}</code>
          </pre>
        );
      }

      return (
        <p key={pIdx} className="my-1.5 leading-relaxed">
          {lines.map((line, lIdx) => (
            <React.Fragment key={lIdx}>
              {lIdx > 0 && <br />}
              {renderInlineText(line)}
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  // Render inline formatting (bold, italic, `code`, and [1] citation tags)
  const renderInlineText = (text: string): React.ReactNode => {
    // Regex matches [1]..[99] or `code` or **bold**
    const tokenRegex = /(\[\d+\]|\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, idx) => {
      // Check citation [1]
      const citeMatch = part.match(/^\[(\d+)\]$/);
      if (citeMatch) {
        const citeNum = parseInt(citeMatch[1], 10);
        const hasMatchingSource = message.sources?.some((s) => s.id === citeNum);

        return (
          <button
            key={idx}
            type="button"
            onClick={() => toggleCitation(citeNum)}
            title={hasMatchingSource ? `View citation source [${citeNum}]` : undefined}
            className={`inline-flex items-center px-1 mx-0.5 text-[11px] font-semibold rounded transition-colors ${
              hasMatchingSource
                ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/60 dark:hover:bg-indigo-800 dark:text-indigo-300 cursor-pointer'
                : 'text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800'
            }`}
          >
            [{citeNum}]
          </button>
        );
      }

      // Bold **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
      }

      // Inline `code`
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={idx}
            className="px-1 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 font-mono text-[11px] text-zinc-800 dark:text-zinc-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      return part;
    });
  };

  return (
    <div
      className={`flex gap-3 text-sm transition-all ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center shrink-0 mt-0.5">
          <IconBot className="w-4 h-4" />
        </div>
      )}

      <div
        className={`flex flex-col max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-xs self-end'
            : 'bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        ) : (
          <div className="space-y-1">
            {/* Loading state before first tokens */}
            {message.isStreaming && !message.content && (
              <div className="flex items-center gap-2 py-1 text-zinc-500 dark:text-zinc-400 text-xs">
                <IconSparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>Searching documents & generating answer...</span>
              </div>
            )}

            {/* Formatted body */}
            <div className="prose-sm dark:prose-invert">
              {renderFormattedContent(message.content)}
              {message.isStreaming && message.content && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-500 animate-pulse align-middle" />
              )}
            </div>

            {/* Error display */}
            {message.error && (
              <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                <span>{message.error}</span>
              </div>
            )}

            {/* Sources / Citation chips under answer — only shown when [n] markers appear */}
            {(() => {
              if (!message.sources || message.sources.length === 0) return null;

              // Parse which citation numbers actually appear in the final answer
              const citedNums = new Set<number>();
              for (const m of message.content.matchAll(/\[(\d+)\]/g)) {
                citedNums.add(parseInt(m[1], 10));
              }
              if (citedNums.size === 0) return null;

              // Keep only sources whose id was cited
              const citedSources = message.sources.filter((s) => citedNums.has(s.id));
              if (citedSources.length === 0) return null;

              // Merge chips that share the same file + page
              const seen = new Map<string, { source: typeof citedSources[0]; ids: number[] }>();
              for (const s of citedSources) {
                const docName = s.documentName || s.document_name || '';
                const key = `${docName}::${s.page ?? ''}`;
                if (seen.has(key)) {
                  seen.get(key)!.ids.push(s.id);
                } else {
                  seen.set(key, { source: s, ids: [s.id] });
                }
              }
              const mergedChips = Array.from(seen.values());

              return (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="text-[11px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500 mb-2">
                    Sources ({mergedChips.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mergedChips.map(({ source, ids }) => (
                      <CitationChip
                        key={ids.join('-')}
                        source={source}
                        mergedIds={ids}
                        isExpanded={ids.some((id) => expandedCitationId === id)}
                        onToggle={() => toggleCitation(ids[0])}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div
          className={`text-[10px] mt-1.5 opacity-60 ${
            isUser ? 'text-indigo-100 text-right' : 'text-zinc-400 text-left'
          }`}
        >
          {message.timestamp}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
          <IconUser className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
