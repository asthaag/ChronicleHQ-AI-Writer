import { useEffect, useRef, useCallback, useState } from 'react';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, Node as ProsemirrorNode, MarkType } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, wrapIn, lift } from 'prosemirror-commands';
import { wrapInList, liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';

/**
 * ProseMirror Schema Configuration
 *
 * ITALIC MARK DEFINITION:
 * The `em` (emphasis/italic) mark comes from prosemirror-schema-basic.
 * It renders as <em> in the DOM and applies font-style: italic via Editor.css.
 *
 * The schema includes:
 * - Nodes: paragraphs, headings, lists (via addListNodes)
 * - Marks: strong (bold), em (italic), code, link (from basicSchema.spec.marks)
 *
 * See Editor.css for the visual styling of marks.
 */
const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
  marks: basicSchema.spec.marks, // Includes 'em' mark for italic text
});

interface UseProsemirrorOptions {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

interface UseProsemirrorReturn {
  editorRef: React.RefObject<HTMLDivElement | null>;
  getContent: () => string;
  setContent: (content: string) => void;
  appendContent: (content: string) => void;
  focus: () => void;
  isEmpty: boolean;
  // Formatting commands
  toggleBold: () => void;
  toggleBulletList: () => void;
  undoAction: () => void;
  redoAction: () => void;
  // State checks
  isBoldActive: boolean;
  isBulletListActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
  // Utility
  scrollToBottom: () => void;
}

/**
 * Custom hook for ProseMirror editor integration
 *
 * Provides a rich text editing experience with:
 * - Basic text formatting (bold, italic)
 * - Undo/redo support
 * - Content manipulation methods
 * - Real-time state tracking
 */
export function useProsemirror({
  initialContent = '',
  onChange,
  placeholder = 'Start writing...',
}: UseProsemirrorOptions = {}): UseProsemirrorReturn {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isBulletListActive, setIsBulletListActive] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  /**
   * Check if a mark is active at current selection
   */
  const isMarkActive = useCallback((markType: MarkType): boolean => {
    if (!viewRef.current) return false;
    const { state } = viewRef.current;
    const { from, $from, to, empty } = state.selection;
    if (empty) {
      return !!markType.isInSet(state.storedMarks || $from.marks());
    }
    return state.doc.rangeHasMark(from, to, markType);
  }, []);

  /**
   * Check if selection is inside a bullet list
   */
  const isInBulletList = useCallback((): boolean => {
    if (!viewRef.current) return false;
    const { state } = viewRef.current;
    const { $from } = state.selection;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type === schema.nodes.bullet_list) {
        return true;
      }
    }
    return false;
  }, []);

  /**
   * Update formatting state based on current selection
   */
  const updateFormattingState = useCallback(() => {
    if (!viewRef.current) return;

    const { state } = viewRef.current;
    setIsBoldActive(isMarkActive(schema.marks.strong));
    setIsBulletListActive(isInBulletList());
    setCanUndo(undo(state));
    setCanRedo(redo(state));
  }, [isMarkActive, isInBulletList]);

  // Get text content from the editor
  const getContent = useCallback((): string => {
    if (!viewRef.current) return '';
    return viewRef.current.state.doc.textContent;
  }, []);

  // Set content in the editor
  const setContent = useCallback((content: string): void => {
    if (!viewRef.current) return;

    const { state } = viewRef.current;
    const tr = state.tr;

    // Create a new document from the content
    const element = document.createElement('div');
    element.innerHTML = `<p>${content.replace(/\n/g, '</p><p>')}</p>`;
    const doc = DOMParser.fromSchema(schema).parse(element);

    // Replace the entire document
    tr.replaceWith(0, state.doc.content.size, doc.content);

    // Move cursor to end
    const newState = viewRef.current.state.apply(tr);
    viewRef.current.updateState(newState);

    // Set cursor at the end
    const endPos = viewRef.current.state.doc.content.size;
    const endTr = viewRef.current.state.tr.setSelection(
      TextSelection.create(viewRef.current.state.doc, endPos)
    );
    viewRef.current.dispatch(endTr);
  }, []);

  // Append content at the end
  const appendContent = useCallback((content: string): void => {
    if (!viewRef.current) return;

    const { state } = viewRef.current;
    const endPos = state.doc.content.size;

    // Create text node
    const textNode = schema.text(content);

    // Insert at the end of the last paragraph
    const tr = state.tr.insert(endPos - 1, textNode);

    // Move cursor to end
    viewRef.current.dispatch(tr);

    const newEndPos = viewRef.current.state.doc.content.size;
    const selectionTr = viewRef.current.state.tr.setSelection(
      TextSelection.create(viewRef.current.state.doc, newEndPos - 1)
    );
    viewRef.current.dispatch(selectionTr);
  }, []);

  // Focus the editor
  const focus = useCallback((): void => {
    viewRef.current?.focus();
  }, []);

  // Scroll editor to bottom (for auto-scroll after AI text)
  const scrollToBottom = useCallback((): void => {
    if (!editorRef.current) return;
    const prosemirrorEl = editorRef.current.querySelector('.ProseMirror');
    if (prosemirrorEl) {
      prosemirrorEl.scrollTop = prosemirrorEl.scrollHeight;
    }
  }, []);

  // Toggle bold formatting
  const toggleBold = useCallback((): void => {
    if (!viewRef.current) return;
    toggleMark(schema.marks.strong)(viewRef.current.state, viewRef.current.dispatch);
    viewRef.current.focus();
    updateFormattingState();
  }, [updateFormattingState]);

  /**
   * Toggle bullet list on the current selection.
   *
   * If already in a bullet list, lifts out of it.
   * If not in a bullet list, wraps in one.
   */
  const toggleBulletList = useCallback((): void => {
    if (!viewRef.current) return;
    const { state, dispatch } = viewRef.current;

    if (isInBulletList()) {
      // Lift out of list
      liftListItem(schema.nodes.list_item)(state, dispatch);
    } else {
      // Wrap in bullet list
      wrapInList(schema.nodes.bullet_list)(state, dispatch);
    }
    viewRef.current.focus();
    updateFormattingState();
  }, [updateFormattingState, isInBulletList]);

  // Undo action
  const undoAction = useCallback((): void => {
    if (!viewRef.current) return;
    undo(viewRef.current.state, viewRef.current.dispatch);
    viewRef.current.focus();
  }, []);

  // Redo action
  const redoAction = useCallback((): void => {
    if (!viewRef.current) return;
    redo(viewRef.current.state, viewRef.current.dispatch);
    viewRef.current.focus();
  }, []);

  // Initialize the editor
  useEffect(() => {
    if (!editorRef.current) return;

    // Create initial document
    let doc: ProsemirrorNode;
    if (initialContent) {
      const element = document.createElement('div');
      element.innerHTML = `<p>${initialContent.replace(/\n/g, '</p><p>')}</p>`;
      doc = DOMParser.fromSchema(schema).parse(element);
    } else {
      doc = schema.node('doc', null, [schema.node('paragraph')]);
    }

    // Create editor state
    const state = EditorState.create({
      doc,
      schema,
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        // Formatting keyboard shortcuts: Mod-b for bold
        keymap({
          'Mod-b': toggleMark(schema.marks.strong), // Bold
        }),
        // List keyboard shortcuts: Enter splits list item, Tab indents, Shift-Tab outdents
        keymap({
          'Enter': splitListItem(schema.nodes.list_item),
          'Tab': sinkListItem(schema.nodes.list_item),
          'Shift-Tab': liftListItem(schema.nodes.list_item),
        }),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
      ],
    });

    // Create editor view
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(tr: Transaction) {
        const newState = view.state.apply(tr);
        view.updateState(newState);

        // Check if content changed
        if (tr.docChanged) {
          const content = newState.doc.textContent;
          setIsEmpty(content.trim().length === 0);
          onChangeRef.current?.(content);
        }

        // Update formatting state on any transaction
        setTimeout(() => {
          setIsBoldActive(isMarkActive(schema.marks.strong));
          setIsBulletListActive(isInBulletList());
          setCanUndo(undo(newState));
          setCanRedo(redo(newState));
        }, 0);
      },
      attributes: {
        class: 'prosemirror-editor',
        'data-placeholder': placeholder,
      },
    });

    viewRef.current = view;
    setIsEmpty(view.state.doc.textContent.trim().length === 0);

    // Cleanup
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [initialContent, placeholder, isMarkActive]);

  return {
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
  };
}

export { schema };
