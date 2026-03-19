# Agent Teams Build Strategy

## Overview

Panduan untuk membangun Ark Auction Personal menggunakan **Claude Code Agent Teams** — multiple Claude Code instances yang bekerja paralel, masing-masing punya context window sendiri, bisa komunikasi satu sama lain, dan dikoordinasi oleh satu team lead.

**Prerequisite:**
- Claude Code v2.1.32+
- Enable experimental feature:
```json
// settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## Team Structure

### Why Agent Teams (bukan Subagents)?

| Aspect | Subagents | Agent Teams (dipilih) |
|--------|-----------|----------------------|
| Communication | Hanya report balik ke parent | Bisa chat antar teammate |
| Context | Shared dengan parent | Independent context window per agent |
| Coordination | Parent manage semua | Shared task list, self-claim |
| Use case | Quick focused tasks | Complex parallel work yang perlu koordinasi |

Proyek ini butuh **agent teams** karena:
- Frontend, Backend, dan Parser bisa dikerjakan paralel
- Tapi tetap perlu koordinasi (misal: Backend expose API → Frontend consume)
- Agent bisa challenge satu sama lain (review code, validate contracts)
- Task dependencies bisa di-manage via shared task list

---

## Phase 1 — MVP Build Team

### Team Composition (4 Teammates + 1 Lead)

```
┌─────────────────────────────────────────────────────┐
│                    TEAM LEAD                         │
│              (Orchestrator Agent)                    │
│                                                     │
│  Responsibilities:                                  │
│  • Create & assign tasks                            │
│  • Review task completion                           │
│  • Resolve conflicts between teammates              │
│  • Synthesize final integration                     │
│  • Enforce quality gates                            │
└─────────┬───────┬───────┬───────┬───────────────────┘
          │       │       │       │
    ┌─────▼──┐ ┌──▼────┐ ┌▼─────┐ ┌▼──────────┐
    │ RUST   │ │FRONT  │ │PARSER│ │ QA        │
    │ BACKEND│ │ END   │ │ENGINE│ │ TESTER    │
    │        │ │       │ │      │ │           │
    │Tauri   │ │Next.js│ │Link &│ │Unit &     │
    │SQLite  │ │shadcn │ │Text  │ │Integration│
    │Commands│ │UI     │ │Parse │ │Tests      │
    │Scheduler│ │Store │ │      │ │           │
    └────────┘ └───────┘ └──────┘ └───────────┘
```

### Teammate Definitions

#### 1. Rust Backend Agent
- **Name:** `rust-backend`
- **Focus:** Tauri commands, SQLite, scheduler, notifications
- **Owns files:** `src-tauri/`
- **Model:** Opus (complex Rust logic)

#### 2. Frontend Agent
- **Name:** `frontend`
- **Focus:** Next.js pages, components, state management, Tauri IPC calls
- **Owns files:** `src/`
- **Model:** Sonnet (UI components, faster iteration)

#### 3. Parser Engine Agent
- **Name:** `parser-engine`
- **Focus:** Facebook scraping, Discord Snowflake, text regex parsing, timezone handling
- **Owns files:** `src-tauri/src/parser/`
- **Model:** Opus (complex regex, edge cases)

#### 4. QA Tester Agent
- **Name:** `qa-tester`
- **Focus:** Write & run tests, coverage enforcement
- **Owns files:** `src-tauri/tests/`, `src/**/__tests__/`
- **Model:** Sonnet (test writing, faster iteration)

---

## Launch Commands

### Start the Team

```text
Create an agent team for building Ark Auction Personal Phase 1 MVP.

The project is a Tauri v2 + Next.js desktop app for tracking game auctions
with timers, alerts, and notifications. All docs are in ./Docs/ (PRD.md,
ARCHITECTURE.md, DATABASE.md, TESTING.md).

Spawn 4 teammates:

1. "rust-backend" (use Opus) — owns src-tauri/. Builds Tauri commands, SQLite
   database layer, background scheduler, and Windows Toast notifications.
   Read Docs/ARCHITECTURE.md and Docs/DATABASE.md for full specs.

2. "frontend" (use Sonnet) — owns src/. Builds Next.js pages, React components
   with shadcn/ui + Tailwind, Zustand state, and Tauri IPC integration.
   Must use output: 'export' (SSG mode). Read Docs/PRD.md for feature specs.

3. "parser-engine" (use Opus) — owns src-tauri/src/parser/. Builds Facebook
   post timestamp extraction (OG scraping), Discord Snowflake ID to timestamp,
   and auction text regex parser. Read Docs/ARCHITECTURE.md "Link & Text Parser"
   section for full specs.

4. "qa-tester" (use Sonnet) — owns test files. Writes unit tests (cargo test +
   vitest) and integration tests. Read Docs/TESTING.md for all test case IDs.
   Require plan approval before writing tests — plan must list which test IDs
   they'll implement first.

Key rules:
- Each teammate owns specific directories — no cross-file edits
- rust-backend and parser-engine must agree on Rust module interfaces before coding
- frontend must wait for rust-backend to define Tauri command signatures before
  building IPC calls
- qa-tester starts after at least one module has compilable code
- All teammates must read CLAUDE.md and Docs/ before starting
```

---

## Task Breakdown & Dependencies

### Task List (Shared across team)

```
Phase 1 Tasks — Ordered by dependency

GROUP A: Foundation (no dependencies — start immediately)
──────────────────────────────────────────────────────
T01  [rust-backend]  Project scaffolding — init Tauri v2 + Next.js project
T02  [rust-backend]  SQLite setup — create DB, run migrations (all tables from DATABASE.md)
T03  [rust-backend]  Define Tauri command signatures (auction, timer, alarm CRUD)
T04  [parser-engine] Facebook URL parser — extract post ID from various URL formats
T05  [parser-engine] Discord Snowflake → timestamp converter

GROUP B: Core Backend (depends on: T02, T03)
──────────────────────────────────────────────────────
T06  [rust-backend]  Auction CRUD commands (create, read, update, delete, filter)
T07  [rust-backend]  Timer & Alarm CRUD commands
T08  [rust-backend]  Auto-generate auction reminders on create
T09  [parser-engine] Facebook OG timestamp scraping (reqwest + scraper)
T10  [parser-engine] Auction text regex parser (duration, bid, currency, times, server)
T11  [parser-engine] Timezone alias mapping + UTC conversion

GROUP C: Frontend (depends on: T01, T03)
──────────────────────────────────────────────────────
T12  [frontend]      App layout + routing (Next.js App Router)
T13  [frontend]      Auction list page + countdown component
T14  [frontend]      Auction create form (with link paste + text paste flow)
T15  [frontend]      Timer & Alarm page
T16  [frontend]      Zustand store setup (auctions, timers, settings)

GROUP D: Notification & Scheduler (depends on: T06, T08)
──────────────────────────────────────────────────────
T17  [rust-backend]  Background scheduler (tokio — check reminders every 30s)
T18  [rust-backend]  Windows Toast notification (urgent/alarm scenarios via windows-rs)
T19  [rust-backend]  System tray setup (minimize, context menu, quit)

GROUP E: Integration (depends on: T09, T10, T11, T14)
──────────────────────────────────────────────────────
T20  [parser-engine] Wire parsers into Tauri commands (parse_source_link, parse_auction_text)
T21  [frontend]      Connect auction form to parser commands (auto-fill flow)
T22  [frontend]      Connect all pages to Rust backend via invoke()
T23  [frontend]      Validation UI (link time vs text time conflict warning)

GROUP F: Testing (depends on: T06+ having compilable code)
──────────────────────────────────────────────────────
T24  [qa-tester]     Unit tests: Timer (TM-U01~U12)
T25  [qa-tester]     Unit tests: Auction (AU-U01~U15)
T26  [qa-tester]     Unit tests: Link parser (AU-P01~P08)
T27  [qa-tester]     Unit tests: Text parser (AU-T01~T15)
T28  [qa-tester]     Integration tests: DB layer (DB-I01~I10)
T29  [qa-tester]     Component tests: React (TM-C01~C06, AU-C01~C10)
T30  [qa-tester]     System integration smoke tests (SY-I01~I08)
```

### Dependency Graph

```
T01 ──┬──→ T03 ──┬──→ T06 ──→ T08 ──→ T17 ──→ T18
      │          │                              │
      │          ├──→ T07                       ├──→ T19
      │          │                              │
      │          └──→ T12 ──→ T13              T30
      │                    ──→ T14 ──→ T21 ──→ T22 ──→ T23
      │                    ──→ T15
      │                    ──→ T16
      │
T02 ──┘

T04 ──→ T09 ──→ T20 ──→ T21
T05 ──→ T20
T10 ──→ T20
T11 ──→ T10

T06 (compilable) ──→ T24, T25, T28
T09 (compilable) ──→ T26
T10 (compilable) ──→ T27
T13 (compilable) ──→ T29
```

---

## Inter-Agent Communication Protocol

### Critical Handoff Points

Agents MUST communicate at these points:

#### 1. Command Signatures (rust-backend → frontend)
**When:** After T03 completes
**What:** rust-backend broadcasts Tauri command signatures to all teammates

```text
[rust-backend → broadcast]
Tauri command signatures defined. Frontend can now build IPC calls:

- get_active_auctions() -> Vec<Auction>
- get_auction(id: String) -> Auction
- create_auction(payload: CreateAuctionPayload) -> Auction
- update_auction(id: String, payload: UpdateAuctionPayload) -> Auction
- delete_auction(id: String) -> ()
- get_alarms() -> Vec<Alarm>
- create_alarm(payload: CreateAlarmPayload) -> Alarm
- update_alarm(id: String, payload: UpdateAlarmPayload) -> Alarm
- delete_alarm(id: String) -> ()
- parse_source_link(url: String) -> PostMetadata
- parse_auction_text(text: String) -> ParsedAuctionText

TypeScript types are in src/lib/types.ts
Rust structs are in src-tauri/src/db/models.rs
```

#### 2. Parser Module Interface (parser-engine → rust-backend)
**When:** Before T20
**What:** parser-engine and rust-backend agree on module interface

```text
[parser-engine → rust-backend]
Parser module ready. Public API:

pub mod parser {
    pub fn parse_facebook_url(url: &str) -> Result<FacebookPostMeta, ParseError>;
    pub fn parse_discord_url(url: &str) -> Result<DiscordPostMeta, ParseError>;
    pub fn parse_auction_text(text: &str) -> Result<ParsedAuctionText, ParseError>;
    pub fn detect_platform(url: &str) -> SourcePlatform;
}

Structs defined in src-tauri/src/parser/mod.rs
Ready for you to wire into Tauri commands.
```

#### 3. Test Readiness (any agent → qa-tester)
**When:** After any module has compilable code
**What:** Agent notifies QA that module is ready for testing

```text
[rust-backend → qa-tester]
Auction CRUD commands are compilable and passing basic manual tests.
You can start writing AU-U01~U15 and DB-I01~I10.
Models are in src-tauri/src/db/models.rs
Commands are in src-tauri/src/commands/auction.rs
```

#### 4. Integration Readiness (rust-backend + frontend → lead)
**When:** After T22 completes
**What:** Frontend connected to all backend commands, ready for smoke test

```text
[frontend → lead]
All pages connected to Rust backend via invoke().
Ready for system integration smoke test (SY-I01~I08).
Please ask qa-tester to run T30.
```

---

## Quality Gates (Hooks)

### TeammateIdle Hook

Ketika teammate selesai task dan idle, enforce bahwa mereka harus:
1. Verify code compiles (`cargo check` / `npm run build`)
2. Run their own basic tests
3. Send completion message ke lead + dependent teammates

### TaskCompleted Hook

Sebelum task di-mark complete:
1. **For rust-backend tasks:** `cargo check --manifest-path src-tauri/Cargo.toml` harus pass
2. **For frontend tasks:** `npx tsc --noEmit` harus pass
3. **For qa-tester tasks:** coverage >= 80% per module
4. **For parser-engine tasks:** all parser unit tests pass

```json
// settings.json — hook examples
{
  "hooks": {
    "TaskCompleted": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Verify: does the code compile? Are tests passing?'"
          }
        ]
      }
    ]
  }
}
```

---

## Phase 2 — Enhanced Features Team

Setelah Phase 1 selesai, clean up team lama dan buat team baru:

```text
Clean up the team.

Now create a new agent team for Phase 2 — Enhanced Features.

Spawn 4 teammates:

1. "timeline-ui" (Sonnet) — builds Timeline/Calendar view for auctions
   Owns: src/app/auctions/timeline/, src/components/auction/timeline/

2. "inventory-backend" (Opus) — builds Inventory Calculator backend
   Owns: src-tauri/src/commands/inventory.rs, related DB queries

3. "expense-tracker" (Opus) — builds Expense Tracking (dual currency, reports)
   Owns: src-tauri/src/commands/expense.rs, src/app/expenses/

4. "qa-phase2" (Sonnet) — tests for Phase 2 features
   Owns: test files for inventory + expense modules

Require plan approval for all teammates before implementation.
```

### Phase 2 Task List

```
GROUP A: Foundation
──────────────────────────────────────────────────────
T31  [inventory-backend]  Category CRUD + custom fields
T32  [inventory-backend]  Inventory item CRUD (with dynamic field_data)
T33  [expense-tracker]    Transaction CRUD (buy/sell/bid/trade)
T34  [expense-tracker]    Dual currency support (in-game + real money)

GROUP B: UI
──────────────────────────────────────────────────────
T35  [timeline-ui]        Timeline/calendar view component
T36  [timeline-ui]        Reminder markers on timeline
T37  [timeline-ui]        Color-coded urgency (green→yellow→red)
T38  [timeline-ui]        Filter controls (category, status)

GROUP C: Reports
──────────────────────────────────────────────────────
T39  [expense-tracker]    P/L calculation logic
T40  [expense-tracker]    Monthly summary + breakdown by category
T41  [expense-tracker]    Reports dashboard UI
T42  [timeline-ui]        Inventory list UI + category management

GROUP D: Testing
──────────────────────────────────────────────────────
T43  [qa-phase2]          Unit tests: Inventory (IN-U01~U14)
T44  [qa-phase2]          Unit tests: Expense (EX-U01~U15)
T45  [qa-phase2]          Component tests: Inventory (IN-C01~C06)
T46  [qa-phase2]          Component tests: Expense (EX-C01~C06)
```

---

## Phase 3 — Cloud Sync Team

```text
Create an agent team for Phase 3 — Cloud Sync.

Spawn 3 teammates:

1. "supabase-setup" (Opus) — Supabase project config, PostgreSQL migration,
   auth setup, RLS policies. Read Docs/DATABASE.md "Supabase Migration Notes".

2. "sync-engine" (Opus) — Offline-first sync engine: SQLite ↔ Supabase.
   Queue management, conflict resolution (last-write-wins), realtime subscriptions.

3. "qa-sync" (Sonnet) — Sync engine tests (SN-I01~I08).
   Require plan approval. Must achieve 85% coverage.
```

---

## Phase 4 — Mobile (Flutter) Team

```text
Create an agent team for Phase 4 — Flutter Mobile App.

This is a NEW Flutter project (auction-personal-mobile/).
Read Docs/ARCHITECTURE.md "Flutter Project Structure" section.

Spawn 4 teammates:

1. "flutter-core" (Opus) — Flutter project setup, Supabase SDK integration,
   app routing, theme. Owns: lib/app/, lib/core/

2. "flutter-features" (Sonnet) — Feature screens: auction, timer, inventory,
   expenses. Must match desktop feature parity. Owns: lib/features/

3. "flutter-notifications" (Opus) — FCM integration, custom notification handler,
   flutter_local_notifications, background message handling, FCM token management.
   Read Docs/ARCHITECTURE.md "Mobile — FCM + Custom Notification" section.
   Owns: lib/core/notifications/

4. "flutter-qa" (Sonnet) — Dart unit tests (FL-U01~U07), widget tests (FL-W01~W08),
   notification tests (FL-N01~N10). Require plan approval.
```

---

## Display Mode

### Windows: In-Process Mode (Default)

Split-pane (tmux) **tidak support di Windows Terminal, VS Code terminal, atau Ghostty**.
Untuk Windows, gunakan **in-process mode** — semua teammates jalan di satu terminal window.

```json
// settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "in-process"
}
```

Atau via flag:
```bash
claude --teammate-mode in-process
```

**Navigation Shortcuts (In-Process Mode):**

| Shortcut | Action |
|----------|--------|
| `Shift+Down` | Cycle antar teammates (lead → rust-backend → frontend → parser-engine → qa-tester → kembali ke lead) |
| `Enter` | Buka full session dari teammate yang dipilih |
| `Escape` | Interrupt teammate yang sedang running |
| `Ctrl+T` | Toggle shared task list (lihat semua tasks + status) |
| Type + `Enter` | Kirim message ke teammate yang sedang dipilih |

**Workflow di Windows:**
```
Terminal Window (satu window, switch antar agents)
┌─────────────────────────────────────────────┐
│  [Lead] ← active                            │
│                                             │
│  Teammates: (Shift+Down to switch)          │
│  ● rust-backend  — T06 in progress          │
│  ● frontend      — T12 in progress          │
│  ● parser-engine — T04 completed, T09 next  │
│  ○ qa-tester     — waiting for T06          │
│                                             │
│  > Type here to message current agent...    │
└─────────────────────────────────────────────┘
```

**Tips untuk Windows:**
- Buka terminal full-screen agar output tidak terpotong
- Pakai `Ctrl+T` sering untuk monitor task progress
- Kalau teammate stuck, `Shift+Down` ke teammate tersebut lalu kirim message langsung
- Lead otomatis terima messages dari semua teammates — tidak perlu poll manual

### macOS/Linux: Split Panes (Optional)

Jika pakai macOS/Linux dengan tmux installed:

```json
{
  "teammateMode": "tmux"
}
```

Layout di tmux:
```
┌──────────────────┬──────────────────┐
│   Team Lead      │   rust-backend   │
├──────────────────┼──────────────────┤
│   frontend       │   parser-engine  │
├──────────────────┴──────────────────┤
│              qa-tester              │
└─────────────────────────────────────┘
```

---

## Token Budget Estimation

| Phase | Teammates | Est. Tasks | Token Usage |
|-------|-----------|------------|-------------|
| Phase 1 MVP | 4 | 30 | High (Opus x2 + Sonnet x2) |
| Phase 2 Enhanced | 4 | 16 | Medium-High |
| Phase 3 Sync | 3 | ~12 | Medium |
| Phase 4 Mobile | 4 | ~20 | High |

**Tips menghemat token:**
- Pakai Sonnet untuk UI/test agents (faster, cheaper)
- Pakai Opus hanya untuk complex logic (Rust backend, parser, sync engine)
- 5-6 tasks per teammate adalah sweet spot
- Jangan spawn terlalu banyak teammates — 3-5 optimal

---

## Checklist Sebelum Launch

- [ ] Claude Code v2.1.32+ installed (`claude --version`)
- [ ] `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` enabled in settings.json
- [ ] tmux installed (optional, for split pane mode)
- [ ] All Docs/ files up to date (PRD, ARCHITECTURE, DATABASE, TESTING)
- [ ] CLAUDE.md created di project root (project context untuk semua agents)
- [ ] Permission settings configured (allow cargo, npm, git commands)
- [ ] Sufficient API credits for multi-agent token usage


cd E:\codes\ark-script\auction-personal\src-tauri\target\release
  tar -a -cf "Ark-Auction-Personal-v0.1.0-portable.zip" auction-personal.exe