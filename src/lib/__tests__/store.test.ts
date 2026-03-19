import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Auction, Alarm } from '../types';

// ── Mock the tauri module before importing the stores ─────────────────────────
vi.mock('../tauri', () => ({
  getActiveAuctions: vi.fn(),
  getAuctionsByStatus: vi.fn(),
  getAuctionsByCategory: vi.fn(),
  createAuction: vi.fn(),
  updateAuction: vi.fn(),
  deleteAuction: vi.fn(),
  getAlarms: vi.fn(),
  createAlarm: vi.fn(),
  updateAlarm: vi.fn(),
  deleteAlarm: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));

// Import stores AFTER mock is registered
import * as tauriMock from '../tauri';
import { useAuctionStore } from '../store';
import { useTimerStore } from '../store';
import { useSettingsStore } from '../store';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAuction(id: string, status: Auction['status'] = 'active'): Auction {
  return {
    id,
    title: `Auction ${id}`,
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
    status,
    notes: null,
    raw_post_text: null,
    created_at: '2026-03-19T00:00:00Z',
    updated_at: '2026-03-19T00:00:00Z',
  };
}

function makeAlarm(id: string, is_active = true): Alarm {
  return {
    id,
    label: `Alarm ${id}`,
    alarm_type: 'timer',
    trigger_at: null,
    duration_ms: 300000,
    is_active,
    repeat_rule: null,
    created_at: '2026-03-19T00:00:00Z',
    updated_at: '2026-03-19T00:00:00Z',
  };
}

// ── Auction Store ─────────────────────────────────────────────────────────────

describe('useAuctionStore', () => {
  beforeEach(() => {
    // Reset store state to initial values
    useAuctionStore.setState({ auctions: [], loading: false, error: null });
    vi.clearAllMocks();
  });

  it('initial state has empty auctions and no error', () => {
    const state = useAuctionStore.getState();
    expect(state.auctions).toHaveLength(0);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setAuctions updates the list directly', () => {
    const list = [makeAuction('a1'), makeAuction('a2')];
    useAuctionStore.getState().setAuctions(list);
    expect(useAuctionStore.getState().auctions).toHaveLength(2);
  });

  it('fetchActiveAuctions populates store on success', async () => {
    const list = [makeAuction('a1'), makeAuction('a2')];
    vi.mocked(tauriMock.getActiveAuctions).mockResolvedValue(list);

    await useAuctionStore.getState().fetchActiveAuctions();

    const state = useAuctionStore.getState();
    expect(state.auctions).toHaveLength(2);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchActiveAuctions sets error on failure', async () => {
    vi.mocked(tauriMock.getActiveAuctions).mockRejectedValue(new Error('DB error'));

    await useAuctionStore.getState().fetchActiveAuctions();

    const state = useAuctionStore.getState();
    expect(state.error).toContain('DB error');
    expect(state.loading).toBe(false);
  });

  it('fetchActiveAuctions sets loading=true then false', async () => {
    let loadingDuringFetch = false;
    vi.mocked(tauriMock.getActiveAuctions).mockImplementation(async () => {
      loadingDuringFetch = useAuctionStore.getState().loading;
      return [];
    });

    await useAuctionStore.getState().fetchActiveAuctions();
    expect(loadingDuringFetch).toBe(true);
    expect(useAuctionStore.getState().loading).toBe(false);
  });

  it('fetchAuctionsByStatus filters correctly', async () => {
    const wonList = [makeAuction('w1', 'won')];
    vi.mocked(tauriMock.getAuctionsByStatus).mockResolvedValue(wonList);

    await useAuctionStore.getState().fetchAuctionsByStatus('won');

    expect(tauriMock.getAuctionsByStatus).toHaveBeenCalledWith('won');
    expect(useAuctionStore.getState().auctions[0].status).toBe('won');
  });

  it('fetchAuctionsByCategory filters correctly', async () => {
    const dinoList = [makeAuction('d1')];
    vi.mocked(tauriMock.getAuctionsByCategory).mockResolvedValue(dinoList);

    await useAuctionStore.getState().fetchAuctionsByCategory('Dino');

    expect(tauriMock.getAuctionsByCategory).toHaveBeenCalledWith('Dino');
    expect(useAuctionStore.getState().auctions).toHaveLength(1);
  });

  it('createAuction appends to list and returns new auction', async () => {
    const newAuction = makeAuction('new1');
    vi.mocked(tauriMock.createAuction).mockResolvedValue(newAuction);

    const result = await useAuctionStore.getState().createAuction({
      title: 'Auction new1',
      start_time: '2026-03-19T10:00:00Z',
      end_time: '2026-03-20T10:00:00Z',
    });

    expect(result).toEqual(newAuction);
    expect(useAuctionStore.getState().auctions).toContainEqual(newAuction);
  });

  it('updateAuction replaces the matching auction in list', async () => {
    const original = makeAuction('upd1');
    const updated = { ...original, title: 'Updated Title' };
    useAuctionStore.setState({ auctions: [original] });
    vi.mocked(tauriMock.updateAuction).mockResolvedValue(updated);

    await useAuctionStore.getState().updateAuction('upd1', { title: 'Updated Title' });

    const state = useAuctionStore.getState();
    expect(state.auctions[0].title).toBe('Updated Title');
  });

  it('deleteAuction removes auction by id', async () => {
    useAuctionStore.setState({ auctions: [makeAuction('del1'), makeAuction('del2')] });
    vi.mocked(tauriMock.deleteAuction).mockResolvedValue(undefined);

    await useAuctionStore.getState().deleteAuction('del1');

    const ids = useAuctionStore.getState().auctions.map((a) => a.id);
    expect(ids).not.toContain('del1');
    expect(ids).toContain('del2');
  });
});

// ── Timer Store ───────────────────────────────────────────────────────────────

describe('useTimerStore', () => {
  beforeEach(() => {
    useTimerStore.setState({ alarms: [], loading: false, error: null });
    vi.clearAllMocks();
  });

  it('initial state has empty alarms', () => {
    const state = useTimerStore.getState();
    expect(state.alarms).toHaveLength(0);
    expect(state.loading).toBe(false);
  });

  it('fetchAlarms populates alarm list', async () => {
    const list = [makeAlarm('t1'), makeAlarm('t2')];
    vi.mocked(tauriMock.getAlarms).mockResolvedValue(list);

    await useTimerStore.getState().fetchAlarms();

    expect(useTimerStore.getState().alarms).toHaveLength(2);
    expect(useTimerStore.getState().error).toBeNull();
  });

  it('fetchAlarms sets error on failure', async () => {
    vi.mocked(tauriMock.getAlarms).mockRejectedValue(new Error('tauri error'));

    await useTimerStore.getState().fetchAlarms();

    expect(useTimerStore.getState().error).toContain('tauri error');
  });

  it('createAlarm appends alarm to list', async () => {
    const alarm = makeAlarm('tm1');
    vi.mocked(tauriMock.createAlarm).mockResolvedValue(alarm);

    await useTimerStore.getState().createAlarm({ label: 'Alarm tm1', alarm_type: 'timer', duration_ms: 300000 });

    expect(useTimerStore.getState().alarms).toContainEqual(alarm);
  });

  it('updateAlarm replaces matching alarm', async () => {
    const original = makeAlarm('upd1');
    const updated = { ...original, label: 'Renamed' };
    useTimerStore.setState({ alarms: [original] });
    vi.mocked(tauriMock.updateAlarm).mockResolvedValue(updated);

    await useTimerStore.getState().updateAlarm('upd1', { label: 'Renamed' });

    expect(useTimerStore.getState().alarms[0].label).toBe('Renamed');
  });

  it('deleteAlarm removes alarm by id', async () => {
    useTimerStore.setState({ alarms: [makeAlarm('del1'), makeAlarm('del2')] });
    vi.mocked(tauriMock.deleteAlarm).mockResolvedValue(undefined);

    await useTimerStore.getState().deleteAlarm('del1');

    const ids = useTimerStore.getState().alarms.map((a) => a.id);
    expect(ids).not.toContain('del1');
    expect(ids).toContain('del2');
  });

  it('pauseTimer updates is_active to false', async () => {
    const alarm = makeAlarm('p1', true);
    const paused = { ...alarm, is_active: false };
    useTimerStore.setState({ alarms: [alarm] });
    vi.mocked(tauriMock.pauseTimer).mockResolvedValue(paused);

    const result = await useTimerStore.getState().pauseTimer('p1');

    expect(result.is_active).toBe(false);
    expect(useTimerStore.getState().alarms[0].is_active).toBe(false);
  });

  it('resumeTimer updates is_active to true', async () => {
    const alarm = makeAlarm('r1', false);
    const resumed = { ...alarm, is_active: true };
    useTimerStore.setState({ alarms: [alarm] });
    vi.mocked(tauriMock.resumeTimer).mockResolvedValue(resumed);

    const result = await useTimerStore.getState().resumeTimer('r1');

    expect(result.is_active).toBe(true);
    expect(useTimerStore.getState().alarms[0].is_active).toBe(true);
  });
});

// ── Settings Store ────────────────────────────────────────────────────────────

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ notificationMode: 'all', theme: 'dark', loaded: false });
    vi.clearAllMocks();
  });

  it('initial state has sensible defaults', () => {
    const state = useSettingsStore.getState();
    expect(state.notificationMode).toBe('all');
    expect(state.theme).toBe('dark');
    expect(state.loaded).toBe(false);
  });

  it('loadSettings populates from tauri getSetting', async () => {
    vi.mocked(tauriMock.getSetting).mockImplementation(async (key: string) => {
      if (key === 'notification_mode') return 'normal';
      if (key === 'theme') return 'light';
      return null;
    });

    await useSettingsStore.getState().loadSettings();

    const state = useSettingsStore.getState();
    expect(state.notificationMode).toBe('normal');
    expect(state.theme).toBe('light');
    expect(state.loaded).toBe(true);
  });

  it('loadSettings uses defaults when getSetting returns null', async () => {
    vi.mocked(tauriMock.getSetting).mockResolvedValue(null);

    await useSettingsStore.getState().loadSettings();

    const state = useSettingsStore.getState();
    expect(state.notificationMode).toBe('all');
    expect(state.theme).toBe('dark');
    expect(state.loaded).toBe(true);
  });

  it('loadSettings sets loaded=true even on error', async () => {
    vi.mocked(tauriMock.getSetting).mockRejectedValue(new Error('tauri not available'));

    await useSettingsStore.getState().loadSettings();

    expect(useSettingsStore.getState().loaded).toBe(true);
  });

  it('setNotificationMode persists and updates state', async () => {
    vi.mocked(tauriMock.setSetting).mockResolvedValue(undefined);

    await useSettingsStore.getState().setNotificationMode('urgent_only');

    expect(tauriMock.setSetting).toHaveBeenCalledWith('notification_mode', 'urgent_only');
    expect(useSettingsStore.getState().notificationMode).toBe('urgent_only');
  });

  it('setTheme persists and updates state', async () => {
    vi.mocked(tauriMock.setSetting).mockResolvedValue(undefined);

    await useSettingsStore.getState().setTheme('light');

    expect(tauriMock.setSetting).toHaveBeenCalledWith('theme', 'light');
    expect(useSettingsStore.getState().theme).toBe('light');
  });
});
