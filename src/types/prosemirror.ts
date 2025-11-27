import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

export interface ProsemirrorEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onEditorReady?: (view: EditorView) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface ProsemirrorEditorRef {
  view: EditorView | null;
  getContent: () => string;
  setContent: (content: string) => void;
  appendContent: (content: string) => void;
  focus: () => void;
}

export type EditorTransactionHandler = (tr: Transaction, state: EditorState) => void;
