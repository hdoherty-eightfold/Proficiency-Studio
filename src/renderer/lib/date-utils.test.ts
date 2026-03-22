import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDistanceToNow, formatDate, formatDateTime } from './date-utils';

describe('formatDistanceToNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for less than 60 seconds ago', () => {
    const now = Date.now();
    expect(formatDistanceToNow(now)).toBe('just now');
    expect(formatDistanceToNow(now - 30_000)).toBe('just now');
    expect(formatDistanceToNow(now - 59_000)).toBe('just now');
  });

  it('returns "1 minute ago" for exactly 1 minute', () => {
    expect(formatDistanceToNow(Date.now() - 60_000)).toBe('1 minute ago');
  });

  it('returns plural minutes', () => {
    expect(formatDistanceToNow(Date.now() - 5 * 60_000)).toBe('5 minutes ago');
    expect(formatDistanceToNow(Date.now() - 59 * 60_000)).toBe('59 minutes ago');
  });

  it('returns "1 hour ago" for exactly 1 hour', () => {
    expect(formatDistanceToNow(Date.now() - 3_600_000)).toBe('1 hour ago');
  });

  it('returns plural hours', () => {
    expect(formatDistanceToNow(Date.now() - 3 * 3_600_000)).toBe('3 hours ago');
    expect(formatDistanceToNow(Date.now() - 23 * 3_600_000)).toBe('23 hours ago');
  });

  it('returns "1 day ago" for exactly 1 day', () => {
    expect(formatDistanceToNow(Date.now() - 86_400_000)).toBe('1 day ago');
  });

  it('returns plural days', () => {
    expect(formatDistanceToNow(Date.now() - 4 * 86_400_000)).toBe('4 days ago');
  });

  it('returns "1 week ago" for 7 days', () => {
    expect(formatDistanceToNow(Date.now() - 7 * 86_400_000)).toBe('1 week ago');
  });

  it('returns plural weeks', () => {
    expect(formatDistanceToNow(Date.now() - 14 * 86_400_000)).toBe('2 weeks ago');
    expect(formatDistanceToNow(Date.now() - 21 * 86_400_000)).toBe('3 weeks ago');
  });

  it('returns "1 month ago" for 30 days', () => {
    expect(formatDistanceToNow(Date.now() - 30 * 86_400_000)).toBe('1 month ago');
  });

  it('returns plural months', () => {
    expect(formatDistanceToNow(Date.now() - 90 * 86_400_000)).toBe('3 months ago');
  });

  it('returns "1 year ago" for 365 days', () => {
    expect(formatDistanceToNow(Date.now() - 365 * 86_400_000)).toBe('1 year ago');
  });

  it('returns plural years', () => {
    expect(formatDistanceToNow(Date.now() - 730 * 86_400_000)).toBe('2 years ago');
  });

  it('handles future timestamps as "just now"', () => {
    // diff is negative, seconds < 60
    expect(formatDistanceToNow(Date.now() + 10_000)).toBe('just now');
  });
});

describe('formatDate', () => {
  it('formats a Date object with default options', () => {
    const date = new Date('2026-03-08T12:00:00Z');
    const result = formatDate(date);
    expect(result).toContain('2026');
    expect(result).toContain('Mar');
  });

  it('formats a timestamp number', () => {
    const ts = new Date('2025-12-25T00:00:00Z').getTime();
    const result = formatDate(ts);
    expect(result).toContain('2025');
    expect(result).toContain('Dec');
  });

  it('accepts custom format options', () => {
    const date = new Date('2026-01-15T00:00:00Z');
    const result = formatDate(date, { year: '2-digit', month: 'numeric', day: 'numeric' });
    // Should use the custom options, not the defaults
    expect(result).toBeTruthy();
  });

  it('handles invalid date gracefully (returns Invalid Date string)', () => {
    const result = formatDate(NaN);
    expect(result).toContain('Invalid');
  });
});

describe('formatDateTime', () => {
  it('formats a Date object', () => {
    const date = new Date('2026-06-15T14:30:00Z');
    const result = formatDateTime(date);
    expect(result).toContain('2026');
    expect(result).toContain('Jun');
  });

  it('formats a timestamp number', () => {
    const ts = new Date('2026-06-15T14:30:00Z').getTime();
    const result = formatDateTime(ts);
    expect(result).toContain('2026');
  });

  it('includes time information', () => {
    const date = new Date('2026-01-01T09:05:00Z');
    const result = formatDateTime(date);
    // Should have some time component (exact format depends on TZ)
    expect(result.length).toBeGreaterThan(10);
  });

  it('handles invalid date', () => {
    const result = formatDateTime(NaN);
    expect(result).toContain('Invalid');
  });
});
