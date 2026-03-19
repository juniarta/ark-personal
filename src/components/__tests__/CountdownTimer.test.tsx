import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from '../CountdownTimer';

// ── TM-C01: CountdownTimer renders with correct format ────────────────────────

describe('CountdownTimer – TM-C01: format rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Xh XXm XXs" format for times under 24 hours', () => {
    // end_time = now + 2h 5m 30s
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 2 * 3600 * 1000 + 5 * 60 * 1000 + 30 * 1000).toISOString();

    render(<CountdownTimer endTime={endTime} />);

    // Should contain hours, minutes, seconds
    expect(screen.getByText(/2h 05m 30s/)).toBeInTheDocument();
  });

  it('shows "XXm XXs" format when under 1 hour remains', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 45 * 60 * 1000 + 10 * 1000).toISOString();

    render(<CountdownTimer endTime={endTime} />);

    expect(screen.getByText(/45m 10s/)).toBeInTheDocument();
  });

  it('shows "Xd XXh XXm" format when more than 24 hours remain', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    // 1 day + 3h + 15m
    const endTime = new Date(now.getTime() + 27 * 3600 * 1000 + 15 * 60 * 1000).toISOString();

    render(<CountdownTimer endTime={endTime} />);

    expect(screen.getByText(/1d 03h 15m/)).toBeInTheDocument();
  });

  it('shows "Ended" when end time is in the past', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() - 1000).toISOString();

    render(<CountdownTimer endTime={endTime} />);

    expect(screen.getByText('Ended')).toBeInTheDocument();
  });

  it('shows label prefix when showLabel is true', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    render(<CountdownTimer endTime={endTime} showLabel />);

    expect(screen.getByText(/Ends in:/)).toBeInTheDocument();
  });

  it('does not show label prefix when showLabel is false (default)', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    render(<CountdownTimer endTime={endTime} />);

    expect(screen.queryByText(/Ends in:/)).not.toBeInTheDocument();
  });
});

// ── Urgency color classes ─────────────────────────────────────────────────────

describe('CountdownTimer – AU-C04: urgency color coding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies green class when more than 1 hour remains', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();

    const { container } = render(<CountdownTimer endTime={endTime} />);
    const span = container.querySelector('span');

    expect(span?.className).toContain('text-green-400');
  });

  it('applies yellow class when between 15m and 1h remains', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    // 30 minutes
    const endTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    const { container } = render(<CountdownTimer endTime={endTime} />);
    const span = container.querySelector('span');

    expect(span?.className).toContain('text-yellow-400');
  });

  it('applies red class when 15 minutes or less remains', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    // 10 minutes
    const endTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    const { container } = render(<CountdownTimer endTime={endTime} />);
    const span = container.querySelector('span');

    expect(span?.className).toContain('text-red-400');
  });

  it('applies muted class when ended', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() - 5000).toISOString();

    const { container } = render(<CountdownTimer endTime={endTime} />);
    const span = container.querySelector('span');

    expect(span?.className).toContain('text-muted-foreground');
  });
});

// ── TM-C02: Timer decrements over time ───────────────────────────────────────

describe('CountdownTimer – TM-C02: tick behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates displayed time after 1 second elapses', async () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    // 45s and 30s remaining
    const endTime = new Date(now.getTime() + 45 * 1000).toISOString();

    render(<CountdownTimer endTime={endTime} />);

    expect(screen.getByText(/00m 45s/)).toBeInTheDocument();

    // Advance clock by 15 seconds
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.getByText(/00m 30s/)).toBeInTheDocument();
  });
});

// ── TM-C05: Timer list renders multiple timers ────────────────────────────────

describe('CountdownTimer – TM-C05: multiple timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders multiple independent countdown timers', () => {
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);

    const endTime1 = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1h
    const endTime2 = new Date(now.getTime() + 7200 * 1000).toISOString(); // 2h
    const endTime3 = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5m

    render(
      <div>
        <CountdownTimer endTime={endTime1} />
        <CountdownTimer endTime={endTime2} />
        <CountdownTimer endTime={endTime3} />
      </div>
    );

    expect(screen.getByText(/1h 00m 00s/)).toBeInTheDocument();
    expect(screen.getByText(/2h 00m 00s/)).toBeInTheDocument();
    expect(screen.getByText(/05m 00s/)).toBeInTheDocument();
  });
});
