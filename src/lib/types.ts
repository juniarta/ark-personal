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
  original_duration_ms: number | null;
  started_at: string | null;
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

// ── Inventory types ───────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryField {
  id: string;
  category_id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'dropdown' | 'date' | 'boolean';
  options: string | null; // JSON array for dropdown
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  category_id: string;
  auction_id: string | null;
  name: string;
  quantity: number;
  field_data: string | null; // JSON object
  status: 'owned' | 'sold' | 'traded' | 'lost';
  acquired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryPayload {
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface CreateCategoryFieldPayload {
  category_id: string;
  field_name: string;
  field_type: string;
  options?: string;
  is_required?: boolean;
  sort_order?: number;
}

export interface CreateInventoryItemPayload {
  category_id: string;
  auction_id?: string;
  name: string;
  quantity?: number;
  field_data?: string;
  status?: string;
  acquired_at?: string;
  notes?: string;
}

export interface UpdateInventoryItemPayload {
  name?: string;
  quantity?: number;
  field_data?: string;
  status?: string;
  notes?: string;
}

// ── Expense types ─────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  transaction_type: 'buy' | 'sell' | 'bid' | 'trade';
  auction_id: string | null;
  inventory_item_id: string | null;
  description: string;
  ig_amount: number | null;
  ig_currency: string | null;
  real_amount: number | null;
  real_currency: string | null;
  counterparty: string | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionPayload {
  transaction_type: string;
  auction_id?: string;
  inventory_item_id?: string;
  description: string;
  ig_amount?: number;
  ig_currency?: string;
  real_amount?: number;
  real_currency?: string;
  counterparty?: string;
  transaction_date: string;
  notes?: string;
}

export interface UpdateTransactionPayload {
  description?: string;
  ig_amount?: number;
  ig_currency?: string;
  real_amount?: number;
  real_currency?: string;
  counterparty?: string;
  notes?: string;
}

export interface CurrencyProfitLoss {
  currency: string | null;
  income: number;
  expense: number;
  profit: number;
}

export interface ProfitLoss {
  ig: CurrencyProfitLoss[];
  real: CurrencyProfitLoss[];
}

export interface MonthlySummary {
  month: string;
  ig_expense: number;
  ig_income: number;
  real_expense: number;
  real_income: number;
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
