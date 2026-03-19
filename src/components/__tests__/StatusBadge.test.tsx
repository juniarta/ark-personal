import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';
import type { Auction } from '@/lib/types';

type Status = Auction['status'];

describe('StatusBadge – label rendering', () => {
  it('renders "Active" for active status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders "Won" for won status', () => {
    render(<StatusBadge status="won" />);
    expect(screen.getByText('Won')).toBeInTheDocument();
  });

  it('renders "Lost" for lost status', () => {
    render(<StatusBadge status="lost" />);
    expect(screen.getByText('Lost')).toBeInTheDocument();
  });

  it('renders "Expired" for expired status', () => {
    render(<StatusBadge status="expired" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders "Cancelled" for cancelled status', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});

describe('StatusBadge – variant CSS classes', () => {
  it('active badge uses success (green) variant class', () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstChild as HTMLElement;
    // success variant applies bg-green-600
    expect(badge.className).toContain('bg-green-600');
  });

  it('lost badge uses destructive variant class', () => {
    const { container } = render(<StatusBadge status="lost" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-destructive');
  });

  it('expired badge uses secondary variant class', () => {
    const { container } = render(<StatusBadge status="expired" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-secondary');
  });

  it('cancelled badge uses outline variant (no bg fill)', () => {
    const { container } = render(<StatusBadge status="cancelled" />);
    const badge = container.firstChild as HTMLElement;
    // outline variant does not have bg-* prefix — check it lacks solid bg classes
    expect(badge.className).not.toContain('bg-primary');
    expect(badge.className).not.toContain('bg-destructive');
    expect(badge.className).not.toContain('bg-secondary');
    expect(badge.className).not.toContain('bg-green-600');
  });

  it('won badge uses default (primary) variant class', () => {
    const { container } = render(<StatusBadge status="won" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-primary');
  });
});

describe('StatusBadge – all statuses render without error', () => {
  const statuses: Status[] = ['active', 'won', 'lost', 'expired', 'cancelled'];

  statuses.forEach((status) => {
    it(`renders without throwing for status: ${status}`, () => {
      expect(() => render(<StatusBadge status={status} />)).not.toThrow();
    });
  });
});

describe('StatusBadge – accessibility', () => {
  it('badge element is present in the document', () => {
    const { container } = render(<StatusBadge status="active" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('badge contains visible text', () => {
    render(<StatusBadge status="won" />);
    const text = screen.getByText('Won');
    expect(text).toBeVisible();
  });
});
