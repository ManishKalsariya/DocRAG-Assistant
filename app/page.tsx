'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, ChatMessage, CitationSource } from '@/components/types';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';

const STORAGE_DOCS_KEY = 'docrag_documents';
const STORAGE_MESSAGES_KEY = 'docrag_messages';

export default function Home() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [sidebarError, setSidebarError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load saved state from localStorage and sync with GET /api/documents
  useEffect(() => {
    try {
      const savedDocs = localStorage.getItem(STORAGE_DOCS_KEY);
      const savedMsgs = localStorage.getItem(STORAGE_MESSAGES_KEY);
      if (savedDocs || savedMsgs) {
        queueMicrotask(() => {
          if (savedDocs) {
            setDocuments(JSON.parse(savedDocs));
          }
          if (savedMsgs) {
            setMessages(JSON.parse(savedMsgs));
          }
        });
      }
    } catch {
      // LocalStorage load failure ignored
    }

    // Sync latest documents from server
    async function loadDocuments() {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.documents)) {
            setDocuments(data.documents);
          }
        }
      } catch {
        // Silently preserve offline state if server sync fails
      }
    }

    loadDocuments();
  }, []);

  // Sync documents to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(documents));
    } catch {
      // LocalStorage save failure ignored
    }
  }, [documents]);

  // Sync messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      // LocalStorage save failure ignored
    }
  }, [messages]);

  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
    setSidebarError(null);
  };

  const handleRemoveDocument = async (id: string) => {
    const targetDoc = documents.find((d) => d.id === id);
    const docName = targetDoc?.name || 'this document';

    if (!window.confirm(`Delete "${docName}"? This will remove all its text and embeddings.`)) {
      return;
    }

    setDeletingDocId(id);
    setSidebarError(null);

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        let errorMsg = 'Failed to delete document from the server';
        try {
          const data = await res.json();
          if (data.error) errorMsg = data.error;
        } catch {
          // fallback
        }
        throw new Error(errorMsg);
      }

      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to delete document';
      setSidebarError(msg);
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleClearAllDocuments = () => {
    if (window.confirm('Are you sure you want to clear the document list?')) {
      setDocuments([]);
    }
  };

  const handleClearChat = () => {
    if (isStreaming) {
      handleStopGeneration();
    }
    setMessages([]);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleSendMessage = async (queryText?: string) => {
    const question = (queryText ?? input).trim();
    if (!question || isStreaming) return;

    setInput('');

    const timeString = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: timeString,
    };

    const assistantMsgId = crypto.randomUUID();
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: timeString,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = 'An error occurred while generating the answer.';
        if (response.status === 429) {
          errorMsg = 'You are sending questions too quickly. Please wait a moment before trying again.';
        } else if (response.status === 400) {
          errorMsg = 'Please enter a valid question.';
        } else if (response.status >= 500) {
          errorMsg = 'The AI service encountered a server error. Please try again shortly.';
        }

        try {
          const errJson = await response.json();
          if (errJson.error) errorMsg = errJson.error;
        } catch {
          // If non-JSON response
        }
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error('No response stream received from server');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = '';
      let accumulatedText = '';
      let receivedSources: CitationSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });

        // Process complete SSE chunks separated by \n\n
        const chunks = streamBuffer.split('\n\n');
        streamBuffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.slice(5).trim();
              if (!jsonStr) continue;

              try {
                const parsed = JSON.parse(jsonStr);

                if (parsed.type === 'text' && typeof parsed.text === 'string') {
                  accumulatedText += parsed.text;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: accumulatedText }
                        : msg
                    )
                  );
                } else if (parsed.type === 'sources' && Array.isArray(parsed.sources)) {
                  receivedSources = parsed.sources;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, sources: receivedSources }
                        : msg
                    )
                  );
                }
              } catch {
                // Ignore partial or unparseable JSON packets
              }
            }
          }
        }
      }

      // Mark message streaming complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, isStreaming: false, sources: receivedSources }
            : msg
        )
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Stream aborted by user
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
          )
        );
      } else {
        const rawMsg = err instanceof Error ? err.message : 'Unknown communication error';
        let friendlyMsg = rawMsg;
        if (rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('network')) {
          friendlyMsg = 'Unable to connect to the server. Please check your internet connection.';
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  isStreaming: false,
                  error: friendlyMsg,
                  content: msg.content,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      {/* Left Sidebar */}
      <Sidebar
        documents={documents}
        onUploadSuccess={handleUploadSuccess}
        onRemoveDocument={handleRemoveDocument}
        onClearAllDocuments={handleClearAllDocuments}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
        isStreaming={isStreaming}
        deletingId={deletingDocId}
        error={sidebarError}
        onClearError={() => setSidebarError(null)}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        <ChatWindow
          messages={messages}
          input={input}
          setInput={setInput}
          onSubmit={handleSendMessage}
          onStop={handleStopGeneration}
          onClearChat={handleClearChat}
          isStreaming={isStreaming}
          documents={documents}
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
        />
      </main>
    </div>
  );
}
