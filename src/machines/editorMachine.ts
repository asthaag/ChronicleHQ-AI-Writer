import { createMachine, assign, fromCallback } from 'xstate';
import { aiService } from '../services/aiService';

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                        AI EDITOR STATE MACHINE                              ║
 * ╠════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                            ║
 * ║  This XState machine manages a controlled AI writing flow where            ║
 * ║  suggestions are shown in a preview area before being applied.             ║
 * ║                                                                            ║
 * ║  KEY CONCEPTS:                                                             ║
 * ║  • baseContent: The original editor content before AI generation           ║
 * ║  • suggestedContent: The AI-generated text shown as a preview              ║
 * ║  • The AI text is NOT inserted directly into the editor                    ║
 * ║  • User must explicitly accept or reject the suggestion                    ║
 * ║                                                                            ║
 * ║  CANCEL BEHAVIOR (preserves partial suggestions):                          ║
 * ║  • When CANCEL is triggered, we immediately abort the AI request           ║
 * ║  • The aiService stops streaming (no more callbacks)                       ║
 * ║  • suggestedContent is PRESERVED (not cleared)                             ║
 * ║  • Machine transitions to reviewingSuggestion (not idle)                   ║
 * ║  • User can then choose to "Use this text" or "Discard"                    ║
 * ║  • isPartialSuggestion flag indicates the suggestion was cancelled early   ║
 * ║                                                                            ║
 * ║  STATE CHART:                                                              ║
 * ║  ┌─────────────────────────────────────────────────────────────────────┐   ║
 * ║  │                                                                     │   ║
 * ║  │    ┌───────┐  CONTINUE_WRITING   ┌────────────┐  GENERATION_DONE   │   ║
 * ║  │    │       │ ─────────────────▶  │            │ ─────────────────▶ │   ║
 * ║  │    │ idle  │                     │ generating │                    │   ║
 * ║  │    │       │                     │            │                    │   ║
 * ║  │    └───────┘                     └────────────┘                    │   ║
 * ║  │        ▲                               │  │                        │   ║
 * ║  │        │                         ERROR │  │ CANCEL                 │   ║
 * ║  │        │                               ▼  │                        │   ║
 * ║  │        │                        ┌─────────┐│                       │   ║
 * ║  │        └─────────────────────── │  error  ││                       │   ║
 * ║  │                                 └─────────┘│                       │   ║
 * ║  │        ▲                                   │                       │   ║
 * ║  │        │  ACCEPT / REJECT       ┌──────────▼───────┐               │   ║
 * ║  │        └─────────────────────── │ reviewingSuggestion │ ◀──────────┘   ║
 * ║  │                                 └──────────────────┘               │   ║
 * ║  │                                        │                           │   ║
 * ║  │                                        │ REGENERATE                │   ║
 * ║  │                                        ▼                           │   ║
 * ║  │                                 ┌────────────┐                     │   ║
 * ║  │                                 │ generating │ (loops back)        │   ║
 * ║  │                                 └────────────┘                     │   ║
 * ║  └─────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * The shape of data maintained by the editor machine.
 *
 * Design decision: We maintain separate fields for base content and suggested
 * content to keep the editor "clean" until the user explicitly accepts.
 */
export interface EditorContext {
  /** The current text content in the editor (user's actual document) */
  content: string;

  /**
   * The editor content at the moment AI generation started.
   * Used to restore state on cancel and as input for regeneration.
   */
  baseContent: string;

  /**
   * The AI-generated suggestion text (streamed during generation).
   * Shown in preview area, NOT inserted into editor until accepted.
   */
  suggestedContent: string;

  /** Error message if generation failed */
  error: string | null;

  /**
   * Flag indicating the suggestion was from a cancelled generation.
   * When true, the suggestion is partial (user cancelled before completion).
   * Used by UI to show appropriate messaging like "Partial suggestion".
   */
  isPartialSuggestion: boolean;
}

/**
 * All possible events that can be sent to the machine.
 * Using discriminated unions for type-safe event handling.
 */
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

/**
 * Input provided to the AI generation actor.
 */
interface AIGenerationInput {
  content: string;
}

// ============================================================================
// AI GENERATION ACTOR
// ============================================================================

/**
 * Creates a callback-based actor that handles AI text generation.
 *
 * IMPORTANT: Uses direct import of aiService (not dynamic import) to ensure
 * synchronous cancellation. When the actor is stopped or receives CANCEL,
 * the aiService.cancel() is called immediately.
 *
 * The actor streams chunks back to the parent machine via sendBack().
 * On cancellation, the aiService returns silently without firing callbacks,
 * so no GENERATION_DONE event is sent after CANCEL.
 */
const createAIGenerationActor = fromCallback<EditorEvent, AIGenerationInput>(
  ({ sendBack, input, receive }) => {
    // Flag to track if we've been cancelled
    let isCancelled = false;

    // Start the AI generation
    aiService.continueWriting(input.content, {
      onStream: (chunk) => {
        // Don't send events if cancelled
        if (!isCancelled) {
          sendBack({ type: 'STREAM_CHUNK', chunk });
        }
      },
      onComplete: (generatedText) => {
        // Don't send completion if cancelled
        if (!isCancelled) {
          sendBack({ type: 'GENERATION_DONE', generatedText });
        }
      },
      onError: (error) => {
        // Don't send errors if cancelled
        if (!isCancelled) {
          sendBack({ type: 'GENERATION_ERROR', error });
        }
      },
    });

    // Listen for cancel events from parent
    receive((event) => {
      if (event.type === 'CANCEL') {
        isCancelled = true;
        aiService.cancel();
      }
    });

    /**
     * Cleanup function called when actor is stopped.
     * This is called both on normal completion and on cancel.
     * We cancel the aiService to ensure no lingering requests.
     */
    return () => {
      isCancelled = true;
      aiService.cancel();
    };
  }
);

// ============================================================================
// INITIAL CONTEXT
// ============================================================================

const initialContext: EditorContext = {
  content: '',
  baseContent: '',
  suggestedContent: '',
  error: null,
  isPartialSuggestion: false,
};

// ============================================================================
// STATE MACHINE DEFINITION
// ============================================================================

/**
 * The main editor state machine with controlled AI suggestion flow.
 *
 * Architecture decisions:
 * 1. AI suggestions are shown in a preview, not directly in editor
 * 2. User must explicitly accept/reject suggestions
 * 3. baseContent preserves original state for cancel/regenerate
 * 4. suggestedContent accumulates streamed text for preview
 * 5. CANCEL is handled cleanly - editor always returns to editable state
 */
export const editorMachine = createMachine({
  id: 'aiEditor',
  initial: 'idle',
  context: initialContext,

  // Type definitions for TypeScript support
  types: {} as {
    context: EditorContext;
    events: EditorEvent;
  },

  states: {
    /**
     * IDLE STATE
     * -----------
     * The default state where the user can type and trigger AI generation.
     * Content updates are always allowed. Generation requires non-empty content.
     *
     * The editor is fully editable in this state.
     */
    idle: {
      on: {
        UPDATE_CONTENT: {
          actions: assign({
            content: ({ event }) => event.content,
          }),
        },
        CONTINUE_WRITING: {
          target: 'generating',
          // Guard: Only allow generation if there's content to continue
          guard: ({ context }) => context.content.trim().length > 0,
          // Capture the current content as baseContent before generating
          actions: assign({
            baseContent: ({ context }) => context.content,
            suggestedContent: '',
            error: null,
            isPartialSuggestion: false,
          }),
        },
      },
    },

    /**
     * GENERATING STATE
     * -----------------
     * Active when AI is generating text. The AI actor is invoked to handle
     * the async call. Streaming chunks update suggestedContent (preview).
     *
     * CANCEL HANDLING (preserves partial suggestions):
     * When CANCEL is received, we:
     * 1. Send CANCEL to the actor (which calls aiService.cancel())
     * 2. KEEP suggestedContent (preserve whatever was generated)
     * 3. Set isPartialSuggestion flag to true
     * 4. Transition to reviewingSuggestion (not idle)
     *
     * User can then choose "Use this text" or "Discard" in reviewingSuggestion.
     */
    generating: {
      // Invoke the AI generation actor with baseContent as input
      invoke: {
        id: 'aiGeneration',
        src: createAIGenerationActor,
        input: ({ context }) => ({ content: context.baseContent }),
      },

      on: {
        // Handle streaming chunks - append to suggestion preview
        STREAM_CHUNK: {
          actions: assign({
            suggestedContent: ({ context, event }) =>
              context.suggestedContent + event.chunk,
          }),
        },

        /**
         * AI finished successfully.
         * Transition to reviewingSuggestion for user decision.
         * Mark as complete (not partial).
         */
        GENERATION_DONE: {
          target: 'reviewingSuggestion',
          actions: assign({
            suggestedContent: ({ event }) => event.generatedText,
            isPartialSuggestion: false,
          }),
        },

        // AI generation failed
        GENERATION_ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error,
            suggestedContent: '',
          }),
        },

        /**
         * CANCEL - Preserves partial suggestions for user review
         *
         * This handler enables user choice after cancelling:
         * 1. Aborts the AI request (actor cleanup cancels aiService)
         * 2. PRESERVES suggestedContent (whatever was generated so far)
         * 3. Sets isPartialSuggestion = true for UI messaging
         * 4. Transitions to reviewingSuggestion (not idle)
         *
         * User can then decide to "Use this text" or "Discard".
         * Editor remains disabled until user makes a choice.
         */
        CANCEL: {
          target: 'reviewingSuggestion',
          actions: assign({
            // Keep suggestedContent - don't clear it!
            isPartialSuggestion: true,
          }),
        },
      },

      /**
       * Exit action: Ensure aiService is cancelled when leaving this state.
       * This handles edge cases where the actor might not clean up properly.
       */
      exit: () => {
        aiService.cancel();
      },
    },

    /**
     * REVIEWING_SUGGESTION STATE
     * ---------------------------
     * User reviews the AI suggestion (complete or partial after cancel).
     * Shows the suggestion with "Use this text" and "Discard" options.
     *
     * If isPartialSuggestion is true, the suggestion was cancelled early.
     * User can still choose to use the partial text or discard it.
     */
    reviewingSuggestion: {
      on: {
        /**
         * User accepts the suggestion (complete or partial).
         * Append suggestion to base content.
         */
        ACCEPT_SUGGESTION: {
          target: 'idle',
          actions: assign({
            content: ({ context }) => context.baseContent + context.suggestedContent,
            suggestedContent: '',
            baseContent: '',
            isPartialSuggestion: false,
          }),
        },

        /**
         * User rejects/discards the suggestion.
         * Return to idle, keep original content unchanged.
         */
        REJECT_SUGGESTION: {
          target: 'idle',
          actions: assign({
            content: ({ context }) => context.baseContent,
            suggestedContent: '',
            baseContent: '',
            isPartialSuggestion: false,
          }),
        },

        /**
         * User wants to regenerate with same base content.
         * Only shown for complete suggestions, not partial ones.
         */
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

    /**
     * ERROR STATE
     * -----------
     * Entered when AI generation fails. User can retry or dismiss.
     */
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

// ============================================================================
// EXPORTS
// ============================================================================

export type EditorMachine = typeof editorMachine;
export type EditorState = ReturnType<typeof editorMachine.transition>;
