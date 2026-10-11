'use client';

import React, { useRef, useEffect } from 'react';
import { IconSend, IconSquare } from './Icons';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onStop,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isStreaming) {
          onStop();
        } else if (input.trim() && !disabled) {
          onSubmit(e);
        }
      }}
      className="relative flex flex-col w-full max-w-4xl mx-auto"
    >
      <div className="relative flex items-end bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-2xl shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-1.5 pl-4">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your uploaded business documents..."
          rows={1}
          disabled={disabled}
          className="w-full max-h-40 py-2.5 bg-transparent resize-none outline-hidden text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 leading-relaxed disabled:opacity-50"
        />

        <div className="flex items-center gap-1 shrink-0 pb-1 pr-1">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generation"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition shadow-xs"
            >
              <IconSquare className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              title="Send message (Enter)"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 transition shadow-xs disabled:cursor-not-allowed"
            >
              <IconSend className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>Grounded in uploaded documents · Verified page citations</span>
        <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
      </div>
    </form>
  );
}
