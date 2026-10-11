'use client';

import React, { useState, useRef } from 'react';
import { DocumentItem } from './types';
import { IconUploadCloud, IconFileText, IconLoader, IconAlertCircle, IconCheckCircle } from './Icons';

interface FileUploadProps {
  onUploadSuccess: (doc: DocumentItem) => void;
  disabled?: boolean;
}

export function FileUpload({ onUploadSuccess, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // Reset file input value to allow re-uploading same file if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = (file: File) => {
    setErrorMessage(null);
    setCurrentFile(file);

    // Validate extension
    const nameLower = file.name.toLowerCase();
    const isPdf = nameLower.endsWith('.pdf');
    const isTxt = nameLower.endsWith('.txt');

    if (!isPdf && !isTxt) {
      setErrorMessage('Unsupported file type. Please upload a PDF or TXT file.');
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      setErrorMessage('File size exceeds 10MB limit.');
      return;
    }

    uploadFile(file);
  };

  const uploadFile = (file: File) => {
    setUploadProgress(0);
    setUploadStatus('Uploading file...');

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
        if (percent === 100) {
          setUploadStatus('Extracting text & generating embeddings...');
        }
      }
    };

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          setUploadStatus('Indexed successfully!');

          const newDoc: DocumentItem = {
            id: response.documentId || crypto.randomUUID(),
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            chunkCount: response.chunkCount,
            status: 'ready',
          };

          onUploadSuccess(newDoc);

          // Clear progress display after brief delay
          setTimeout(() => {
            setUploadProgress(null);
            setUploadStatus(null);
            setCurrentFile(null);
          }, 2000);
        } else {
          setUploadProgress(null);
          const fallback =
            xhr.status === 429
              ? 'Too many uploads. Please wait a moment before trying again.'
              : xhr.status === 413
              ? 'File exceeds the 10MB limit. Please choose a smaller file.'
              : 'Unable to process document. Please try again.';
          setErrorMessage(response.error || fallback);
        }
      } catch {
        setUploadProgress(null);
        setErrorMessage(
          xhr.status === 429
            ? 'Upload limit reached. Please wait a moment.'
            : 'Unable to process document. Please try again.'
        );
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setErrorMessage('Network connection lost during upload. Please check your connection and try again.');
    };

    xhr.open('POST', '/api/ingest');
    xhr.send(formData);
  };

  return (
    <div className="w-full space-y-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        disabled={disabled || uploadProgress !== null}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && uploadProgress === null) {
            fileInputRef.current?.click();
          }
        }}
        className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 scale-[1.01]'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'
        } ${disabled || uploadProgress !== null ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <div className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
          <IconUploadCloud className="w-5 h-5" />
        </div>
        <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 text-center">
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Click to upload
          </span>{' '}
          or drag and drop
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
          PDF or TXT (up to 10MB)
        </p>
      </div>

      {/* Progress state */}
      {uploadProgress !== null && currentFile && (
        <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-medium truncate">
            <div className="flex items-center gap-1.5 truncate max-w-[80%]">
              <IconFileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{currentFile.name}</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">{uploadProgress}%</span>
          </div>

          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-200 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {uploadProgress === 100 && uploadStatus?.includes('Indexed') ? (
              <>
                <IconCheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400">{uploadStatus}</span>
              </>
            ) : (
              <>
                <IconLoader className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>{uploadStatus}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
          <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-medium">Upload failed: </span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 font-bold ml-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
