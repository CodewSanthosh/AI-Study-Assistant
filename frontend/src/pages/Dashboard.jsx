import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    if (selectedFile.type !== 'application/pdf' && selectedFile.type !== 'text/plain') {
      setStatus('error');
      setMessage('Only PDF or TXT files are supported.');
      return;
    }
    setFile(selectedFile);
    setStatus('idle');
    setMessage('');
  };

  const uploadFile = async () => {
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }

      setStatus('success');
      setMessage(`Success! Processed ${result.total_chunks_processed} chunks from your document.`);
    } catch (error) {
      console.error("Upload error:", error);
      setStatus('error');
      setMessage(error.message || 'Failed to upload and process the document.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-8 bg-secondary rounded-2xl border border-primary/10 flex items-center justify-between shadow-sm"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back! 👋</h1>
          <p className="text-muted-foreground text-sm">
            Upload your study materials to unlock AI-powered insights, flashcards, and quizzes.
          </p>
        </div>
      </motion.div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div
          className={`relative bg-card border-2 border-dashed rounded-2xl p-12 transition-all duration-300 text-center
            ${isDragging ? 'border-primary bg-primary/5 shadow-inner' : 'border-border hover:border-primary/40 shadow-sm'}
          `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,.txt"
            onChange={handleFileChange}
          />

          <div className="flex flex-col items-center justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragging ? 'bg-primary text-white' : 'bg-primary-light text-primary'
              }`}>
              {status === 'uploading' ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : status === 'success' ? (
                <CheckCircle className="w-8 h-8 text-success" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </div>

            {!file ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">Drag & drop your document here</h3>
                <p className="text-sm text-muted-foreground mb-6">Supports PDF and TXT files</p>
                <label
                  htmlFor="file-upload"
                  className="px-6 py-2.5 bg-white border border-border text-foreground font-medium rounded-lg cursor-pointer hover:bg-muted transition-colors shadow-sm"
                >
                  Browse Files
                </label>
              </>
            ) : (
              <div className="flex flex-col items-center w-full max-w-sm mx-auto">
                <div className="flex items-center w-full gap-3 bg-muted px-4 py-3 rounded-lg mb-6 border border-border">
                  <FileText className="text-primary w-5 h-5 shrink-0" />
                  <span className="text-foreground text-sm font-medium truncate flex-1 text-left">{file.name}</span>
                  <button
                    onClick={() => { setFile(null); setStatus('idle'); }}
                    className="text-xs text-muted-foreground hover:text-destructive font-medium"
                  >
                    Remove
                  </button>
                </div>

                {status === 'idle' && (
                  <button
                    onClick={uploadFile}
                    className="w-full py-3 bg-primary text-white font-medium rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-colors"
                  >
                    Process Document
                  </button>
                )}

                {status === 'error' && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-lg mt-2 w-full text-sm font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                {status === 'success' && (
                  <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg mt-2 w-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
