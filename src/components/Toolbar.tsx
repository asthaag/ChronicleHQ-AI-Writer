import { memo } from 'react';
import './Toolbar.css';

/**
 * Props for the Toolbar component
 */
interface ToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isBoldActive: boolean;
  isItalicActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
}

/**
 * Elegant Editor Toolbar
 *
 * A minimal, Chronicle-style toolbar with smooth micro-interactions,
 * clear active states, and elegant tooltips.
 *
 * Keyboard shortcuts:
 * - Bold: Ctrl/Cmd + B
 * - Italic: Ctrl/Cmd + I
 * - Undo: Ctrl/Cmd + Z
 * - Redo: Ctrl/Cmd + Shift + Z
 */
export const Toolbar = memo(function Toolbar({
  onBold,
  onItalic,
  onUndo,
  onRedo,
  isBoldActive,
  isItalicActive,
  canUndo,
  canRedo,
  disabled = false,
}: ToolbarProps) {
  return (
    <div className={`toolbar ${disabled ? 'toolbar-disabled' : ''}`}>
      <div className="toolbar-group toolbar-group-format">
        {/* Bold Button */}
        <div className="toolbar-btn-wrapper">
          <button
            type="button"
            className={`toolbar-btn ${isBoldActive ? 'active' : ''}`}
            onClick={onBold}
            disabled={disabled}
            aria-label="Toggle bold"
            aria-pressed={isBoldActive}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            </svg>
          </button>
          <span className="toolbar-tooltip">Bold<kbd>Ctrl+B</kbd></span>
        </div>

        {/* Italic Button */}
        <div className="toolbar-btn-wrapper">
          <button
            type="button"
            className={`toolbar-btn ${isItalicActive ? 'active' : ''}`}
            onClick={onItalic}
            disabled={disabled}
            aria-label="Toggle italic"
            aria-pressed={isItalicActive}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </button>
          <span className="toolbar-tooltip">Italic<kbd>Ctrl+I</kbd></span>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group toolbar-group-history">
        {/* Undo Button */}
        <div className="toolbar-btn-wrapper">
          <button
            type="button"
            className="toolbar-btn"
            onClick={onUndo}
            disabled={disabled || !canUndo}
            aria-label="Undo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <span className="toolbar-tooltip">Undo<kbd>Ctrl+Z</kbd></span>
        </div>

        {/* Redo Button */}
        <div className="toolbar-btn-wrapper">
          <button
            type="button"
            className="toolbar-btn"
            onClick={onRedo}
            disabled={disabled || !canRedo}
            aria-label="Redo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>
          <span className="toolbar-tooltip">Redo<kbd>Ctrl+Shift+Z</kbd></span>
        </div>
      </div>
    </div>
  );
});
