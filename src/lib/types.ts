export interface Auction {
  id: string;
  title: string;
  category: string | null;
  source_link: string | null;
  source_type: string | null;
  source_post_id: string | null;
  duration_type: string | null;
  start_time: string;
  end_time: string;
  start_time_source: string | null;
  current_bid: number | null;
  bid_currency: string | null;
  min_increment: number | null;
  increment_currency: string | null;
  pickup_server: string | null;
  status: 'active' | 'won' | 'lost' | 'expired' | 'cancelled';
  notes: string | null;
  raw_post_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAuctionPayload {
  title: string;
  category?: string;
  source_link?: string;
  source_type?: string;
  source_post_id?: string;
  duration_type?: string;
  start_time: string;
  end_time: string;
  start_time_source?: string;
  current_bid?: number;
  bid_currency?: string;
  min_increment?: number;
  increment_currency?: string;
  pickup_server?: string;
  notes?: string;
  raw_post_text?: string;
  reminder_intervals?: number[];
}

export interface UpdateAuctionPayload {
  title?: string;
  category?: string;
  current_bid?: number;
  bid_currency?: string;
  status?: string;
  notes?: string;
  end_time?: string;
}

export interface Alarm {
  id: string;
  label: string;
  alarm_type: 'alarm' | 'timer' | 'stopwatch';
  trigger_at: string | null;
  duration_ms: number | null;
  is_active: boolean;
  repeat_rule: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAlarmPayload {
  label: string;
  alarm_type: string;
  trigger_at?: string;
  duration_ms?: number;
  repeat_rule?: string;
}

export interface UpdateAlarmPayload {
  label?: string;
  trigger_at?: string;
  duration_ms?: number;
  is_active?: boolean;
  repeat_rule?: string;
}

export interface PostMetadata {
  platform: string;
  post_id: string | null;
  post_timestamp: string | null;
  author: string | null;
  text_preview: string | null;
  error: string | null;
}

export interface ParsedAuctionText {
  title: string | null;
  duration_hours: number | null;
  start_time: string | null;
  end_time: string | null;
  bid_amount: number | null;
  bid_currency: string | null;
  min_increment: number | null;
  increment_currency: string | null;
  pickup_server: string | null;
  timezone_hint: string | null;
  raw_text: string;
}

// ── Transmitter Server types ──────────────────────────────────────────────────

export interface TransmitterServer {
  id: string;
  server_name: string;
  server_id: string | null;
  map_name: string | null;
  cluster_id: string | null;
  is_pvp: boolean;
  timer_duration_s: number; // default 900
  is_running: boolean;
  started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransmitterPayload {
  server_name: string;
  server_id?: string;
  map_name?: string;
  cluster_id?: string;
  is_pvp: boolean;
  timer_duration_s: number;
}

export interface UpdateTransmitterPayload {
  server_name?: string;
  timer_duration_s?: number;
}

export interface ArkOfficialServer {
  session_name: string;
  session_id: string;
  map_name: string;
  cluster_id: string;
  is_pvp: boolean;
  num_players: number;
  max_players: number;
}
