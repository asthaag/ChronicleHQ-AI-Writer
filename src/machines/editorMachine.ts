import { createMachine, assign, fromCallback } from 'xstate';
import { aiService } from '../services/aiService';

export interface EditorContext {
  content: string;
  baseContent: string;
  suggestedContent: string;
  error: string | null;
  isPartialSuggestion: boolean;
}

export type EditorEvent =
  | { type: 'UPDATE_CONTENT'; content: string }
  | { type: 'CONTINUE_WRITING' }
  | { type: 'STREAM_CHUNK'; chunk: string }
  | { type: 'GENERATION_DONE'; generatedText: string }
  | { type: 'GENERATION_ERROR'; error: string }
  | { type: 'CANCEL' }
  | { type: 'ACCEPT_SUGGESTION' }
  | { type: 'REJECT_SUGGESTION' }
  | { type: 'REGENERATE' }
  | { type: 'RETRY' }
  | { type: 'DISMISS_ERROR' };

interface AIGenerationInput {
  content: string;
}

const createAIGenerationActor = fromCallback<EditorEvent, AIGenerationInput>(
  ({ sendBack, input, receive }) => {
    let isCancelled = false;

    aiService.continueWriting(input.content, {
      onStream: (chunk) => {
        if (!isCancelled) {
          sendBack({ type: 'STREAM_CHUNK', chunk });
        }
      },
      onComplete: (generatedText) => {
        if (!isCancelled) {
          sendBack({ type: 'GENERATION_DONE', generatedText });
        }
      },
      onError: (error) => {
        if (!isCancelled) {
          sendBack({ type: 'GENERATION_ERROR', error });
        }
      },
    });

    receive((event) => {
      if (event.type === 'CANCEL') {
        isCancelled = true;
        aiService.cancel();
      }
    });

    return () => {
      isCancelled = true;
      aiService.cancel();
    };
  }
);

const initialContext: EditorContext = {
  content: '',
  baseContent: '',
  suggestedContent: '',
  error: null,
  isPartialSuggestion: false,
};

export const editorMachine = createMachine({
  id: 'aiEditor',
  initial: 'idle',
  context: initialContext,

  types: {} as {
    context: EditorContext;
    events: EditorEvent;
  },

  states: {
    idle: {
      on: {
        UPDATE_CONTENT: {
          actions: assign({
            content: ({ event }) => event.content,
          }),
        },
        CONTINUE_WRITING: {
          target: 'generating',
          guard: ({ context }) => context.content.trim().length > 0,
          actions: assign({
            baseContent: ({ context }) => context.content,
            suggestedContent: '',
            error: null,
            isPartialSuggestion: false,
          }),
        },
      },
    },

    generating: {
      invoke: {
        id: 'aiGeneration',
        src: createAIGenerationActor,
        input: ({ context }) => ({ content: context.baseContent }),
      },

      on: {
        STREAM_CHUNK: {
          actions: assign({
            suggestedContent: ({ context, event }) =>
              context.suggestedContent + event.chunk,
          }),
        },

        GENERATION_DONE: {
          target: 'reviewingSuggestion',
          actions: assign({
            suggestedContent: ({ event }) => event.generatedText,
            isPartialSuggestion: false,
          }),
        },

        GENERATION_ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error,
            suggestedContent: '',
          }),
        },

        CANCEL: {
          target: 'reviewingSuggestion',
          actions: assign({
            isPartialSuggestion: true,
          }),
        },
      },

      exit: () => {
        aiService.cancel();
      },
    },

    reviewingSuggestion: {
      on: {
        ACCEPT_SUGGESTION: {
          target: 'idle',
          actions: assign({
            content: ({ context }) => context.baseContent + context.suggestedContent,
            suggestedContent: '',
            baseContent: '',
            isPartialSuggestion: false,
          }),
        },

        REJECT_SUGGESTION: {
          target: 'idle',
          actions: assign({
            content: ({ context }) => context.baseContent,
            suggestedContent: '',
            baseContent: '',
            isPartialSuggestion: false,
          }),
        },

        REGENERATE: {
          target: 'generating',
          actions: assign({
            suggestedContent: '',
            error: null,
            isPartialSuggestion: false,
          }),
        },
      },
    },

    error: {
      on: {
        RETRY: {
          target: 'generating',
          guard: ({ context }) => context.content.trim().length > 0,
          actions: assign({
            baseContent: ({ context }) => context.content,
            suggestedContent: '',
            error: null,
            isPartialSuggestion: false,
          }),
        },

        DISMISS_ERROR: {
          target: 'idle',
          actions: assign({
            error: null,
            suggestedContent: '',
            isPartialSuggestion: false,
          }),
        },

        UPDATE_CONTENT: {
          target: 'idle',
          actions: assign({
            content: ({ event }) => event.content,
            error: null,
            isPartialSuggestion: false,
          }),
        },

        CONTINUE_WRITING: {
          target: 'generating',
          guard: ({ context }) => context.content.trim().length > 0,
          actions: assign({
            baseContent: ({ context }) => context.content,
            suggestedContent: '',
            error: null,
            isPartialSuggestion: false,
          }),
        },
      },
    },
  },
});

export type EditorMachine = typeof editorMachine;
export type EditorState = ReturnType<typeof editorMachine.transition>;
