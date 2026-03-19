import type {
  Auction,
  CreateAuctionPayload,
  UpdateAuctionPayload,
  Alarm,
  CreateAlarmPayload,
  UpdateAlarmPayload,
  PostMetadata,
  ParsedAuctionText,
  TransmitterServer,
  CreateTransmitterPayload,
  UpdateTransmitterPayload,
  ArkOfficialServer,
} from './types';

// Lazy import invoke to avoid issues during SSG build
async function getInvoke() {
  if (typeof window === 'undefined') {
    throw new Error('Tauri invoke can only be called in browser context');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke;
}

// ── Auction commands ──────────────────────────────────────────────────────────

export async function createAuction(payload: CreateAuctionPayload): Promise<Auction> {
  const invoke = await getInvoke();
  return invoke<Auction>('create_auction', { payload });
}

export async function getActiveAuctions(): Promise<Auction[]> {
  const invoke = await getInvoke();
  return invoke<Auction[]>('get_active_auctions');
}

export async function getAuction(id: string): Promise<Auction> {
  const invoke = await getInvoke();
  return invoke<Auction>('get_auction', { id });
}

export async function updateAuction(id: string, payload: UpdateAuctionPayload): Promise<Auction> {
  const invoke = await getInvoke();
  return invoke<Auction>('update_auction', { id, payload });
}

export async function deleteAuction(id: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('delete_auction', { id });
}

export async function getAuctionsByStatus(status: string): Promise<Auction[]> {
  const invoke = await getInvoke();
  return invoke<Auction[]>('get_auctions_by_status', { status });
}

export async function getAuctionsByCategory(category: string): Promise<Auction[]> {
  const invoke = await getInvoke();
  return invoke<Auction[]>('get_auctions_by_category', { category });
}

// ── Timer / Alarm commands ────────────────────────────────────────────────────

export async function createAlarm(payload: CreateAlarmPayload): Promise<Alarm> {
  const invoke = await getInvoke();
  return invoke<Alarm>('create_alarm', { payload });
}

export async function getAlarms(): Promise<Alarm[]> {
  const invoke = await getInvoke();
  return invoke<Alarm[]>('get_alarms');
}

export async function updateAlarm(id: string, payload: UpdateAlarmPayload): Promise<Alarm> {
  const invoke = await getInvoke();
  return invoke<Alarm>('update_alarm', { id, payload });
}

export async function deleteAlarm(id: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('delete_alarm', { id });
}

export async function pauseTimer(id: string): Promise<Alarm> {
  const invoke = await getInvoke();
  return invoke<Alarm>('pause_timer', { id });
}

export async function resumeTimer(id: string): Promise<Alarm> {
  const invoke = await getInvoke();
  return invoke<Alarm>('resume_timer', { id });
}

// ── Parser commands ───────────────────────────────────────────────────────────

export async function parseSourceLink(url: string): Promise<PostMetadata> {
  const invoke = await getInvoke();
  return invoke<PostMetadata>('parse_source_link', { url });
}

export async function parseAuctionText(text: string): Promise<ParsedAuctionText> {
  const invoke = await getInvoke();
  return invoke<ParsedAuctionText>('parse_auction_text', { text });
}

// ── Transmitter Server commands ───────────────────────────────────────────────

export async function addTransmitterServer(payload: CreateTransmitterPayload): Promise<TransmitterServer> {
  const invoke = await getInvoke();
  return invoke<TransmitterServer>('add_transmitter_server', { payload });
}

export async function getTransmitterServers(): Promise<TransmitterServer[]> {
  const invoke = await getInvoke();
  return invoke<TransmitterServer[]>('get_transmitter_servers');
}

export async function updateTransmitterServer(id: string, payload: UpdateTransmitterPayload): Promise<TransmitterServer> {
  const invoke = await getInvoke();
  return invoke<TransmitterServer>('update_transmitter_server', { id, payload });
}

export async function removeTransmitterServer(id: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('remove_transmitter_server', { id });
}

export async function startTransmitterTimer(id: string): Promise<TransmitterServer> {
  const invoke = await getInvoke();
  return invoke<TransmitterServer>('start_timer', { id });
}

export async function stopTransmitterTimer(id: string): Promise<TransmitterServer> {
  const invoke = await getInvoke();
  return invoke<TransmitterServer>('stop_timer', { id });
}

export async function resetTransmitterTimer(id: string): Promise<TransmitterServer> {
  const invoke = await getInvoke();
  return invoke<TransmitterServer>('reset_timer', { id });
}

export async function fetchOfficialServers(): Promise<ArkOfficialServer[]> {
  const invoke = await getInvoke();
  return invoke<ArkOfficialServer[]>('fetch_official_servers');
}

// ── Settings commands ─────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const invoke = await getInvoke();
  return invoke<string | null>('get_setting', { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('set_setting', { key, value });
}
