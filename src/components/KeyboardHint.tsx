import { memo } from 'react';
import './KeyboardHint.css';

/**
 * Props for the KeyboardHint component
 */
interface KeyboardHintProps {
  /** Whether the hint should be visible */
  visible: boolean;
}

/**
 * Keyboard Shortcut Hint Component
 *
 * A subtle, animated tooltip that shows available keyboard shortcuts.
 * Appears when the editor has content and is ready for AI continuation.
 *
 * @example
 * ```tsx
 * <KeyboardHint visible={hasContent && !isGenerating} />
 * ```
 */
export const KeyboardHint = memo(function KeyboardHint({ visible }: KeyboardHintProps) {
  if (!visible) return null;

  return (
    <div className="keyboard-hint" aria-hidden="true">
      <span className="hint-text">Press</span>
      <kbd>Ctrl</kbd>
      <span className="hint-plus">+</span>
      <kbd>Enter</kbd>
      <span className="hint-text">to continue</span>
    </div>
  );
});
