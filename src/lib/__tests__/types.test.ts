import { describe, it, expect } from 'vitest';
import type {
  Auction,
  CreateAuctionPayload,
  UpdateAuctionPayload,
  Alarm,
  CreateAlarmPayload,
  UpdateAlarmPayload,
  PostMetadata,
  ParsedAuctionText,
} from '../types';

// Helper to build a minimal valid Auction object
function makeAuction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: 'uuid-1',
    title: 'Rex Auction',
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

// Helper to build a minimal valid Alarm object
function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alarm-uuid-1',
    label: 'My Alarm',
    alarm_type: 'alarm',
    trigger_at: '2026-03-20T08:00:00Z',
    duration_ms: null,
    original_duration_ms: null,
    started_at: null,
    is_active: true,
    repeat_rule: null,
    created_at: '2026-03-19T00:00:00Z',
    updated_at: '2026-03-19T00:00:00Z',
    ...overrides,
  };
}

describe('Auction type', () => {
  it('accepts all valid status values', () => {
    const statuses: Auction['status'][] = ['active', 'won', 'lost', 'expired', 'cancelled'];
    statuses.forEach((status) => {
      const auction = makeAuction({ status });
      expect(auction.status).toBe(status);
    });
  });

  it('holds nullable fields as null when absent', () => {
    const auction = makeAuction();
    expect(auction.category).toBeNull();
    expect(auction.source_link).toBeNull();
    expect(auction.current_bid).toBeNull();
    expect(auction.notes).toBeNull();
  });

  it('holds numeric bid values', () => {
    const auction = makeAuction({ current_bid: 500, min_increment: 50 });
    expect(auction.current_bid).toBe(500);
    expect(auction.min_increment).toBe(50);
  });

  it('stores string timestamps for start_time and end_time', () => {
    const auction = makeAuction();
    expect(typeof auction.start_time).toBe('string');
    expect(typeof auction.end_time).toBe('string');
  });
});

describe('CreateAuctionPayload type', () => {
  it('requires only start_time, end_time and title', () => {
    const payload: CreateAuctionPayload = {
      title: 'Rex Auction',
      start_time: '2026-03-19T10:00:00Z',
      end_time: '2026-03-20T10:00:00Z',
    };
    expect(payload.title).toBe('Rex Auction');
  });

  it('accepts optional fields', () => {
    const payload: CreateAuctionPayload = {
      title: 'Giga',
      start_time: '2026-03-19T10:00:00Z',
      end_time: '2026-03-20T10:00:00Z',
      category: 'Dino',
      current_bid: 1000,
      bid_currency: 'Ingots',
      reminder_intervals: [60, 30, 15, 5, 1],
    };
    expect(payload.category).toBe('Dino');
    expect(payload.reminder_intervals).toHaveLength(5);
  });
});

describe('UpdateAuctionPayload type', () => {
  it('all fields are optional', () => {
    const payload: UpdateAuctionPayload = {};
    expect(payload).toBeDefined();
  });

  it('accepts partial updates', () => {
    const payload: UpdateAuctionPayload = { status: 'won', current_bid: 9000 };
    expect(payload.status).toBe('won');
    expect(payload.current_bid).toBe(9000);
  });
});

describe('Alarm type', () => {
  it('accepts alarm_type variants', () => {
    const types: Alarm['alarm_type'][] = ['alarm', 'timer', 'stopwatch'];
    types.forEach((alarm_type) => {
      const alarm = makeAlarm({ alarm_type });
      expect(alarm.alarm_type).toBe(alarm_type);
    });
  });

  it('timer alarm uses duration_ms instead of trigger_at', () => {
    const alarm = makeAlarm({ alarm_type: 'timer', trigger_at: null, duration_ms: 300000 });
    expect(alarm.duration_ms).toBe(300000);
    expect(alarm.trigger_at).toBeNull();
  });

  it('is_active is boolean', () => {
    const active = makeAlarm({ is_active: true });
    const paused = makeAlarm({ is_active: false });
    expect(active.is_active).toBe(true);
    expect(paused.is_active).toBe(false);
  });
});

describe('CreateAlarmPayload type', () => {
  it('requires label and alarm_type', () => {
    const payload: CreateAlarmPayload = { label: 'Wake up', alarm_type: 'alarm' };
    expect(payload.label).toBe('Wake up');
    expect(payload.alarm_type).toBe('alarm');
  });

  it('accepts optional trigger_at and duration_ms', () => {
    const payload: CreateAlarmPayload = {
      label: 'Timer 5min',
      alarm_type: 'timer',
      duration_ms: 300000,
    };
    expect(payload.duration_ms).toBe(300000);
  });
});

describe('UpdateAlarmPayload type', () => {
  it('all fields are optional', () => {
    const payload: UpdateAlarmPayload = {};
    expect(payload).toBeDefined();
  });

  it('accepts is_active toggle', () => {
    const payload: UpdateAlarmPayload = { is_active: false };
    expect(payload.is_active).toBe(false);
  });
});

describe('PostMetadata type', () => {
  it('holds all expected fields', () => {
    const meta: PostMetadata = {
      platform: 'discord',
      post_id: '123456789',
      post_timestamp: '2026-03-19T12:00:00Z',
      author: 'user#1234',
      text_preview: 'Auction for Rex...',
      error: null,
    };
    expect(meta.platform).toBe('discord');
    expect(meta.error).toBeNull();
  });

  it('error field captures parse failures', () => {
    const meta: PostMetadata = {
      platform: 'unknown',
      post_id: null,
      post_timestamp: null,
      author: null,
      text_preview: null,
      error: 'Failed to fetch page',
    };
    expect(meta.error).toBe('Failed to fetch page');
  });
});

describe('ParsedAuctionText type', () => {
  it('raw_text is required and non-nullable', () => {
    const parsed: ParsedAuctionText = {
      title: null,
      duration_hours: 24,
      start_time: null,
      end_time: null,
      bid_amount: 500,
      bid_currency: 'Tek Ceilings',
      min_increment: 50,
      increment_currency: null,
      pickup_server: 'Ragnarok',
      timezone_hint: 'CET',
      raw_text: '24h auction, bidding starts at 500 Tek Ceilings',
    };
    expect(typeof parsed.raw_text).toBe('string');
    expect(parsed.duration_hours).toBe(24);
    expect(parsed.bid_amount).toBe(500);
  });

  it('all nullable fields can be null', () => {
    const parsed: ParsedAuctionText = {
      title: null,
      duration_hours: null,
      start_time: null,
      end_time: null,
      bid_amount: null,
      bid_currency: null,
      min_increment: null,
      increment_currency: null,
      pickup_server: null,
      timezone_hint: null,
      raw_text: 'Selling my Rex!',
    };
    expect(parsed.title).toBeNull();
    expect(parsed.duration_hours).toBeNull();
  });
});
