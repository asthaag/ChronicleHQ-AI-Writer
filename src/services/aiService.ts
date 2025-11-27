const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface StreamCallbacks {
  onStream: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}


const callGeminiAPI = async (
  prompt: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> => {
  try {
    // Check if already cancelled before making request
    if (signal?.aborted) {
      return; // Silent return - no callbacks
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a helpful writing assistant. Continue the following text naturally and coherently. Only provide the continuation, do not repeat the original text. Keep the same tone, style, and language. Provide 2-3 sentences of continuation.\n\nText to continue:\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 150,
        },
      }),
      signal,
    });

    // Check if cancelled after fetch
    if (signal?.aborted) {
      return; // Silent return - no callbacks
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Check if cancelled after parsing
    if (signal?.aborted) {
      return; // Silent return - no callbacks
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!generatedText) {
      throw new Error('No text generated');
    }

    // Simulate streaming effect for better UX
    let fullText = '';
    const textToStream = generatedText.startsWith(' ') ? generatedText : ' ' + generatedText;

    for (let i = 0; i < textToStream.length; i++) {
      // Check cancellation at each character - silent return if cancelled
      if (signal?.aborted) {
        return; // Silent return - no callbacks, machine handles cleanup
      }

      await new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 20));

      // Double-check after timeout
      if (signal?.aborted) {
        return;
      }

      const char = textToStream[i];
      fullText += char;
      callbacks.onStream(char);
    }

    // Final check before completing
    if (signal?.aborted) {
      return;
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    // On AbortError, return silently - the machine handles cancel state
    if (error instanceof Error && error.name === 'AbortError') {
      return; // Silent return - no callbacks
    }

    // Only report actual errors
    callbacks.onError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
};

/**
 * AI Service class - manages API requests with proper lifecycle.
 *
 * Design: Uses AbortController for clean cancellation.
 * When cancel() is called, any in-flight request immediately stops
 * and no callbacks are fired after that point.
 */
export class AIService {
  private abortController: AbortController | null = null;
  private isActive: boolean = false;

  async continueWriting(
    currentText: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    // Cancel any existing request first
    this.cancel();

    this.abortController = new AbortController();
    this.isActive = true;

    try {
      await callGeminiAPI(
        currentText,
        callbacks,
        this.abortController.signal
      );
    } finally {
      this.isActive = false;
    }
  }

  /**
   * Cancel any active request immediately.
   * After this call, no callbacks will be fired from the cancelled request.
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isActive = false;
  }

  /**
   * Check if a request is currently active.
   */
  get active(): boolean {
    return this.isActive;
  }
}

// Singleton instance - shared across the app
export const aiService = new AIService();
