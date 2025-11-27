import { useEffect, forwardRef, useImperativeHandle, memo } from 'react';
import { useProsemirror } from '../hooks/useProsemirror';
import { Toolbar } from './Toolbar';
import './Editor.css';

export interface EditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  appendContent: (content: string) => void;
  focus: () => void;
  scrollToBottom: () => void;
}

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  streamingText?: string;
  isStreaming?: boolean;
}

export const Editor = memo(
  forwardRef<EditorRef, EditorProps>(
    (
      {
        initialContent,
        onChange,
        placeholder = 'Start writing...',
        disabled,
        streamingText,
        isStreaming,
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

      const wrapperClasses = [
        'editor-wrapper',
        disabled && 'editor-disabled',
        isEmpty && 'editor-empty',
        isStreaming && 'editor-streaming',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <div className={wrapperClasses}>
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

          <div
            ref={editorRef}
            className="editor-container"
            data-placeholder={placeholder}
          />

          {streamingText && (
            <div className="ai-text-preview">
              <span className="ai-text-content">{streamingText}</span>
              {isStreaming && <span className="ai-text-cursor" />}
            </div>
          )}
        </div>
      );
    }
  )
);

Editor.displayName = 'Editor';
