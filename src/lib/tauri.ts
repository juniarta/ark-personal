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
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryField,
  CreateCategoryFieldPayload,
  InventoryItem,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  ProfitLoss,
  MonthlySummary,
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

export async function syncTransmitterTimer(id: string, remainingSeconds: number): Promise<TransmitterServer> {
  const invoke = await getInvoke();
  return invoke<TransmitterServer>('sync_timer', { id, remaining_seconds: remainingSeconds });
}

export async function fetchOfficialServers(): Promise<ArkOfficialServer[]> {
  const invoke = await getInvoke();
  return invoke<ArkOfficialServer[]>('fetch_official_servers');
}

// ── Settings commands ─────────────────────────────────────────────────────────

export interface UpdateInfo {
  current_version: string;
  latest_version: string;
  has_update: boolean;
  download_url: string;
  release_notes: string;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const invoke = await getInvoke();
  return invoke<UpdateInfo>('check_for_update');
}

export async function getSetting(key: string): Promise<string | null> {
  const invoke = await getInvoke();
  return invoke<string | null>('get_setting', { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('set_setting', { key, value });
}

// ── Inventory Category commands ───────────────────────────────────────────────

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  const invoke = await getInvoke();
  return invoke<Category>('create_category', { payload });
}

export async function getCategories(): Promise<Category[]> {
  const invoke = await getInvoke();
  return invoke<Category[]>('get_categories');
}

export async function updateCategory(id: string, payload: UpdateCategoryPayload): Promise<Category> {
  const invoke = await getInvoke();
  return invoke<Category>('update_category', { id, payload });
}

export async function deleteCategory(id: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('delete_category', { id });
}

// ── Inventory Category Field commands ─────────────────────────────────────────

export async function addCategoryField(payload: CreateCategoryFieldPayload): Promise<CategoryField> {
  const invoke = await getInvoke();
  return invoke<CategoryField>('add_category_field', { payload });
}

export async function getCategoryFields(categoryId: string): Promise<CategoryField[]> {
  const invoke = await getInvoke();
  return invoke<CategoryField[]>('get_category_fields', { categoryId });
}

export async function removeCategoryField(id: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('remove_category_field', { id });
}

// ── Inventory Item commands ───────────────────────────────────────────────────

export async function createInventoryItem(payload: CreateInventoryItemPayload): Promise<InventoryItem> {
  const invoke = await getInvoke();
  return invoke<InventoryItem>('create_inventory_item', { payload });
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const invoke = await getInvoke();
  return invoke<InventoryItem[]>('get_inventory_items');
}

export async function getInventoryByCategory(categoryId: string): Promise<InventoryItem[]> {
  const invoke = await getInvoke();
  return invoke<InventoryItem[]>('get_inventory_by_category', { categoryId });
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryItemPayload): Promise<InventoryItem> {
  const invoke = await getInvoke();
  return invoke<InventoryItem>('update_inventory_item', { id, payload });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('delete_inventory_item', { id });
}

export async function searchInventory(query: string): Promise<InventoryItem[]> {
  const invoke = await getInvoke();
  return invoke<InventoryItem[]>('search_inventory', { query });
}

// ── Transaction / Expense commands ───────────────────────────────────────────

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  const invoke = await getInvoke();
  return invoke<Transaction>('create_transaction', { payload });
}

export async function getTransactions(): Promise<Transaction[]> {
  const invoke = await getInvoke();
  return invoke<Transaction[]>('get_transactions');
}

export async function getTransactionsByType(transactionType: string): Promise<Transaction[]> {
  const invoke = await getInvoke();
  return invoke<Transaction[]>('get_transactions_by_type', { transactionType });
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const invoke = await getInvoke();
  return invoke<Transaction[]>('get_transactions_by_date_range', { startDate, endDate });
}

export async function updateTransaction(id: string, payload: UpdateTransactionPayload): Promise<Transaction> {
  const invoke = await getInvoke();
  return invoke<Transaction>('update_transaction', { id, payload });
}

export async function deleteTransaction(id: string): Promise<void> {
  const invoke = await getInvoke();
  return invoke<void>('delete_transaction', { id });
}

export async function getExpenseSummary(): Promise<MonthlySummary[]> {
  const invoke = await getInvoke();
  return invoke<MonthlySummary[]>('get_expense_summary');
}

export async function getIncomeSummary(): Promise<MonthlySummary[]> {
  const invoke = await getInvoke();
  return invoke<MonthlySummary[]>('get_income_summary');
}

export async function getProfitLoss(): Promise<ProfitLoss> {
  const invoke = await getInvoke();
  return invoke<ProfitLoss>('get_profit_loss');
}

export async function getMonthlySummary(): Promise<MonthlySummary[]> {
  const invoke = await getInvoke();
  return invoke<MonthlySummary[]>('get_monthly_summary');
}
