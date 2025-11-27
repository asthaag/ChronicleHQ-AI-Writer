import { useState, useCallback, useRef } from 'react';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'neutral';

/**
 * Toast notification data
 */
export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

/**
 * Options for showing a toast
 */
interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

/**
 * useToast Hook
 *
 * A reusable hook for managing toast notifications.
 * Supports multiple toasts, auto-dismiss, and different types.
 *
 * @example
 * ```tsx
 * const { toast, toasts, dismissToast } = useToast();
 *
 * // Show different toast types
 * toast('AI suggestion applied', { type: 'success' });
 * toast('Generation cancelled', { type: 'neutral' });
 * toast('Something went wrong', { type: 'error' });
 * ```
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idCounter = useRef(0);

  /**
   * Show a toast notification
   */
  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    const { type = 'neutral', duration = 2500 } = options;

    const id = `toast-${++idCounter.current}`;
    const newToast: ToastData = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    return id;
  }, []);

  /**
   * Dismiss a specific toast by ID
   */
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Shorthand methods for common toast types
   */
  const success = useCallback(
    (message: string, duration?: number) => toast(message, { type: 'success', duration }),
    [toast]
  );

  const error = useCallback(
    (message: string, duration?: number) => toast(message, { type: 'error', duration }),
    [toast]
  );

  const neutral = useCallback(
    (message: string, duration?: number) => toast(message, { type: 'neutral', duration }),
    [toast]
  );

  return {
    toasts,
    toast,
    dismissToast,
    success,
    error,
    neutral,
  };
}
