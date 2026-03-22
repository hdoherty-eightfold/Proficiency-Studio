import { create } from 'zustand';

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Deduplication: track recent toasts to prevent duplicates
const recentToasts = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const dedupeKey = `${toast.title || ''}-${toast.description || ''}`;
    const now = Date.now();

    // Skip if same toast shown recently
    const lastShown = recentToasts.get(dedupeKey);
    if (lastShown && now - lastShown < DEDUPE_WINDOW_MS) {
      return;
    }

    // Skip if identical toast currently visible
    const currentToasts = get().toasts;
    if (currentToasts.some(t => t.title === toast.title && t.description === toast.description)) {
      return;
    }

    recentToasts.set(dedupeKey, now);

    // Cleanup old entries
    for (const [key, time] of recentToasts.entries()) {
      if (now - time > DEDUPE_WINDOW_MS * 2) {
        recentToasts.delete(key);
      }
    }

    const id = crypto.randomUUID();
    const duration = toast.duration || 4000;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Hook for convenient toast usage
export function useToast() {
  const store = useToastStore();

  return {
    toast: store.addToast,
    toasts: store.toasts,
    removeToast: store.removeToast,
    clearToasts: store.clearToasts,
  };
}
