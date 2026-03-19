import { create } from 'zustand';
import type { Auction, Alarm, TransmitterServer, ArkOfficialServer, CreateTransmitterPayload, UpdateTransmitterPayload } from './types';
import * as tauri from './tauri';

// ── Auction Store ─────────────────────────────────────────────────────────────

interface AuctionStore {
  auctions: Auction[];
  loading: boolean;
  error: string | null;

  fetchActiveAuctions: () => Promise<void>;
  fetchAuctionsByStatus: (status: string) => Promise<void>;
  fetchAuctionsByCategory: (category: string) => Promise<void>;
  createAuction: (payload: Parameters<typeof tauri.createAuction>[0]) => Promise<Auction>;
  updateAuction: (id: string, payload: Parameters<typeof tauri.updateAuction>[1]) => Promise<Auction>;
  deleteAuction: (id: string) => Promise<void>;
  setAuctions: (auctions: Auction[]) => void;
}

export const useAuctionStore = create<AuctionStore>((set, get) => ({
  auctions: [],
  loading: false,
  error: null,

  fetchActiveAuctions: async () => {
    set({ loading: true, error: null });
    try {
      const auctions = await tauri.getActiveAuctions();
      set({ auctions, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchAuctionsByStatus: async (status: string) => {
    set({ loading: true, error: null });
    try {
      const auctions = await tauri.getAuctionsByStatus(status);
      set({ auctions, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchAuctionsByCategory: async (category: string) => {
    set({ loading: true, error: null });
    try {
      const auctions = await tauri.getAuctionsByCategory(category);
      set({ auctions, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createAuction: async (payload) => {
    const auction = await tauri.createAuction(payload);
    set((state) => ({ auctions: [...state.auctions, auction] }));
    return auction;
  },

  updateAuction: async (id, payload) => {
    const updated = await tauri.updateAuction(id, payload);
    set((state) => ({
      auctions: state.auctions.map((a) => (a.id === id ? updated : a)),
    }));
    return updated;
  },

  deleteAuction: async (id) => {
    await tauri.deleteAuction(id);
    set((state) => ({
      auctions: state.auctions.filter((a) => a.id !== id),
    }));
  },

  setAuctions: (auctions) => set({ auctions }),
}));

// ── Timer Store ───────────────────────────────────────────────────────────────

interface TimerStore {
  alarms: Alarm[];
  loading: boolean;
  error: string | null;

  fetchAlarms: () => Promise<void>;
  createAlarm: (payload: Parameters<typeof tauri.createAlarm>[0]) => Promise<Alarm>;
  updateAlarm: (id: string, payload: Parameters<typeof tauri.updateAlarm>[1]) => Promise<Alarm>;
  deleteAlarm: (id: string) => Promise<void>;
  pauseTimer: (id: string) => Promise<Alarm>;
  resumeTimer: (id: string) => Promise<Alarm>;
}

export const useTimerStore = create<TimerStore>((set) => ({
  alarms: [],
  loading: false,
  error: null,

  fetchAlarms: async () => {
    set({ loading: true, error: null });
    try {
      const alarms = await tauri.getAlarms();
      set({ alarms, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createAlarm: async (payload) => {
    const alarm = await tauri.createAlarm(payload);
    set((state) => ({ alarms: [...state.alarms, alarm] }));
    return alarm;
  },

  updateAlarm: async (id, payload) => {
    const updated = await tauri.updateAlarm(id, payload);
    set((state) => ({
      alarms: state.alarms.map((a) => (a.id === id ? updated : a)),
    }));
    return updated;
  },

  deleteAlarm: async (id) => {
    await tauri.deleteAlarm(id);
    set((state) => ({
      alarms: state.alarms.filter((a) => a.id !== id),
    }));
  },

  pauseTimer: async (id) => {
    const updated = await tauri.pauseTimer(id);
    set((state) => ({
      alarms: state.alarms.map((a) => (a.id === id ? updated : a)),
    }));
    return updated;
  },

  resumeTimer: async (id) => {
    const updated = await tauri.resumeTimer(id);
    set((state) => ({
      alarms: state.alarms.map((a) => (a.id === id ? updated : a)),
    }));
    return updated;
  },
}));

// ── Transmitter Store ─────────────────────────────────────────────────────────

interface TransmitterStore {
  servers: TransmitterServer[];
  officialServers: ArkOfficialServer[];
  loading: boolean;
  error: string | null;

  fetchServers: () => Promise<void>;
  fetchOfficialServers: () => Promise<void>;
  addServer: (payload: CreateTransmitterPayload) => Promise<TransmitterServer>;
  updateServer: (id: string, payload: UpdateTransmitterPayload) => Promise<TransmitterServer>;
  removeServer: (id: string) => Promise<void>;
  startTimer: (id: string) => Promise<TransmitterServer>;
  stopTimer: (id: string) => Promise<TransmitterServer>;
  resetTimer: (id: string) => Promise<TransmitterServer>;
}

export const useTransmitterStore = create<TransmitterStore>((set) => ({
  servers: [],
  officialServers: [],
  loading: false,
  error: null,

  fetchServers: async () => {
    set({ loading: true, error: null });
    try {
      const servers = await tauri.getTransmitterServers();
      set({ servers, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchOfficialServers: async () => {
    set({ loading: true, error: null });
    try {
      const officialServers = await tauri.fetchOfficialServers();
      set({ officialServers, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  addServer: async (payload) => {
    const server = await tauri.addTransmitterServer(payload);
    set((state) => ({ servers: [...state.servers, server] }));
    return server;
  },

  updateServer: async (id, payload) => {
    const updated = await tauri.updateTransmitterServer(id, payload);
    set((state) => ({
      servers: state.servers.map((s) => (s.id === id ? updated : s)),
    }));
    return updated;
  },

  removeServer: async (id) => {
    await tauri.removeTransmitterServer(id);
    set((state) => ({
      servers: state.servers.filter((s) => s.id !== id),
    }));
  },

  startTimer: async (id) => {
    const updated = await tauri.startTransmitterTimer(id);
    set((state) => ({
      servers: state.servers.map((s) => (s.id === id ? updated : s)),
    }));
    return updated;
  },

  stopTimer: async (id) => {
    const updated = await tauri.stopTransmitterTimer(id);
    set((state) => ({
      servers: state.servers.map((s) => (s.id === id ? updated : s)),
    }));
    return updated;
  },

  resetTimer: async (id) => {
    const updated = await tauri.resetTransmitterTimer(id);
    set((state) => ({
      servers: state.servers.map((s) => (s.id === id ? updated : s)),
    }));
    return updated;
  },
}));

// ── Settings Store ────────────────────────────────────────────────────────────

interface SettingsStore {
  notificationMode: string;
  theme: string;
  loaded: boolean;

  loadSettings: () => Promise<void>;
  setNotificationMode: (mode: string) => Promise<void>;
  setTheme: (theme: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  notificationMode: 'all',
  theme: 'dark',
  loaded: false,

  loadSettings: async () => {
    try {
      const [notifMode, theme] = await Promise.all([
        tauri.getSetting('notification_mode'),
        tauri.getSetting('theme'),
      ]);
      set({
        notificationMode: notifMode ?? 'all',
        theme: theme ?? 'dark',
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setNotificationMode: async (mode) => {
    await tauri.setSetting('notification_mode', mode);
    set({ notificationMode: mode });
  },

  setTheme: async (theme) => {
    await tauri.setSetting('theme', theme);
    set({ theme });
  },
}));
