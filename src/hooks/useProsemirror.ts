import { useEffect, useRef, useCallback, useState } from 'react';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, Node as ProsemirrorNode, MarkType } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { wrapInList, liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';

const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
  marks: basicSchema.spec.marks,
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
  toggleBold: () => void;
  toggleBulletList: () => void;
  undoAction: () => void;
  redoAction: () => void;
  isBoldActive: boolean;
  isBulletListActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
  scrollToBottom: () => void;
}

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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const isMarkActive = useCallback((markType: MarkType): boolean => {
    if (!viewRef.current) return false;
    const { state } = viewRef.current;
    const { from, $from, to, empty } = state.selection;
    if (empty) {
      return !!markType.isInSet(state.storedMarks || $from.marks());
    }
    return state.doc.rangeHasMark(from, to, markType);
  }, []);

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

  const updateFormattingState = useCallback(() => {
    if (!viewRef.current) return;
    const { state } = viewRef.current;
    setIsBoldActive(isMarkActive(schema.marks.strong));
    setIsBulletListActive(isInBulletList());
    setCanUndo(undo(state));
    setCanRedo(redo(state));
  }, [isMarkActive, isInBulletList]);

  const getContent = useCallback((): string => {
    if (!viewRef.current) return '';
    return viewRef.current.state.doc.textContent;
  }, []);

  const setContent = useCallback((content: string): void => {
    if (!viewRef.current) return;

    const { state } = viewRef.current;
    const tr = state.tr;

    const element = document.createElement('div');
    element.innerHTML = `<p>${content.replace(/\n/g, '</p><p>')}</p>`;
    const doc = DOMParser.fromSchema(schema).parse(element);

    tr.replaceWith(0, state.doc.content.size, doc.content);

    const newState = viewRef.current.state.apply(tr);
    viewRef.current.updateState(newState);

    const endPos = viewRef.current.state.doc.content.size;
    const endTr = viewRef.current.state.tr.setSelection(
      TextSelection.create(viewRef.current.state.doc, endPos)
    );
    viewRef.current.dispatch(endTr);
  }, []);

  const appendContent = useCallback((content: string): void => {
    if (!viewRef.current) return;

    const { state } = viewRef.current;
    const endPos = state.doc.content.size;
    const textNode = schema.text(content);
    const tr = state.tr.insert(endPos - 1, textNode);

    viewRef.current.dispatch(tr);

    const newEndPos = viewRef.current.state.doc.content.size;
    const selectionTr = viewRef.current.state.tr.setSelection(
      TextSelection.create(viewRef.current.state.doc, newEndPos - 1)
    );
    viewRef.current.dispatch(selectionTr);
  }, []);

  const focus = useCallback((): void => {
    viewRef.current?.focus();
  }, []);

  const scrollToBottom = useCallback((): void => {
    if (!editorRef.current) return;
    const prosemirrorEl = editorRef.current.querySelector('.ProseMirror');
    if (prosemirrorEl) {
      prosemirrorEl.scrollTop = prosemirrorEl.scrollHeight;
    }
  }, []);

  const toggleBold = useCallback((): void => {
    if (!viewRef.current) return;
    toggleMark(schema.marks.strong)(viewRef.current.state, viewRef.current.dispatch);
    viewRef.current.focus();
    updateFormattingState();
  }, [updateFormattingState]);

  const toggleBulletList = useCallback((): void => {
    if (!viewRef.current) return;
    const { state, dispatch } = viewRef.current;

    if (isInBulletList()) {
      liftListItem(schema.nodes.list_item)(state, dispatch);
    } else {
      wrapInList(schema.nodes.bullet_list)(state, dispatch);
    }
    viewRef.current.focus();
    updateFormattingState();
  }, [updateFormattingState, isInBulletList]);

  const undoAction = useCallback((): void => {
    if (!viewRef.current) return;
    undo(viewRef.current.state, viewRef.current.dispatch);
    viewRef.current.focus();
  }, []);

  const redoAction = useCallback((): void => {
    if (!viewRef.current) return;
    redo(viewRef.current.state, viewRef.current.dispatch);
    viewRef.current.focus();
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    let doc: ProsemirrorNode;
    if (initialContent) {
      const element = document.createElement('div');
      element.innerHTML = `<p>${initialContent.replace(/\n/g, '</p><p>')}</p>`;
      doc = DOMParser.fromSchema(schema).parse(element);
    } else {
      doc = schema.node('doc', null, [schema.node('paragraph')]);
    }

    const state = EditorState.create({
      doc,
      schema,
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap({ 'Mod-b': toggleMark(schema.marks.strong) }),
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

    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(tr: Transaction) {
        const newState = view.state.apply(tr);
        view.updateState(newState);

        if (tr.docChanged) {
          const content = newState.doc.textContent;
          setIsEmpty(content.trim().length === 0);
          onChangeRef.current?.(content);
        }

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
