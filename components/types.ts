export interface CitationSource {
  id: number;
  documentName?: string;
  document_name?: string;
  page?: number | null;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: CitationSource[];
  isStreaming?: boolean;
  error?: string;
  timestamp: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  chunkCount?: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  progress?: number;
}
