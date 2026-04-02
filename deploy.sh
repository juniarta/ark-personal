#!/usr/bin/env bash
# ============================================================
# deploy.sh — Ark Personal Tools deployment script
# Usage: bash deploy.sh [patch|minor|major]
#        Default bump type: patch
# ============================================================

set -e

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Helpers ──────────────────────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}▶ $1${NC}"; }

# Convert Windows path (C:\foo\bar) to bash path (/c/foo/bar)
win_to_bash_path() {
  local p
  p=$(echo "$1" | tr -d '\r' | tr '\\' '/')
  if [[ "$p" =~ ^([A-Za-z]):/(.*) ]]; then
    echo "/$(echo "${BASH_REMATCH[1]}" | tr '[:upper:]' '[:lower:]')/${BASH_REMATCH[2]}"
  else
    echo "$p"
  fi
}

# ── Args ─────────────────────────────────────────────────────
BUMP_TYPE="${1:-patch}"
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  error "Invalid bump type '$BUMP_TYPE'. Use: patch | minor | major"
fi

# ── Confirm start ────────────────────────────────────────────
echo -e "\n${BOLD}========================================${NC}"
echo -e "${BOLD}  Ark Personal Tools — Deploy Script${NC}"
echo -e "${BOLD}========================================${NC}"
echo -e "  Bump type : ${YELLOW}$BUMP_TYPE${NC}"
echo -e "  Branch    : $(git rev-parse --abbrev-ref HEAD)"
echo ""
read -rp "Continue? [y/N]: " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ════════════════════════════════════════════════════════════
# STEP 1 — Check & install GitHub CLI
# ════════════════════════════════════════════════════════════
step "Checking GitHub CLI (gh)"

# Locate gh: try bash PATH first, then Windows PATH via where.exe
GH=""
if command -v gh &>/dev/null; then
  GH="gh"
else
  _WIN_PATH=$(where.exe gh 2>/dev/null | head -1 | tr -d '\r' || true)
  if [ -n "$_WIN_PATH" ]; then
    GH=$(win_to_bash_path "$_WIN_PATH")
  fi
fi

if [ -z "$GH" ]; then
  warn "gh not found. Installing via winget..."
  winget.exe install --id GitHub.cli -e --source winget \
    --accept-source-agreements --accept-package-agreements \
    || error "Failed to install gh. Install manually from https://cli.github.com and re-run."
  _WIN_PATH=$(where.exe gh 2>/dev/null | head -1 | tr -d '\r' || true)
  [ -z "$_WIN_PATH" ] && error "gh still not found after install. Restart your terminal and re-run."
  GH=$(win_to_bash_path "$_WIN_PATH")
fi

GH_VERSION=$("$GH" --version | head -1)
success "gh found: $GH_VERSION"

# Check gh auth
if ! "$GH" auth status &>/dev/null; then
  warn "gh is not authenticated. Launching login..."
  "$GH" auth login
fi
success "gh authenticated"

# ════════════════════════════════════════════════════════════
# STEP 2 — Run tests
# ════════════════════════════════════════════════════════════
step "Running tests"

info "Frontend tests (vitest)..."
npm run test -- --run 2>&1 | tail -20
success "Frontend tests passed"

info "Rust tests (cargo test)..."
cargo test --manifest-path src-tauri/Cargo.toml 2>&1 | tail -20
success "Rust tests passed"

# ════════════════════════════════════════════════════════════
# STEP 3 — Build production
# ════════════════════════════════════════════════════════════
step "Building production (npx tauri build)"

# Clear Next.js cache to avoid path separator issue on Windows
if [ -d ".next" ]; then
  info "Clearing .next cache..."
  rm -rf .next
fi

npx tauri build
success "Build completed"

# Locate installer files
BUNDLE_DIR="src-tauri/target/release/bundle"
NSIS_FILE=$(find "$BUNDLE_DIR/nsis" -name "*.exe" 2>/dev/null | head -1)
MSI_FILE=$(find "$BUNDLE_DIR/msi"  -name "*.msi" 2>/dev/null | head -1)

[ -n "$NSIS_FILE" ] && success "NSIS installer: $NSIS_FILE" || warn "NSIS installer not found"
[ -n "$MSI_FILE"  ] && success "MSI installer:  $MSI_FILE"  || warn "MSI installer not found"

# ════════════════════════════════════════════════════════════
# STEP 4 — Commit & push files
# ════════════════════════════════════════════════════════════
step "Committing and pushing files"

if git diff --quiet && git diff --cached --quiet; then
  warn "No changes to commit. Skipping commit step."
else
  info "Changed files:"
  git status --short

  echo ""
  read -rp "Commit message: " COMMIT_MSG
  [ -z "$COMMIT_MSG" ] && error "Commit message cannot be empty."

  git add -A
  git commit -m "$COMMIT_MSG"
  success "Committed: $COMMIT_MSG"
fi

info "Pushing to origin main..."
git push origin main
success "Pushed to GitHub"

# ════════════════════════════════════════════════════════════
# STEP 5 — Calculate next version tag
# ════════════════════════════════════════════════════════════
step "Calculating next version"

LATEST_TAG=$(git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)

if [ -z "$LATEST_TAG" ]; then
  warn "No existing tags found. Starting from v0.0.0"
  LATEST_TAG="v0.0.0"
fi

info "Previous tag: $LATEST_TAG"

IFS='.' read -r MAJOR MINOR PATCH <<< "${LATEST_TAG#v}"

case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"
info "New tag     : $NEW_TAG"

echo ""
read -rp "Confirm new tag '$NEW_TAG'? [y/N]: " confirm_tag
[[ "$confirm_tag" =~ ^[Yy]$ ]] || { echo "Aborted at tagging."; exit 0; }

# ════════════════════════════════════════════════════════════
# STEP 6 — Update version in source files
# ════════════════════════════════════════════════════════════
step "Updating version in source files to ${MAJOR}.${MINOR}.${PATCH}"

VERSION_NUM="${MAJOR}.${MINOR}.${PATCH}"

sed -i "s/^version = \".*\"/version = \"${VERSION_NUM}\"/" src-tauri/Cargo.toml
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION_NUM}\"/" src-tauri/tauri.conf.json

if grep -q 'v[0-9]*\.[0-9]*\.[0-9]*' src/components/AppLayout.tsx 2>/dev/null; then
  sed -i "s/v[0-9]*\.[0-9]*\.[0-9]*/v${VERSION_NUM}/" src/components/AppLayout.tsx
fi

if grep -q 'v[0-9]*\.[0-9]*\.[0-9]*' src/app/settings/page.tsx 2>/dev/null; then
  sed -i "s/v[0-9]*\.[0-9]*\.[0-9]*/v${VERSION_NUM}/g" src/app/settings/page.tsx
fi

git add src-tauri/Cargo.toml src-tauri/tauri.conf.json src/components/AppLayout.tsx src/app/settings/page.tsx
git commit -m "chore: bump version to ${VERSION_NUM}"
git push origin main
success "Version files updated and pushed"

# ════════════════════════════════════════════════════════════
# STEP 7 — Create & push tag
# ════════════════════════════════════════════════════════════
step "Creating and pushing tag $NEW_TAG"

echo ""
read -rp "Tag annotation / release title (press Enter for 'Release $NEW_TAG'): " TAG_MSG
[ -z "$TAG_MSG" ] && TAG_MSG="Release $NEW_TAG"

git tag -a "$NEW_TAG" -m "$TAG_MSG"
git push origin "$NEW_TAG"
success "Tag $NEW_TAG pushed to GitHub"

# ════════════════════════════════════════════════════════════
# STEP 8 — Create GitHub Release
# ════════════════════════════════════════════════════════════
step "Creating GitHub Release $NEW_TAG"

echo ""
echo "Enter release notes (type END on a new line when done):"
RELEASE_NOTES=""
while IFS= read -r line; do
  [ "$line" = "END" ] && break
  RELEASE_NOTES+="$line"$'\n'
done

[ -z "$RELEASE_NOTES" ] && RELEASE_NOTES="Release $NEW_TAG"

GH_ARGS=("$NEW_TAG" --title "$TAG_MSG" --notes "$RELEASE_NOTES")
[ -n "$NSIS_FILE" ] && GH_ARGS+=("$NSIS_FILE")
[ -n "$MSI_FILE"  ] && GH_ARGS+=("$MSI_FILE")

"$GH" release create "${GH_ARGS[@]}"

RELEASE_URL=$("$GH" release view "$NEW_TAG" --json url -q .url)
success "GitHub Release created: $RELEASE_URL"

# ════════════════════════════════════════════════════════════
# Done
# ════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}  Deploy complete!${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "  Tag     : ${CYAN}$NEW_TAG${NC}"
echo -e "  Release : ${CYAN}$RELEASE_URL${NC}"
echo ""
