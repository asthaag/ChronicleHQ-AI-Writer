import { useEffect, forwardRef, useImperativeHandle, memo } from 'react';
import { useProsemirror } from '../hooks/useProsemirror';
import { Toolbar } from './Toolbar';
import './Editor.css';

/**
 * Editor component ref interface.
 * Exposes imperative methods for controlling the ProseMirror editor.
 */
export interface EditorRef {
  /** Get the current text content from the editor */
  getContent: () => string;
  /** Replace all content in the editor */
  setContent: (content: string) => void;
  /** Append text to the end of the editor content */
  appendContent: (content: string) => void;
  /** Focus the editor */
  focus: () => void;
  /** Scroll the editor to the bottom */
  scrollToBottom: () => void;
}

/**
 * Props for the Editor component.
 */
interface EditorProps {
  /** Initial content to populate the editor */
  initialContent?: string;
  /** Callback fired when content changes */
  onChange?: (content: string) => void;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /** Whether the editor is disabled (during AI generation/review) */
  disabled?: boolean;
}

/**
 * AI-Assisted Text Editor Component
 *
 * Built on ProseMirror, this editor provides a rich text editing experience.
 * AI suggestions are now shown in a separate SuggestionPreview panel,
 * giving users explicit control over what gets inserted.
 *
 * Features:
 * - Rich text editing with ProseMirror
 * - Formatting toolbar (Bold, Italic, Undo, Redo)
 * - Keyboard shortcuts support
 * - Accessible placeholder when empty
 *
 * @example
 * ```tsx
 * const editorRef = useRef<EditorRef>(null);
 *
 * <Editor
 *   ref={editorRef}
 *   onChange={(text) => console.log(text)}
 *   placeholder="Start writing..."
 *   disabled={isGenerating}
 * />
 * ```
 */
export const Editor = memo(
  forwardRef<EditorRef, EditorProps>(
    (
      {
        initialContent,
        onChange,
        placeholder = 'Start writing...',
        disabled,
      },
      ref
    ) => {
      const {
        editorRef,
        getContent,
        setContent,
        appendContent,
        focus,
        isEmpty,
        toggleBold,
        toggleBulletList,
        undoAction,
        redoAction,
        isBoldActive,
        isBulletListActive,
        canUndo,
        canRedo,
        scrollToBottom,
      } = useProsemirror({
        initialContent,
        onChange,
        placeholder,
      });

      // Expose imperative methods via ref
      useImperativeHandle(
        ref,
        () => ({
          getContent,
          setContent,
          appendContent,
          focus,
          scrollToBottom,
        }),
        [getContent, setContent, appendContent, focus, scrollToBottom]
      );

      // Toggle contenteditable based on disabled state
      useEffect(() => {
        const editorElement = editorRef.current;
        if (!editorElement) return;

        const prosemirrorElement = editorElement.querySelector('.ProseMirror');
        if (!prosemirrorElement) return;

        if (disabled) {
          prosemirrorElement.setAttribute('contenteditable', 'false');
          prosemirrorElement.classList.add('disabled');
        } else {
          prosemirrorElement.setAttribute('contenteditable', 'true');
          prosemirrorElement.classList.remove('disabled');
        }
      }, [disabled, editorRef]);

      // Compute class names
      const wrapperClasses = [
        'editor-wrapper',
        disabled && 'editor-disabled',
        isEmpty && 'editor-empty',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <div className={wrapperClasses}>
          {/* Minimalist formatting toolbar */}
          <Toolbar
            onBold={toggleBold}
            onBulletList={toggleBulletList}
            onUndo={undoAction}
            onRedo={redoAction}
            isBoldActive={isBoldActive}
            isBulletListActive={isBulletListActive}
            canUndo={canUndo}
            canRedo={canRedo}
            disabled={disabled}
          />

          {/* Main ProseMirror editor container */}
          <div
            ref={editorRef}
            className="editor-container"
            data-placeholder={placeholder}
          />
        </div>
      );
    }
  )
);

Editor.displayName = 'Editor';
