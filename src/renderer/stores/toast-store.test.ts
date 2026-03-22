/**
 * Tests for Toast Store
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore } from './toast-store';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => `uuid-${Date.now()}-${Math.random()}`),
});

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('should add a toast', () => {
    useToastStore.getState().addToast({ title: 'Test', description: 'Hello' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].title).toBe('Test');
  });

  it('should auto-remove toast after duration', () => {
    useToastStore.getState().addToast({ title: 'Temp', duration: 2000 });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(2000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should use default duration of 4000ms', () => {
    useToastStore.getState().addToast({ title: 'Default' });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(3999);
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should deduplicate identical toasts within window', () => {
    useToastStore.getState().addToast({ title: 'Dupe', description: 'Same' });
    useToastStore.getState().addToast({ title: 'Dupe', description: 'Same' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('should allow same toast after dedupe window', () => {
    useToastStore.getState().addToast({ title: 'First' });

    // Remove the first toast and advance past dedupe window
    vi.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toHaveLength(0);

    // Advance past the dedupe cleanup window (2x DEDUPE_WINDOW_MS)
    vi.advanceTimersByTime(2000);

    useToastStore.getState().addToast({ title: 'First' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('should remove a specific toast', () => {
    useToastStore.getState().addToast({ title: 'Keep' });
    useToastStore.getState().addToast({ title: 'Remove', description: 'different' });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);

    useToastStore.getState().removeToast(toasts[1].id);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].title).toBe('Keep');
  });

  it('should clear all toasts', () => {
    useToastStore.getState().addToast({ title: 'One' });
    useToastStore.getState().addToast({ title: 'Two', description: 'diff' });
    expect(useToastStore.getState().toasts).toHaveLength(2);

    useToastStore.getState().clearToasts();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should support different variants', () => {
    useToastStore.getState().addToast({ title: 'Success', variant: 'success' });
    expect(useToastStore.getState().toasts[0].variant).toBe('success');
  });
});
