import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (class name merger)', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple classes into one string', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('resolves tailwind conflicts – last value wins', () => {
    // tailwind-merge keeps the last conflicting utility
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('resolves padding conflicts', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('returns empty string when no arguments are truthy', () => {
    expect(cn()).toBe('');
    expect(cn(false, null, undefined)).toBe('');
  });

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });
});
