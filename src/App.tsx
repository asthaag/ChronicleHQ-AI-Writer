import { useRef, useCallback, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { Editor, type EditorRef } from './components/Editor';
import { ContinueWritingButton } from './components/ContinueWritingButton';
import { SuggestionPreview } from './components/SuggestionPreview';
import { ToastContainer } from './components/Toast';
import { KeyboardHint } from './components/KeyboardHint';
import { editorMachine } from './machines/editorMachine';
import { useToast } from './hooks/useToast';
import './App.css';

/**
 * Main Application Component
 *
 * This component orchestrates the AI-assisted editor using XState for state management.
 * The component's role is purely presentational - all business logic lives in the machine.
 *
 * NEW FLOW (Controlled AI Suggestions):
 * 1. User clicks "Continue Writing" → AI generates text
 * 2. AI text streams into a preview area (NOT into the editor)
 * 3. When complete, user sees "Use this text" / "Generate again" / "Discard" buttons
 * 4. User explicitly accepts or rejects the suggestion
 * 5. Only on accept does the text get inserted into the editor
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
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="8" fill="#111827" />
              <path
                d="M10 16L14 12L18 16L22 12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 20L14 16L18 20L22 16"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="logo-text">AI Writer</span>
          </div>
          <div className="header-actions">
            <span className="powered-by">Powered by Gemini</span>
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

          {/* Editor - No streaming overlay, that's now in SuggestionPreview */}
          <Editor
            ref={editorRef}
            initialContent=""
            onChange={handleContentChange}
            placeholder="Start typing your story, idea, or anything you'd like the AI to continue..."
            disabled={isGenerating || isReviewing}
          />

          {/* AI Suggestion Preview Panel */}
          <SuggestionPreview
            suggestion={suggestedContent}
            isGenerating={isGenerating}
            isReviewing={isReviewing}
            isPartial={isPartialSuggestion}
            onCancel={handleCancel}
            onAccept={handleAccept}
            onReject={handleReject}
            onRegenerate={handleRegenerate}
          />

          {/* Action Bar - Only show when idle */}
          {isIdle && (
            <div className="action-bar">
              <div className="action-info">
                {content.length > 0 && (
                  <span className="char-count">{content.length} characters</span>
                )}
                <KeyboardHint visible={canGenerate} />
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
        <p>Built with React, TypeScript, XState, and ProseMirror</p>
      </footer>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
