'use client';

import React, { useRef, useEffect } from 'react';
import { ChatMessage, DocumentItem } from './types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { IconMenu, IconSparkles, IconTrash, IconBookOpen } from './Icons';

interface ChatWindowProps {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  onSubmit: (questionText?: string) => void;
  onStop: () => void;
  onClearChat: () => void;
  isStreaming: boolean;
  documents: DocumentItem[];
  onOpenMobileSidebar: () => void;
}

const STARTER_PROMPTS = [
  'Summarize the key findings and executive takeaways',
  'What are the contractual payment terms and schedules?',
  'List all compliance, privacy, and security requirements',
  'What key deliverables and deadlines are outlined?',
];

export function ChatWindow({
  messages,
  input,
  setInput,
  onSubmit,
  onStop,
  onClearChat,
  isStreaming,
  documents,
  onOpenMobileSidebar,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages / streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleStarterPromptClick = (prompt: string) => {
    if (!isStreaming) {
      onSubmit(prompt);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-100/40 dark:bg-black/50 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Open documents sidebar"
          >
            <IconMenu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Document Chat
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {documents.length} {documents.length === 1 ? 'doc indexed' : 'docs indexed'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:block">
              Strict context retrieval with page citations [1]..[5]
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClearChat}
            disabled={isStreaming}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-500 disabled:opacity-40 transition px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Clear chat history"
          >
            <IconTrash className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        )}
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <IconSparkles className="w-7 h-7" />
              </div>

              <div className="space-y-2 max-w-md">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Business Document Q&A
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Upload PDF or TXT contracts, reports, or documentation. Ask any question to get
                  accurate answers strictly grounded in your text with page citations.
                </p>
              </div>

              {documents.length === 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs">
                  <IconBookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Start by uploading a document in the left sidebar</span>
                </div>
              )}

              {/* Starter prompts */}
              <div className="w-full max-w-xl text-left space-y-2 pt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                  Suggested queries
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleStarterPromptClick(prompt)}
                      className="p-3 text-left text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition group"
                    >
                      <span className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        &ldquo;{prompt}&rdquo;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessageItem key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Input Area */}
      <footer className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shrink-0">
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={() => onSubmit()}
          onStop={onStop}
          isStreaming={isStreaming}
        />
      </footer>
    </div>
  );
}
