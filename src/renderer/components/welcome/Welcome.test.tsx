/**
 * Tests for Welcome Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock app store
const mockSetCurrentStep = vi.fn();
const mockGetWorkflowProgress = vi.fn(() => ({
  completed: 0,
  total: 6,
  percentage: 0,
}));

vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      currentStep: 0,
      setCurrentStep: mockSetCurrentStep,
      getWorkflowProgress: mockGetWorkflowProgress,
      skillsState: {
        skills: [],
        totalCount: 0,
        extractionStatus: 'idle',
        extractionSource: null,
        extractionError: null,
        extractedAt: null,
      },
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('../../stores/command-store', () => ({
  useCommandStore: vi.fn((selector) => {
    const state = {
      openCommand: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock framer motion to avoid animation issues in tests
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => <div ref={ref} {...filterMotionProps(props)}>{children}</div>),
    h1: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLHeadingElement>) => <h1 ref={ref} {...filterMotionProps(props)}>{children}</h1>),
    p: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLParagraphElement>) => <p ref={ref} {...filterMotionProps(props)}>{children}</p>),
    button: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) => <button ref={ref} {...filterMotionProps(props)}>{children}</button>),
  },
}));

// Mock NotificationCenter to avoid TooltipProvider dependency
vi.mock('../common/NotificationCenter', () => ({
  NotificationCenter: () => <div data-testid="notification-center">Notifications</div>,
}));

function filterMotionProps(props: Record<string, unknown>) {
  const filtered = { ...props };
  delete filtered.initial;
  delete filtered.animate;
  delete filtered.transition;
  delete filtered.whileHover;
  delete filtered.whileTap;
  return filtered;
}

// Dynamic import to apply mocks first
let Welcome: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./Welcome');
  Welcome = mod.default;
});

describe('Welcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the welcome heading', () => {
    renderWithUser(<Welcome />);
    expect(screen.getByText('Proficiency Studio')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
  });

  it('should render the subtitle description', () => {
    renderWithUser(<Welcome />);
    expect(
      screen.getByText('AI-Powered Proficiency Assessment Platform for Data-Driven Talent Management')
    ).toBeInTheDocument();
  });

  it('should render quick action buttons', () => {
    renderWithUser(<Welcome />);
    expect(screen.getByText('Connect Data Source')).toBeInTheDocument();
    expect(screen.getByText('Extract Skills')).toBeInTheDocument();
    expect(screen.getByText('Run Assessment')).toBeInTheDocument();
    expect(screen.getByText('View History')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render feature cards', () => {
    renderWithUser(<Welcome />);
    expect(screen.getByText('AI-Powered Analysis')).toBeInTheDocument();
    expect(screen.getByText('Lightning Fast')).toBeInTheDocument();
    expect(screen.getByText('Precise Mapping')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive Reports')).toBeInTheDocument();
  });

  it('should render the Get Started button and navigate on click', async () => {
    const { user } = renderWithUser(<Welcome />);
    const getStartedButton = screen.getByText('Get Started');
    expect(getStartedButton).toBeInTheDocument();
    await user.click(getStartedButton);
    expect(mockSetCurrentStep).toHaveBeenCalledWith(1);
  });
});
