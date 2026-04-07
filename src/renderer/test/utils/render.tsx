/**
 * Custom Render Utilities for Testing
 *
 * Provides wrapper components and custom render functions
 * to make testing React components easier.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==========================================
// Provider Wrappers
// ==========================================

interface WrapperProps {
  children: ReactNode;
}

/**
 * Default wrapper that includes all necessary providers
 * Uses lazy import to avoid conflicts with vi.mock hoisting
 */
let TooltipProviderComponent: React.FC<{ children: ReactNode }> | null = null;

const getTooltipProvider = async () => {
  if (!TooltipProviderComponent) {
    try {
      const mod = await import('../../components/ui/tooltip');
      TooltipProviderComponent = mod.TooltipProvider;
    } catch {
      TooltipProviderComponent = ({ children }) => <>{children}</>;
    }
  }
  return TooltipProviderComponent;
};

// Eagerly load on module init
getTooltipProvider();

const AllProviders: React.FC<WrapperProps> = ({ children }) => {
  const Provider = TooltipProviderComponent || (({ children: c }) => <>{c}</>);
  return <Provider>{children}</Provider>;
};

// ==========================================
// Custom Render Functions
// ==========================================

/**
 * Custom render function that wraps component with all providers
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult => {
  return render(ui, { wrapper: AllProviders, ...options });
};

/**
 * Render with user event setup for interaction testing
 */
const renderWithUser = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return {
    user: userEvent.setup(),
    ...customRender(ui, options),
  };
};

// ==========================================
// Test Helpers
// ==========================================

/**
 * Wait for a condition to be true
 */
const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

/**
 * Create a deferred promise for async testing
 */
const createDeferred = <T,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

/**
 * Wait for next tick (microtask queue to flush)
 */
const waitForNextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Flush all pending promises
 */
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// ==========================================
// Mock Helpers
// ==========================================

/**
 * Create a mock function that resolves after a delay
 */
const createDelayedMock = <T,>(value: T, delay = 100) => {
  return () => new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));
};

/**
 * Create a mock that fails on first N calls then succeeds
 */
const createRetryMock = <T,>(successValue: T, failCount: number, errorMessage = 'Mock error') => {
  let callCount = 0;
  return () => {
    callCount++;
    if (callCount <= failCount) {
      return Promise.reject(new Error(errorMessage));
    }
    return Promise.resolve(successValue);
  };
};

// ==========================================
// Exports
// ==========================================

export {
  customRender as render,
  renderWithUser,
  AllProviders,
  waitForCondition,
  createDeferred,
  waitForNextTick,
  flushPromises,
  createDelayedMock,
  createRetryMock,
};

// Re-export everything from testing-library
export * from '@testing-library/react';
