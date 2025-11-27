import { memo } from 'react';
import './SuggestionPreview.css';

/**
 * Props for the SuggestionPreview component.
 *
 * This component displays AI-generated text suggestions in a preview area
 * separate from the main editor, giving users control over what gets inserted.
 */
interface SuggestionPreviewProps {
  /**
   * The AI-generated suggestion text to display.
   * During streaming, this updates character by character.
   * When generation completes, this contains the full suggestion.
   */
  suggestion: string;

  /**
   * Whether AI is currently generating (streaming) text.
   * When true, shows streaming indicator and cancel button.
   */
  isGenerating: boolean;

  /**
   * Whether we're in the reviewing state (generation complete or cancelled).
   * When true, shows accept/reject buttons.
   */
  isReviewing: boolean;

  /**
   * Whether this is a partial suggestion (user cancelled during generation).
   * When true, shows "Partial suggestion" label and hides regenerate button.
   * User can still choose to "Use this text" or "Discard".
   */
  isPartial?: boolean;

  /** Handler for cancelling generation */
  onCancel: () => void;

  /** Handler for accepting the suggestion */
  onAccept: () => void;

  /** Handler for rejecting the suggestion */
  onReject: () => void;

  /** Handler for regenerating a new suggestion */
  onRegenerate: () => void;
}

/**
 * SuggestionPreview Component
 *
 * Displays AI-generated text in a preview area below the editor.
 * This is a key part of the controlled AI flow where users must
 * explicitly accept or reject suggestions.
 *
 * States:
 * - Generating: Shows streaming text with blinking cursor and cancel button
 * - Reviewing (complete): Shows complete suggestion with accept/reject/regenerate buttons
 * - Reviewing (partial): Shows partial suggestion after cancel with accept/discard buttons
 *
 * Cancel Flow:
 * When user clicks Cancel during generation, the partial text is preserved.
 * User can then choose "Use this text" to accept the partial suggestion,
 * or "Discard" to throw it away and return to editing.
 *
 * @example
 * ```tsx
 * <SuggestionPreview
 *   suggestion={suggestedContent}
 *   isGenerating={state.matches('generating')}
 *   isReviewing={state.matches('reviewingSuggestion')}
 *   isPartial={context.isPartialSuggestion}
 *   onCancel={() => send({ type: 'CANCEL' })}
 *   onAccept={() => send({ type: 'ACCEPT_SUGGESTION' })}
 *   onReject={() => send({ type: 'REJECT_SUGGESTION' })}
 *   onRegenerate={() => send({ type: 'REGENERATE' })}
 * />
 * ```
 */
export const SuggestionPreview = memo(function SuggestionPreview({
  suggestion,
  isGenerating,
  isReviewing,
  isPartial = false,
  onCancel,
  onAccept,
  onReject,
  onRegenerate,
}: SuggestionPreviewProps) {
  // Show panel when generating or reviewing (including partial suggestions)
  const shouldShow = isGenerating || isReviewing || (suggestion && suggestion.length > 0);

  if (!shouldShow) return null;

  return (
    <div className="suggestion-preview">
      {/* Header with label and status */}
      <div className="suggestion-header">
        <div className="suggestion-label">
          <span className="suggestion-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L13.09 8.26L19 7L14.74 11.09L21 14L14.74 12.91L13.09 19L12 12.74L5 14L11.26 11.09L5 7L11.26 8.26L12 2Z" />
            </svg>
          </span>
          <span>AI Suggestion</span>
        </div>

        {/* Status indicator */}
        {isGenerating && (
          <div className="suggestion-status generating">
            <span className="status-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span>Writing...</span>
          </div>
        )}
        {isReviewing && !isPartial && (
          <div className="suggestion-status ready">
            <span className="status-check">✓</span>
            <span>Ready for review</span>
          </div>
        )}
        {isReviewing && isPartial && (
          <div className="suggestion-status partial">
            <span className="status-partial">◐</span>
            <span>Partial suggestion</span>
          </div>
        )}
      </div>

      {/* Suggestion text content */}
      <div className="suggestion-content">
        <p className="suggestion-text">
          {suggestion || <span className="suggestion-placeholder">AI is thinking...</span>}
          {isGenerating && <span className="suggestion-cursor" />}
        </p>
      </div>

      {/* Action buttons */}
      <div className="suggestion-actions">
        {isGenerating && (
          <button
            type="button"
            className="suggestion-btn suggestion-btn-cancel"
            onClick={onCancel}
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
            {/* Primary action: Accept suggestion (works for both complete and partial) */}
            <button
              type="button"
              className="suggestion-btn suggestion-btn-accept"
              onClick={onAccept}
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

            {/* Secondary action: Regenerate - only for complete suggestions */}
            {!isPartial && (
              <button
                type="button"
                className="suggestion-btn suggestion-btn-regenerate"
                onClick={onRegenerate}
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

            {/* Tertiary action: Discard */}
            <button
              type="button"
              className="suggestion-btn suggestion-btn-reject"
              onClick={onReject}
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
    </div>
  );
});
