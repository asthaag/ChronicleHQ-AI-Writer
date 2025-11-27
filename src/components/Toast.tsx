import { memo, useEffect, useState } from 'react';
import './Toast.css';

/**
 * Toast notification types
 */
export type ToastType = 'error' | 'success' | 'info' | 'neutral';

/**
 * Single toast data
 */
export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

/**
 * Props for a single Toast item
 */
interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

/**
 * Single Toast Item Component
 */
const ToastItem = memo(function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (toast.duration === 0) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration]);

  // Handle dismiss with exit animation
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  };

  const toastClasses = [
    'toast',
    `toast-${toast.type}`,
    isExiting && 'toast-exit',
  ]
    .filter(Boolean)
    .join(' ');

  // Get icon based on type
  const renderIcon = () => {
    switch (toast.type) {
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'success':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9,12 12,15 16,10" />
          </svg>
        );
      case 'info':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
      case 'neutral':
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L13.09 8.26L19 7L14.74 11.09L21 14L14.74 12.91L13.09 19L12 12.74L5 14L11.26 11.09L5 7L11.26 8.26L12 2Z" />
          </svg>
        );
    }
  };

  return (
    <div className={toastClasses} role="alert" aria-live="polite">
      <span className="toast-icon">{renderIcon()}</span>
      <span className="toast-message">{toast.message}</span>
    </div>
  );
});

/**
 * Props for the ToastContainer component
 */
interface ToastContainerProps {
  /** Array of toast data to display */
  toasts: ToastData[];
  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void;
}

/**
 * Toast Container Component
 *
 * Renders multiple toast notifications stacked at the bottom-center.
 * Handles entrance/exit animations and auto-dismiss.
 *
 * @example
 * ```tsx
 * const { toasts, dismissToast } = useToast();
 *
 * <ToastContainer toasts={toasts} onDismiss={dismissToast} />
 * ```
 */
export const ToastContainer = memo(function ToastContainer({
  toasts,
  onDismiss,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
});

// Re-export for backwards compatibility
export { ToastContainer as Toast };
