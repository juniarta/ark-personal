# Testing Strategy & QA Standard

**Coverage Target:** 80% minimum per module
**Methodology:** Unit Test → Integration Test → E2E (manual/automated)

---

## Test Stack

### Desktop — Rust Backend

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Test | `cargo test` (built-in) | Test pure functions, logic, models |
| Mock | `mockall` crate | Mock DB, external dependencies |
| Integration Test | `cargo test` + in-memory SQLite | Test commands + real DB queries |
| Coverage | `cargo-tarpaulin` atau `llvm-cov` | Measure Rust code coverage |

### Desktop — Next.js Frontend

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Test | **Vitest** | Test utility functions, hooks, stores |
| Component Test | **Vitest + @testing-library/react** | Test React components render & interaction |
| Coverage | **Vitest** (`--coverage` via `v8` atau `istanbul`) | Measure JS/TS code coverage |

### Mobile — Flutter

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Test | `flutter test` (built-in) | Test Dart logic, models, providers |
| Widget Test | `flutter test` + `WidgetTester` | Test widget render & interaction |
| Mock | `mocktail` atau `mockito` | Mock Supabase client, repositories |
| Integration Test | `integration_test` package | Full app flow testing |
| Coverage | `flutter test --coverage` + `lcov` | Measure Dart code coverage |

---

## Coverage Target per Module

| Module | Unit | Integration | Target |
|--------|------|-------------|--------|
| Timer & Alarm | 85% | 75% | **80%** |
| Auction Alert | 85% | 80% | **80%** |
| Auction Reminders/Scheduler | 90% | 85% | **85%** |
| Inventory Calculator | 85% | 75% | **80%** |
| Expense Tracking | 85% | 80% | **80%** |
| Database Layer (Rust) | 80% | 85% | **80%** |
| UI Components (React) | 75% | — | **75%** |
| Sync Engine (Phase 3) | 85% | 85% | **85%** |

---

## Test File Convention

### Rust (`src-tauri/`)

```
src-tauri/src/
├── commands/
│   ├── auction.rs          # source
│   └── auction_test.rs     # unit test (atau #[cfg(test)] mod tests di file yang sama)
├── db/
│   ├── repository.rs
│   └── repository_test.rs
tests/                       # integration tests
├── auction_integration.rs
├── timer_integration.rs
└── helpers/
    └── mod.rs               # shared test fixtures & DB setup
```

Convention Rust: Gunakan `#[cfg(test)] mod tests { }` di bawah file source untuk unit test,
atau file terpisah `_test.rs` jika test terlalu besar.

### Next.js (`src/`)

```
src/
├── lib/
│   ├── utils.ts
│   └── __tests__/
│       └── utils.test.ts
├── components/
│   ├── auction/
│   │   ├── AuctionCard.tsx
│   │   └── __tests__/
│   │       └── AuctionCard.test.tsx
│   ├── timer/
│   │   ├── CountdownTimer.tsx
│   │   └── __tests__/
│   │       └── CountdownTimer.test.tsx
```

Convention: `__tests__/` folder di sebelah source file, nama file `*.test.ts(x)`.

### Flutter (`lib/`)

```
test/
├── features/
│   ├── auction/
│   │   ├── models/
│   │   │   └── auction_model_test.dart
│   │   ├── repositories/
│   │   │   └── auction_repository_test.dart
│   │   ├── providers/
│   │   │   └── auction_provider_test.dart
│   │   └── screens/
│   │       └── auction_list_screen_test.dart
│   ├── timer/
│   ├── inventory/
│   └── expenses/
├── core/
│   ├── sync/
│   │   └── sync_engine_test.dart
│   └── notifications/
│       └── notification_service_test.dart
integration_test/
└── app_test.dart
```

Convention Flutter: Mirror `lib/` structure di `test/`, suffix `_test.dart`.

---

## Test Commands

### Desktop — Rust

```bash
# Run all tests
cargo test --manifest-path src-tauri/Cargo.toml

# Run specific module tests
cargo test --manifest-path src-tauri/Cargo.toml auction

# Run with output (see println)
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture

# Coverage (via cargo-tarpaulin)
cargo tarpaulin --manifest-path src-tauri/Cargo.toml --out html --output-dir coverage/rust
```

### Desktop — Next.js

```bash
# Run all tests
npx vitest run

# Run specific test file
npx vitest run src/components/auction/__tests__/AuctionCard.test.tsx

# Watch mode
npx vitest

# Coverage report
npx vitest run --coverage
```

### Mobile — Flutter

```bash
# Run all tests
cd auction-personal-mobile && flutter test

# Run specific test
flutter test test/features/auction/models/auction_model_test.dart

# Coverage
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
```

---

## Standard Test Cases per Feature

### 1. Timer & Alarm

#### Unit Tests — Rust

| ID | Test Case | Input | Expected |
|----|-----------|-------|----------|
| TM-U01 | Create timer dengan valid duration | `duration_ms: 300000` (5min) | Timer created, status `active` |
| TM-U02 | Create timer dengan duration 0 | `duration_ms: 0` | Error: invalid duration |
| TM-U03 | Create timer dengan negative duration | `duration_ms: -1000` | Error: invalid duration |
| TM-U04 | Create alarm dengan valid datetime | `trigger_at: future ISO8601` | Alarm created, status `active` |
| TM-U05 | Create alarm dengan past datetime | `trigger_at: past ISO8601` | Error: trigger time is in the past |
| TM-U06 | Pause active timer | Timer in `active` state | Status → `paused`, remaining time saved |
| TM-U07 | Resume paused timer | Timer in `paused` state | Status → `active`, countdown resumes |
| TM-U08 | Cancel timer | Any timer | Status → `cancelled`, removed from scheduler |
| TM-U09 | Timer reaches zero | Running timer hits 0 | Status → `completed`, notification triggered |
| TM-U10 | Alarm with repeat daily | `repeat_rule: 'daily'` | After trigger, next alarm auto-set +24h |
| TM-U11 | Delete alarm | Valid alarm ID | Alarm removed from DB |
| TM-U12 | Delete non-existent alarm | Invalid ID | Error: not found |

#### Component Tests — React

| ID | Test Case | Expected |
|----|-----------|----------|
| TM-C01 | CountdownTimer renders with correct format | Displays `HH:MM:SS` |
| TM-C02 | CountdownTimer decrements every second | Time decreases by 1s visually |
| TM-C03 | AlarmForm validates empty label | Shows validation error |
| TM-C04 | AlarmForm submits valid data | Calls `invoke('create_alarm')` with correct payload |
| TM-C05 | Timer list renders multiple timers | All timers displayed with correct status |
| TM-C06 | Pause button toggles to Resume | Button text and icon changes |

---

### 2. Auction Alert

#### Unit Tests — Rust

| ID | Test Case | Input | Expected |
|----|-----------|-------|----------|
| AU-U01 | Create auction with valid data | title, end_time (future), link | Auction created, status `active` |
| AU-U02 | Create auction with past end_time | end_time in past | Error: end time must be in future |
| AU-U03 | Create auction without title | empty title | Error: title required |
| AU-U04 | Create auction auto-generates reminders | 24h auction | 5 reminders created (60m, 30m, 15m, 5m, 1m) |
| AU-U05 | Reminder times calculated correctly | end_time = `2026-03-20T12:00:00Z` | remind_at: `11:00`, `11:30`, `11:45`, `11:55`, `11:59` |
| AU-U06 | Skip reminder if less than interval remaining | Auction ends in 10min | Only 5m and 1m reminders created (skip 60m, 30m, 15m) |
| AU-U07 | Update auction bid amount | new bid: 5000 | current_bid updated, updated_at refreshed |
| AU-U08 | Update auction status to `won` | status: `won` | Status changed, linked to inventory (optional) |
| AU-U09 | Update auction status to `lost` | status: `lost` | Status changed |
| AU-U10 | Delete auction cascades reminders | Delete auction | Auction + all auction_reminders deleted |
| AU-U11 | Get active auctions only | Mix of active/expired | Returns only `active` status |
| AU-U12 | Auction auto-expires when past end_time | Scheduler check | Status → `expired` |
| AU-U13 | Custom reminder intervals | `[120, 60, 10]` min | 3 reminders at custom intervals |
| AU-U14 | Validate source_link format | Discord/Facebook URL | Accepted; random text also accepted (no strict validation) |
| AU-U15 | Filter auctions by category | category: `Dino` | Returns only Dino auctions |

#### Link Parser Tests — Rust

| ID | Test Case | Input | Expected |
|----|-----------|-------|----------|
| AU-P01 | Discord Snowflake → timestamp | message_id `1234567890123456789` | Correct UTC timestamp extracted from Snowflake bits |
| AU-P02 | Discord link parsed correctly | `https://discord.com/channels/111/222/333` | guild_id=111, channel_id=222, message_id=333, timestamp extracted |
| AU-P03 | Facebook post URL parsed | `https://facebook.com/photo/?fbid=...&set=gm....` | post_id extracted |
| AU-P04 | Facebook group post URL parsed | `https://facebook.com/groups/.../posts/...` | post_id extracted |
| AU-P05 | Facebook OG timestamp extracted | Valid FB URL with og:updated_time | DateTime parsed correctly |
| AU-P06 | Facebook scraping fails gracefully | FB blocks request / invalid HTML | Returns `None` for timestamp, no crash |
| AU-P07 | Invalid URL format | `not-a-url` | Error: invalid URL |
| AU-P08 | Unknown platform URL | `https://example.com/post/123` | source_type = `other`, no timestamp extracted |

#### Text Parser Tests — Rust

| ID | Test Case | Input | Expected |
|----|-----------|-------|----------|
| AU-T01 | Parse 24h duration | "24-hour auction" | duration_hours = 24 |
| AU-T02 | Parse 48h duration | "48h auction" | duration_hours = 48 |
| AU-T03 | Parse 12 jam duration | "12 Jam auction" | duration_hours = 12 |
| AU-T04 | Parse starting bid + currency | "Bidding starts at 500 Tek Ceilings" | bid_amount=500, currency="Tek Ceilings" |
| AU-T05 | Parse bid with comma | "Bidding starts at 1,500 Ingots" | bid_amount=1500, currency="Ingots" |
| AU-T06 | Parse min increment | "Minimum increments: 50 Tek Ceilings" | min_increment=50 |
| AU-T07 | Parse start time with timezone | "Starts 8:35 PM German time 17/03/2026" | Parsed to UTC (CET offset applied) |
| AU-T08 | Parse end time | "Ends 8:35 PM German time 18/03/2026" | Parsed to UTC |
| AU-T09 | Parse pickup server | "Winner pick on my Astraeos or Ragnarok server" | pickup_server = "Astraeos or Ragnarok" |
| AU-T10 | No duration found in text | "Selling my Rex!" | duration_hours = None |
| AU-T11 | No times in text | "Auction for Giga, bid 1000 ingots" | start_time = None, end_time = None |
| AU-T12 | Full post parse (example) | Full Facebook example post | All fields extracted correctly |
| AU-T13 | Timezone alias mapping | "German time" → CET, "EST" → UTC-5, "WIB" → UTC+7 | Correct UTC offset applied |
| AU-T14 | Validation: link time matches text time | link=8:30PM, text=8:35PM (diff ≤ 10min) | Use link timestamp, no warning |
| AU-T15 | Validation: link time conflicts text time | link=7:00PM, text=8:35PM (diff > 10min) | Return both with conflict flag |

#### Scheduler / Reminder Tests — Rust

| ID | Test Case | Expected |
|----|-----------|----------|
| AU-S01 | Scheduler picks up due reminders | Reminder with `remind_at <= now()` and `is_sent = false` → triggers notification |
| AU-S02 | Reminder marked as sent after trigger | `is_sent = true`, `sent_at` populated |
| AU-S03 | Already-sent reminders not re-triggered | `is_sent = true` reminders skipped |
| AU-S04 | Multiple auctions due simultaneously | All due reminders fire, not just first one |
| AU-S05 | Scheduler handles empty auction list | No crash, no notification, graceful no-op |
| AU-S06 | Cancelled auction reminders not triggered | Auction status `cancelled` → skip reminders |

#### Component Tests — React

| ID | Test Case | Expected |
|----|-----------|----------|
| AU-C01 | AuctionForm renders all required fields | Title, link, duration, start_time visible |
| AU-C02 | AuctionForm validation on submit | Empty required fields → error messages |
| AU-C03 | AuctionCard shows countdown | Live countdown displayed `Xh Xm Xs` |
| AU-C04 | AuctionCard color-coded by urgency | >1h green, <1h yellow, <15m red |
| AU-C05 | Timeline view renders multiple auctions | All active auctions on timeline |
| AU-C06 | Timeline reminder markers visible | Dots/markers at reminder intervals |
| AU-C07 | Quick-action link opens source URL | Click Discord/FB link → opens external browser |
| AU-C08 | Filter by category works | Select "Dino" → shows only Dino auctions |
| AU-C09 | Filter by status works | Select "Won" → shows only won auctions |
| AU-C10 | Auction detail page loads | Navigate to `/auctions/[id]` → shows full details |

---

### 3. Inventory Calculator

#### Unit Tests — Rust

| ID | Test Case | Input | Expected |
|----|-----------|-------|----------|
| IN-U01 | Create category | name: `Dino` | Category created with UUID |
| IN-U02 | Create duplicate category name | name: `Dino` (exists) | Error: category name must be unique |
| IN-U03 | Add custom field to category | field: `species`, type: `text` | Field added to category |
| IN-U04 | Add dropdown field with options | type: `dropdown`, options: `["Rex","Giga"]` | Field created with JSON options |
| IN-U05 | Create inventory item | name, category_id, field_data JSON | Item created, quantity default 1 |
| IN-U06 | Create item linked to auction | auction_id provided | Item linked, auction_id set |
| IN-U07 | Create item with invalid category | non-existent category_id | Error: category not found |
| IN-U08 | Update item quantity | quantity: 5 | Quantity updated |
| IN-U09 | Update item status to `sold` | status: `sold` | Status changed |
| IN-U10 | Delete category cascades fields | Delete category | Category + category_fields deleted |
| IN-U11 | Count items per category | Multiple items | Correct count returned |
| IN-U12 | Search items by name | query: `Rex` | Returns items matching name |
| IN-U13 | Filter items by status | status: `owned` | Returns only owned items |
| IN-U14 | Validate field_data matches category schema | field_data missing required field | Error: required field missing |

#### Component Tests — React

| ID | Test Case | Expected |
|----|-----------|----------|
| IN-C01 | Category management page renders | List of categories displayed |
| IN-C02 | Add category form validation | Empty name → error |
| IN-C03 | Custom field builder renders field types | Dropdown shows text/number/dropdown/date/boolean |
| IN-C04 | Inventory list renders items | Items displayed with category badge |
| IN-C05 | Dynamic form renders based on category fields | Correct input types per field_type |
| IN-C06 | Item count badge per category | Shows `(12)` next to category name |

---

### 4. Expense Tracking

#### Unit Tests — Rust

| ID | Test Case | Input | Expected |
|----|-----------|-------|----------|
| EX-U01 | Create buy transaction | type: `buy`, ig_amount: 5000, ig_currency: `ingots` | Transaction created |
| EX-U02 | Create sell transaction | type: `sell`, real_amount: 150000, real_currency: `IDR` | Transaction created |
| EX-U03 | Create bid transaction linked to auction | type: `bid`, auction_id | Transaction linked to auction |
| EX-U04 | Create trade transaction | type: `trade`, ig_amount (both sides) | Transaction created |
| EX-U05 | Transaction without amount | ig_amount: null, real_amount: null | Error: at least one amount required |
| EX-U06 | Transaction with invalid type | type: `invalid` | Error: invalid transaction type |
| EX-U07 | Calculate total expenses | Multiple buy/bid transactions | Correct sum per currency |
| EX-U08 | Calculate total income | Multiple sell transactions | Correct sum per currency |
| EX-U09 | Calculate profit/loss | Mixed transactions | income - expense = correct P/L |
| EX-U10 | Monthly summary | Transactions across months | Grouped correctly by month |
| EX-U11 | Expense breakdown by category | Transactions across categories | Correct sum per category |
| EX-U12 | Currency conversion calculation | ig_amount + conversion_rate | Correct real_money equivalent |
| EX-U13 | Filter transactions by date range | start_date, end_date | Returns only within range |
| EX-U14 | Filter transactions by type | type: `buy` | Returns only buy transactions |
| EX-U15 | Top items by spending | Multiple transactions | Sorted desc by total amount |

#### Component Tests — React

| ID | Test Case | Expected |
|----|-----------|----------|
| EX-C01 | Transaction form renders all fields | Type, amount, currency, counterparty, date visible |
| EX-C02 | Dual currency toggle | Switch between in-game and real money inputs |
| EX-C03 | Expense summary card shows P/L | Profit green, loss red |
| EX-C04 | Monthly chart renders | Bar/line chart with monthly data |
| EX-C05 | Transaction list filters work | Type filter, date range filter functional |
| EX-C06 | Transaction links to auction | Click auction link → navigates to auction detail |

---

### 5. Database Layer (Integration Tests)

| ID | Test Case | Expected |
|----|-----------|----------|
| DB-I01 | Initialize database creates all tables | All 8 tables exist |
| DB-I02 | Run migrations on fresh DB | Schema up-to-date, no errors |
| DB-I03 | Foreign key cascade delete | Delete auction → reminders deleted |
| DB-I04 | Foreign key constraint violation | Insert item with invalid category_id → error |
| DB-I05 | Concurrent reads | Multiple SELECT simultaneously → no locks |
| DB-I06 | Transaction rollback on error | Partial insert fails → all changes rolled back |
| DB-I07 | JSON field storage & retrieval | Store `field_data` JSON → retrieve identical |
| DB-I08 | Index performance on auctions | Query by status + end_time uses index |
| DB-I09 | UUID generation uniqueness | Create 1000 records → all UUIDs unique |
| DB-I10 | Settings CRUD | Insert, read, update, delete settings key |

---

### 6. System Integration

| ID | Test Case | Expected |
|----|-----------|----------|
| SY-I01 | App starts and shows dashboard | Main window renders, no crash |
| SY-I02 | System tray icon appears | Tray icon visible after minimize |
| SY-I03 | Tray context menu works | Open, Pause Alerts, Quit functional |
| SY-I04 | Notification fires for due reminder (≥15min) | Normal toast notification appears, auto-dismiss after ~7s |
| SY-I04b | Notification fires for urgent reminder (≤5min) | Force-active toast (`scenario="urgent"`), persistent, stays on top |
| SY-I04c | LAST CALL notification (1min) | Alarm toast (`scenario="alarm"`), looping sound, persistent |
| SY-I04d | Notification has action buttons | "Open Auction", "Snooze 5min", "Dismiss" buttons visible & functional |
| SY-I04e | User setting `notification_mode=normal` overrides force-active | All reminders use default toast |
| SY-I05 | Click notification opens app | App window focused, navigates to auction detail |
| SY-I06 | App survives minimize + restore | State preserved after tray minimize/restore |
| SY-I07 | App handles no internet gracefully | Offline mode works, no crash (Phase 1: always offline) |
| SY-I08 | Multiple instances prevented | Second instance → focus existing window |

---

### 7. Sync Engine (Phase 3)

| ID | Test Case | Expected |
|----|-----------|----------|
| SN-I01 | Initial sync uploads local data | All SQLite data → Supabase |
| SN-I02 | New record syncs to cloud | Create auction locally → appears in Supabase |
| SN-I03 | Cloud change syncs to local | Update in Supabase → reflected in SQLite |
| SN-I04 | Offline queue processes on reconnect | Queued changes sent when online |
| SN-I05 | Conflict resolution last-write-wins | Both devices edit same record → latest `updated_at` wins |
| SN-I06 | Delete syncs correctly | Delete locally → deleted in Supabase |
| SN-I07 | Sync handles large dataset | 1000+ records sync without timeout |
| SN-I08 | Auth token refresh | Expired token → auto-refresh → sync continues |

---

### 8. Flutter Mobile (Phase 4)

#### Unit Tests — Dart

| ID | Test Case | Expected |
|----|-----------|----------|
| FL-U01 | AuctionModel from JSON | Correct parsing from Supabase response |
| FL-U02 | AuctionModel to JSON | Correct serialization for Supabase insert |
| FL-U03 | Reminder calculation logic | Same intervals as desktop (60, 30, 15, 5, 1 min) |
| FL-U04 | Expense P/L calculation | Matches desktop logic output |
| FL-U05 | Currency conversion | Same formula as desktop |
| FL-U06 | Offline queue enqueue | Action queued when offline |
| FL-U07 | Offline queue dequeue on sync | Queued items sent and removed |

#### Widget Tests — Flutter

| ID | Test Case | Expected |
|----|-----------|----------|
| FL-W01 | AuctionListScreen renders list | Shows auction cards from mock data |
| FL-W02 | AuctionCard countdown ticks | Timer decrements every second |
| FL-W03 | AuctionForm validates required fields | Empty title → validation error shown |
| FL-W04 | ExpenseSummary shows correct totals | P/L calculated and displayed |
| FL-W05 | Timeline view renders | Auctions positioned correctly on timeline |
| FL-W06 | Pull-to-refresh triggers sync | Refresh indicator → data reloaded |
| FL-W07 | Empty state displayed | No auctions → "No active auctions" message |
| FL-W08 | Navigation between tabs | Bottom nav switches screens correctly |

#### Notification Tests — Flutter

| ID | Test Case | Expected |
|----|-----------|----------|
| FL-N01 | FCM data message received in foreground | Custom notification displayed via flutter_local_notifications |
| FL-N02 | FCM data message received in background | `onBackgroundMessage` handler fires, notification shown |
| FL-N03 | High-priority reminder (≤5min) shows heads-up | `Importance.max` + `fullScreenIntent: true` → popup notification |
| FL-N04 | Default-priority reminder (≥15min) normal notification | `Importance.defaultImportance` → standard notification |
| FL-N05 | Notification action "Open" navigates to auction | Deep link `auction:{id}` → auction detail screen |
| FL-N06 | Notification action "Snooze 5min" reschedules | Local notification scheduled +5min |
| FL-N07 | Notification action "Mark as Lost" updates status | Auction status → `lost` via Supabase |
| FL-N08 | FCM token registered on login | Token saved to `user_devices` table in Supabase |
| FL-N09 | FCM token refresh updates Supabase | Old token replaced with new token |
| FL-N10 | iOS critical alert for urgent reminders | `interruptionLevel: critical` set for ≤5min reminders |

---

## CI/CD Integration

### Pre-commit Checks

```bash
# Rust
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# Next.js
npx vitest run
npx tsc --noEmit

# Flutter
cd auction-personal-mobile && flutter test && flutter analyze
```

### Coverage Enforcement

```yaml
# GitHub Actions (example)
- name: Rust Coverage
  run: |
    cargo tarpaulin --manifest-path src-tauri/Cargo.toml --fail-under 80

- name: Frontend Coverage
  run: |
    npx vitest run --coverage --coverage.thresholds.lines=80

- name: Flutter Coverage
  run: |
    flutter test --coverage
    # Parse lcov and fail if under 80%
```

### Coverage Report Location

| Platform | Report Path | Format |
|----------|------------|--------|
| Rust | `coverage/rust/tarpaulin-report.html` | HTML |
| Next.js | `coverage/lcov-report/index.html` | HTML (istanbul/v8) |
| Flutter | `coverage/html/index.html` | HTML (lcov → genhtml) |

---

## QA Checklist (per Feature Release)

Sebelum feature dianggap "done", QA agent harus verify:

- [ ] All unit tests pass (`cargo test` + `vitest run` + `flutter test`)
- [ ] Coverage >= 80% per module
- [ ] No `clippy` warnings (Rust)
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No `flutter analyze` issues
- [ ] Integration tests pass (DB layer)
- [ ] Manual smoke test: create → read → update → delete flow
- [ ] Edge cases tested (empty input, past dates, concurrent actions)
- [ ] Notification fires correctly (manual verify on Windows)
- [ ] No memory leaks on long-running timer (manual verify)
