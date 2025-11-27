import { useRef, useCallback, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { Editor, type EditorRef } from './components/Editor';
import { ContinueWritingButton } from './components/ContinueWritingButton';
import { ToastContainer } from './components/Toast';
import { editorMachine } from './machines/editorMachine';
import { useToast } from './hooks/useToast';
import './App.css';

/**
 * Main Application Component
 *
 * This component orchestrates the AI-assisted editor using XState for state management.
 * The component's role is purely presentational - all business logic lives in the machine.
 *
 * FLOW (Inline AI Suggestions):
 * 1. User clicks "Continue Writing" → AI generates text
 * 2. AI text streams directly into the editor (shown inline with distinct styling)
 * 3. When complete, user sees "Use this text" / "Generate again" / "Discard" buttons
 * 4. User explicitly accepts or rejects the suggestion
 * 5. On accept, the text becomes part of the document
 *
 * This gives users full control over what AI-generated content enters their document.
 */
function App() {
  const editorRef = useRef<EditorRef>(null);
  const [state, send] = useMachine(editorMachine);
  const { toasts, dismissToast, success, error: showError, neutral } = useToast();

  // Derive UI state from machine state
  const isIdle = state.matches('idle');
  const isGenerating = state.matches('generating');
  const isReviewing = state.matches('reviewingSuggestion');
  const hasError = state.matches('error');

  // Extract context values
  const { content, suggestedContent, error, isPartialSuggestion } = state.context;

  // Can only generate if there's content and we're in a state that allows it
  const canGenerate = content.trim().length > 0 && isIdle;

  /**
   * Sync editor content with machine state.
   * Called when user types in the ProseMirror editor.
   */
  const handleContentChange = useCallback(
    (newContent: string) => {
      send({ type: 'UPDATE_CONTENT', content: newContent });
    },
    [send]
  );

  /**
   * Trigger AI continuation.
   * The machine handles all the AI logic internally.
   * AI text will appear in the suggestion preview, not the editor.
   */
  const handleContinueWriting = useCallback(() => {
    send({ type: 'CONTINUE_WRITING' });
  }, [send]);

  /**
   * Cancel ongoing generation.
   * Preserves partial suggestion for user review.
   */
  const handleCancel = useCallback(() => {
    send({ type: 'CANCEL' });
    neutral('Generation cancelled');
  }, [send, neutral]);

  /**
   * Accept the AI suggestion.
   * This is the only way AI text gets into the editor.
   */
  const handleAccept = useCallback(() => {
    send({ type: 'ACCEPT_SUGGESTION' });
    success('AI suggestion applied');
  }, [send, success]);

  /**
   * Reject the suggestion without regenerating.
   * Returns to idle state, user can edit and try again later.
   */
  const handleReject = useCallback(() => {
    send({ type: 'REJECT_SUGGESTION' });
  }, [send]);

  /**
   * Regenerate a new suggestion with the same base content.
   * Convenient for quickly getting alternative suggestions.
   */
  const handleRegenerate = useCallback(() => {
    send({ type: 'REGENERATE' });
  }, [send]);

  /**
   * Show toast when error state is entered.
   */
  useEffect(() => {
    if (hasError && error) {
      showError('Something went wrong');
    }
  }, [hasError, error, showError]);

  /**
   * Sync accepted content to ProseMirror editor.
   *
   * When user accepts a suggestion, the machine updates content in context.
   * We need to sync this to the actual ProseMirror DOM.
   *
   * This only runs when transitioning from reviewing to idle (accept action).
   */
  useEffect(() => {
    if (editorRef.current && isIdle) {
      const editorContent = editorRef.current.getContent();

      // If machine content differs from editor, update the editor
      if (content !== editorContent) {
        editorRef.current.setContent(content);
        // Auto-scroll to bottom after inserting AI content
        setTimeout(() => {
          editorRef.current?.scrollToBottom();
        }, 100);
      }
    }
  }, [content, isIdle]);

  /**
   * Keyboard shortcuts:
   * - Ctrl/Cmd + Enter: Continue writing (only when idle)
   * - Escape: Cancel generation or reject suggestion
   * - Enter: Accept suggestion (when reviewing)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter: Start AI generation
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canGenerate) {
          handleContinueWriting();
        }
      }

      // Escape: Cancel or reject
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isGenerating) {
          handleCancel();
        } else if (isReviewing) {
          handleReject();
        }
      }

      // Enter (without Ctrl): Accept suggestion when reviewing
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && isReviewing) {
        // Only accept if not in an input/textarea
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
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <img src="/logo.png" alt="ChronicleHQ Logo" width="50" height="50" />
            <span className="logo-text">ChronicleHQ</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="editor-section">
          <div className="editor-header">
            <h1>Start Writing</h1>
            <p>
              Write your thoughts below and let AI continue your story.
              Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> or click the button to continue.
            </p>
          </div>

          {/* Editor with inline AI text streaming */}
          <Editor
            ref={editorRef}
            initialContent=""
            onChange={handleContentChange}
            placeholder="Start typing your story, idea, or anything you'd like the AI to continue..."
            disabled={isGenerating || isReviewing}
            streamingText={suggestedContent}
            isStreaming={isGenerating}
          />

          {/* Inline action buttons - shown during generation or review */}
          {(isGenerating || isReviewing) && (
            <div className="inline-actions">
              {isGenerating && (
                <button
                  type="button"
                  className="inline-btn inline-btn-cancel"
                  onClick={handleCancel}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
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
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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

          {/* Action Bar - Only show when idle */}
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

      {/* Footer */}
      <footer className="app-footer">
      </footer>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
