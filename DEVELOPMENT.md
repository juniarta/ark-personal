# Development Guide — Ark Personal Tools

## Table of Contents
- [Prerequisites](#prerequisites)
- [Running Locally (Dev Mode)](#running-locally-dev-mode)
- [Building Locally](#building-locally)
- [Push to GitHub](#push-to-github)
- [Tagging a Version](#tagging-a-version)
- [Creating a GitHub Release](#creating-a-github-release)
- [Update Check Flow](#update-check-flow)

---

## Prerequisites

Make sure these are installed before starting:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | `node -v` to check |
| npm | 9+ | comes with Node.js |
| Rust | stable | install via [rustup.rs](https://rustup.rs) |
| Cargo | stable | comes with Rust |
| Git | any | `git -v` to check |

Install JS dependencies once after cloning:
```bash
npm install
```

---

## Running Locally (Dev Mode)

Starts the app in development mode with hot-reload:

```bash
npx tauri dev
```

This will:
1. Start the Next.js dev server at `http://localhost:3000`
2. Launch the Tauri window pointing to that dev server
3. Any changes to `src/` will hot-reload the frontend
4. Rust changes require restarting the command

---

## Building Locally

Compiles a production-ready installer for Windows:

```bash
npx tauri build
```

If the build fails with a `.tsbuildinfo` path error, clear the Next.js cache first:
```bash
rm -rf .next
npx tauri build
```

Output files after a successful build:
```
src-tauri/target/release/bundle/
  nsis/   → Ark Personal Tools_x.x.x_x64-setup.exe   (NSIS installer)
  msi/    → Ark Personal Tools_x.x.x_x64_en-US.msi   (MSI installer)
```

---

## Push to GitHub

### First-time push (if remote not set)
```bash
git remote add origin git@github.com:juniarta/ark-personal.git
git push -u origin main
```

### Regular workflow

```bash
# 1. Check what changed
git status

# 2. Stage specific files (avoid git add . to prevent accidental secrets)
git add src/ src-tauri/src/ package.json

# 3. Commit with a clear message
git commit -m "feat: add settings page with update check and about"

# 4. Push to GitHub
git push
```

### Common commit prefixes
| Prefix | When to use |
|--------|------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructure, no behavior change |
| `docs:` | Documentation only |
| `chore:` | Build scripts, dependencies |

---

## Tagging a Version

Before creating a GitHub Release, update the version number and create a Git tag.

### 1. Update the version number

Edit **two files** so they stay in sync:

**`src-tauri/Cargo.toml`** — line 3:
```toml
version = "0.2.0"
```

**`src-tauri/tauri.conf.json`** — line 3:
```json
"version": "0.2.0",
```

### 2. Commit the version bump

```bash
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to 0.2.0"
```

### 3. Create an annotated Git tag

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
```

### 4. Push the tag to GitHub

```bash
git push origin v0.2.0
```

Or push commits and tags together:
```bash
git push && git push origin v0.2.0
```

---

## Creating a GitHub Release

After tagging, create a release on GitHub and attach the built installers.

### Step 1 — Build the installers

```bash
npx tauri build
```

Installer files will be in:
```
src-tauri/target/release/bundle/nsis/
src-tauri/target/release/bundle/msi/
```

### Step 2 — Create the release on GitHub

**Option A: GitHub website**
1. Go to `https://github.com/juniarta/ark-personal/releases`
2. Click **Draft a new release**
3. Choose the tag you just pushed (e.g. `v0.2.0`)
4. Set the release title: `v0.2.0`
5. Write release notes (what changed, bug fixes, etc.)
6. Drag and drop the `.exe` and `.msi` files from the bundle folder
7. Click **Publish release**

**Option B: GitHub CLI** (if `gh` is installed)
```bash
gh release create v0.2.0 \
  "src-tauri/target/release/bundle/nsis/Ark Personal Tools_0.2.0_x64-setup.exe" \
  "src-tauri/target/release/bundle/msi/Ark Personal Tools_0.2.0_x64_en-US.msi" \
  --title "v0.2.0" \
  --notes "What changed in this release..."
```

---

## Update Check Flow

The in-app **Settings → Check for Updates** button calls the GitHub Releases API:

```
GET https://api.github.com/repos/juniarta/ark-personal/releases/latest
```

It compares the `tag_name` from GitHub against the current app version (`CARGO_PKG_VERSION`).

| Scenario | Result |
|----------|--------|
| Latest tag matches app version | "You are up to date" |
| Latest tag is newer | "Update available" + link to release page |
| No internet / no releases yet | Error toast |

**Important:** The GitHub repo must be **public** for the API to return releases without authentication.
