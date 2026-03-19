import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuctionCard } from '../AuctionCard';
import type { Auction } from '@/lib/types';

function makeAuction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: 'test-id',
    title: 'Test Rex Auction',
    category: null,
    source_link: null,
    source_type: null,
    source_post_id: null,
    duration_type: null,
    start_time: '2026-03-19T10:00:00Z',
    end_time: '2026-03-20T10:00:00Z',
    start_time_source: null,
    current_bid: null,
    bid_currency: null,
    min_increment: null,
    increment_currency: null,
    pickup_server: null,
    status: 'active',
    notes: null,
    raw_post_text: null,
    created_at: '2026-03-19T00:00:00Z',
    updated_at: '2026-03-19T00:00:00Z',
    ...overrides,
  };
}

describe('AuctionCard – basic rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the auction title', () => {
    render(<AuctionCard auction={makeAuction({ title: 'Giga Auction' })} />);
    expect(screen.getByText('Giga Auction')).toBeInTheDocument();
  });

  it('renders the category when provided', () => {
    render(<AuctionCard auction={makeAuction({ category: 'Dino' })} />);
    expect(screen.getByText('Dino')).toBeInTheDocument();
  });

  it('does not show category when null', () => {
    render(<AuctionCard auction={makeAuction({ category: null })} />);
    // No category paragraph should be rendered
    expect(screen.queryByText(/^Dino$/)).not.toBeInTheDocument();
  });

  it('renders the StatusBadge with correct label for active', () => {
    render(<AuctionCard auction={makeAuction({ status: 'active' })} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders the StatusBadge with correct label for won', () => {
    render(<AuctionCard auction={makeAuction({ status: 'won' })} />);
    expect(screen.getByText('Won')).toBeInTheDocument();
  });

  it('renders the StatusBadge with correct label for lost', () => {
    render(<AuctionCard auction={makeAuction({ status: 'lost' })} />);
    expect(screen.getByText('Lost')).toBeInTheDocument();
  });

  it('renders formatted end date', () => {
    // end_time = 2026-03-20T10:00:00Z → "Mar 20, 2026 10:00"
    render(<AuctionCard auction={makeAuction()} />);
    expect(screen.getByText(/Mar 20, 2026/)).toBeInTheDocument();
  });
});

// ── AU-C03: AuctionCard shows countdown ──────────────────────────────────────

describe('AuctionCard – AU-C03: shows countdown for active auctions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Ends:" label and countdown when status is active', () => {
    const endTime = new Date(
      new Date('2026-03-19T10:00:00Z').getTime() + 2 * 3600 * 1000
    ).toISOString();

    render(<AuctionCard auction={makeAuction({ status: 'active', end_time: endTime })} />);

    expect(screen.getByText('Ends:')).toBeInTheDocument();
    // CountdownTimer should render ~2h countdown
    expect(screen.getByText(/2h 00m 00s/)).toBeInTheDocument();
  });

  it('does NOT show countdown for won auctions', () => {
    render(<AuctionCard auction={makeAuction({ status: 'won' })} />);
    expect(screen.queryByText('Ends:')).not.toBeInTheDocument();
  });

  it('does NOT show countdown for expired auctions', () => {
    render(<AuctionCard auction={makeAuction({ status: 'expired' })} />);
    expect(screen.queryByText('Ends:')).not.toBeInTheDocument();
  });
});

// ── AU-C04: AuctionCard color-coded by urgency ────────────────────────────────

describe('AuctionCard – AU-C04: countdown color coded by urgency', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses green color when more than 1 hour remains', () => {
    vi.useFakeTimers();
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();

    const { container } = render(<AuctionCard auction={makeAuction({ end_time: endTime })} />);
    const countdown = container.querySelector('.text-green-400');
    expect(countdown).not.toBeNull();
  });

  it('uses yellow color when between 15m and 1h remains', () => {
    vi.useFakeTimers();
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    const { container } = render(<AuctionCard auction={makeAuction({ end_time: endTime })} />);
    const countdown = container.querySelector('.text-yellow-400');
    expect(countdown).not.toBeNull();
  });

  it('uses red color when 15 minutes or less remains', () => {
    vi.useFakeTimers();
    const now = new Date('2026-03-19T10:00:00Z');
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    const { container } = render(<AuctionCard auction={makeAuction({ end_time: endTime })} />);
    const countdown = container.querySelector('.text-red-400');
    expect(countdown).not.toBeNull();
  });
});

// ── Bid info rendering ────────────────────────────────────────────────────────

describe('AuctionCard – bid information', () => {
  it('shows current bid when present', () => {
    render(
      <AuctionCard
        auction={makeAuction({ current_bid: 500, bid_currency: 'Ingots' })}
      />
    );
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/Ingots/)).toBeInTheDocument();
  });

  it('shows min increment when present', () => {
    render(
      <AuctionCard
        auction={makeAuction({
          current_bid: 1000,
          bid_currency: 'Ingots',
          min_increment: 50,
          increment_currency: 'Ingots',
        })}
      />
    );
    expect(screen.getByText(/\+50/)).toBeInTheDocument();
  });

  it('does not show bid section when no bid info', () => {
    render(
      <AuctionCard
        auction={makeAuction({ current_bid: null, min_increment: null })}
      />
    );
    expect(screen.queryByText(/Bid:/)).not.toBeInTheDocument();
  });
});

// ── Source link rendering ─────────────────────────────────────────────────────

describe('AuctionCard – source link', () => {
  it('shows source link button when source_link is provided', () => {
    render(
      <AuctionCard
        auction={makeAuction({
          source_link: 'https://discord.com/channels/1/2/3',
          source_type: 'discord',
        })}
      />
    );
    // Button with external link icon should be present
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not show source link button when source_link is null', () => {
    render(<AuctionCard auction={makeAuction({ source_link: null })} />);
    // No external link button (the card itself is not a button)
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows pickup server when provided', () => {
    render(<AuctionCard auction={makeAuction({ pickup_server: 'Ragnarok' })} />);
    expect(screen.getByText('Ragnarok')).toBeInTheDocument();
  });
});

// ── Click handler ─────────────────────────────────────────────────────────────

describe('AuctionCard – interaction', () => {
  it('calls onClick when card is clicked', async () => {
    // Use real timers so userEvent does not deadlock
    const onClick = vi.fn();

    // Render with a past end_time so CountdownTimer shows "Ended" immediately
    render(
      <AuctionCard
        auction={makeAuction({ end_time: '2020-01-01T00:00:00Z' })}
        onClick={onClick}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('Test Rex Auction'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
