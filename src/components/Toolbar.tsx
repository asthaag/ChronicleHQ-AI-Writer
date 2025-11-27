import { memo } from 'react';
import './Toolbar.css';

/**
 * Props for the Toolbar component
 */
interface ToolbarProps {
  onBold: () => void;
  onBulletList: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isBoldActive: boolean;
  isBulletListActive: boolean;
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
  onBulletList,
  onUndo,
  onRedo,
  isBoldActive,
  isBulletListActive,
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
        </div>

        {/* Bullet List Button */}
        <div className="toolbar-btn-wrapper">
          <button
            type="button"
            className={`toolbar-btn ${isBulletListActive ? 'active' : ''}`}
            onClick={onBulletList}
            disabled={disabled}
            aria-label="Toggle bullet list"
            aria-pressed={isBulletListActive}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <circle cx="4" cy="6" r="1" fill="currentColor" />
              <circle cx="4" cy="12" r="1" fill="currentColor" />
              <circle cx="4" cy="18" r="1" fill="currentColor" />
            </svg>
          </button>
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
        </div>
      </div>
    </div>
  );
});
