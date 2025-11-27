import { useRef, useCallback, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { Editor, type EditorRef } from './components/Editor';
import { ContinueWritingButton } from './components/ContinueWritingButton';
import { ToastContainer } from './components/Toast';
import { editorMachine } from './machines/editorMachine';
import { useToast } from './hooks/useToast';
import './App.css';

function App() {
  const editorRef = useRef<EditorRef>(null);
  const [state, send] = useMachine(editorMachine);
  const { toasts, dismissToast, success, error: showError, neutral } = useToast();

  const isIdle = state.matches('idle');
  const isGenerating = state.matches('generating');
  const isReviewing = state.matches('reviewingSuggestion');
  const hasError = state.matches('error');

  const { content, suggestedContent, error, isPartialSuggestion } = state.context;
  const canGenerate = content.trim().length > 0 && isIdle;

  const handleContentChange = useCallback(
    (newContent: string) => {
      send({ type: 'UPDATE_CONTENT', content: newContent });
    },
    [send]
  );

  const handleContinueWriting = useCallback(() => {
    send({ type: 'CONTINUE_WRITING' });
  }, [send]);

  const handleCancel = useCallback(() => {
    send({ type: 'CANCEL' });
    neutral('Generation cancelled');
  }, [send, neutral]);

  const handleAccept = useCallback(() => {
    send({ type: 'ACCEPT_SUGGESTION' });
    success('AI suggestion applied');
  }, [send, success]);

  const handleReject = useCallback(() => {
    send({ type: 'REJECT_SUGGESTION' });
  }, [send]);

  const handleRegenerate = useCallback(() => {
    send({ type: 'REGENERATE' });
  }, [send]);

  useEffect(() => {
    if (hasError && error) {
      showError('Something went wrong');
    }
  }, [hasError, error, showError]);

  useEffect(() => {
    if (editorRef.current && isIdle) {
      const editorContent = editorRef.current.getContent();
      if (content !== editorContent) {
        editorRef.current.setContent(content);
        setTimeout(() => {
          editorRef.current?.scrollToBottom();
        }, 100);
      }
    }
  }, [content, isIdle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canGenerate) {
          handleContinueWriting();
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isGenerating) {
          handleCancel();
        } else if (isReviewing) {
          handleReject();
        }
      }

      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && isReviewing) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleAccept();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleContinueWriting,
    handleCancel,
    handleAccept,
    handleReject,
    isGenerating,
    isReviewing,
    canGenerate,
  ]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <img src="/logo.png" alt="Chronicle Logo" width="50" height="50" />
            <span className="logo-text">Chronicle</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="editor-section">
          <div className="editor-header">
            <h1>Start Writing</h1>
            <p>
              Write your thoughts below and let AI continue your story.
              Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> or click the button to continue.
            </p>
          </div>

          <Editor
            ref={editorRef}
            initialContent=""
            onChange={handleContentChange}
            placeholder="Start typing your story, idea, or anything you'd like the AI to continue..."
            disabled={isGenerating || isReviewing}
            streamingText={suggestedContent}
            isStreaming={isGenerating}
          />

          {(isGenerating || isReviewing) && (
            <div className="inline-actions">
              {isGenerating && (
                <button
                  type="button"
                  className="inline-btn inline-btn-cancel"
                  onClick={handleCancel}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Cancel
                </button>
              )}

              {isReviewing && (
                <>
                  <button
                    type="button"
                    className="inline-btn inline-btn-accept"
                    onClick={handleAccept}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Use this text
                  </button>

                  {!isPartialSuggestion && (
                    <button
                      type="button"
                      className="inline-btn inline-btn-regenerate"
                      onClick={handleRegenerate}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2v6h-6" />
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                        <path d="M3 22v-6h6" />
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                      </svg>
                      Generate again
                    </button>
                  )}

                  <button
                    type="button"
                    className="inline-btn inline-btn-discard"
                    onClick={handleReject}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                    Discard
                  </button>
                </>
              )}
            </div>
          )}

          {isIdle && (
            <div className="action-bar">
              <div className="action-info">
                {content.length > 0 && (
                  <span className="char-count">{content.length} characters</span>
                )}
              </div>
              <ContinueWritingButton
                onClick={handleContinueWriting}
                isLoading={false}
                disabled={!canGenerate}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer"></footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
