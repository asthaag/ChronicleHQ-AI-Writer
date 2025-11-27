import { memo } from 'react';
import './ContinueWritingButton.css';

/**
 * Props for the ContinueWritingButton component.
 */
interface ContinueWritingButtonProps {
  /** Click handler to trigger AI continuation */
  onClick: () => void;
  /** Whether AI is currently generating */
  isLoading?: boolean;
  /** Whether the button should be disabled */
  disabled?: boolean;
}

/**
 * Continue Writing Button Component
 *
 * A polished call-to-action button that triggers AI text continuation.
 * Features a gradient background, smooth animations, and loading state.
 *
 * @example
 * ```tsx
 * <ContinueWritingButton
 *   onClick={() => send({ type: 'CONTINUE_WRITING' })}
 *   isLoading={isGenerating}
 *   disabled={!hasContent}
 * />
 * ```
 */
export const ContinueWritingButton = memo(function ContinueWritingButton({
  onClick,
  isLoading = false,
  disabled = false,
}: ContinueWritingButtonProps) {
  const buttonClasses = [
    'continue-writing-btn',
    isLoading && 'loading',
    disabled && 'disabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={isLoading ? 'AI is writing...' : 'Continue Writing'}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <span className="btn-spinner">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.25"
              />
              <path
                d="M12 2C6.47715 2 2 6.47715 2 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="btn-text">Writing...</span>
        </>
      ) : (
        <>
          <span className="btn-icon">
            {/* Sparkle/AI icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L13.09 8.26L19 7L14.74 11.09L21 14L14.74 12.91L13.09 19L12 12.74L5 14L11.26 11.09L5 7L11.26 8.26L12 2Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="btn-text">Continue Writing</span>
          <span className="btn-shortcut">
            <kbd>Ctrl</kbd>
            <span className="shortcut-plus">+</span>
            <kbd>Enter</kbd>
          </span>
        </>
      )}
    </button>
  );
});
