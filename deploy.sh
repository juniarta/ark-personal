#!/usr/bin/env bash
# ============================================================
# deploy.sh — Ark Personal Tools deployment script
#
# Usage:
#   bash deploy.sh bump [patch|minor|major]   bump version only
#   bash deploy.sh release                    build, tag & create release
#   bash deploy.sh all [patch|minor|major]    bump + release in one go
#
# Required env var for release step:
#   GITHUB_TOKEN=<your personal access token>
# ============================================================

set -e

# ── Config ───────────────────────────────────────────────────
GITHUB_REPO="juniarta/ark-personal"
BUNDLE_DIR="src-tauri/target/release/bundle"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}▶ $1${NC}"; }

# ── Usage ────────────────────────────────────────────────────
usage() {
  echo -e "\nUsage:"
  echo -e "  bash deploy.sh bump [patch|minor|major]   Bump version only (default: patch)"
  echo -e "  bash deploy.sh release                    Build, tag & create GitHub release"
  echo -e "  bash deploy.sh all [patch|minor|major]    Run bump then release\n"
  exit 1
}

[ $# -eq 0 ] && usage

COMMAND="$1"
BUMP_TYPE="${2:-patch}"

if [[ "$COMMAND" != "bump" && "$COMMAND" != "release" && "$COMMAND" != "all" ]]; then
  usage
fi

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  error "Invalid bump type '$BUMP_TYPE'. Use: patch | minor | major"
fi

# ════════════════════════════════════════════════════════════
#  STEP 1 — BUMP VERSION
# ════════════════════════════════════════════════════════════
do_bump() {
  echo -e "\n${BOLD}========================================${NC}"
  echo -e "${BOLD}  Step 1 — Bump Version (${BUMP_TYPE})${NC}"
  echo -e "${BOLD}========================================${NC}"

  # ── Read current version from package.json ───────────────
  CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
  info "Current version: $CURRENT_VERSION"

  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

  case "$BUMP_TYPE" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    patch) PATCH=$((PATCH + 1)) ;;
  esac

  NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
  info "New version    : $NEW_VERSION"

  echo ""
  read -rp "Confirm bump to v${NEW_VERSION}? [y/N]: " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

  # ── Update version in files ──────────────────────────────
  step "Updating version in source files"

  sed -i "s/^version = \".*\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml
  sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json
  sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" package.json

  success "Cargo.toml       → $NEW_VERSION"
  success "tauri.conf.json  → $NEW_VERSION"
  success "package.json     → $NEW_VERSION"

  # ── Commit & push ────────────────────────────────────────
  step "Committing and pushing version bump"

  git add src-tauri/Cargo.toml src-tauri/tauri.conf.json package.json
  git commit -m "chore: bump version to ${NEW_VERSION}"
  git push origin main

  success "Version bump v${NEW_VERSION} pushed to main"

  # Export for use in do_release if called from do_all
  export BUMPED_VERSION="$NEW_VERSION"
}

# ════════════════════════════════════════════════════════════
#  STEP 2 — RELEASE (build + tag + GitHub release via curl)
# ════════════════════════════════════════════════════════════
do_release() {
  echo -e "\n${BOLD}========================================${NC}"
  echo -e "${BOLD}  Step 2 — Build, Tag & Release${NC}"
  echo -e "${BOLD}========================================${NC}"

  # ── Require GITHUB_TOKEN ─────────────────────────────────
  if [ -z "$GITHUB_TOKEN" ]; then
    error "GITHUB_TOKEN is not set.\nExport it first:\n  export GITHUB_TOKEN=your_token_here"
  fi

  # ── Read current version ─────────────────────────────────
  CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
  TAG="v${CURRENT_VERSION}"
  info "Version: $CURRENT_VERSION  →  Tag: $TAG"

  # ── Check tag doesn't already exist ──────────────────────
  if git tag | grep -q "^${TAG}$"; then
    error "Tag $TAG already exists. Run 'bump' first to increment the version."
  fi

  # ── Commit any pending changes ───────────────────────────
  step "Checking for uncommitted changes"

  if ! git diff --quiet || ! git diff --cached --quiet; then
    info "Uncommitted changes detected:"
    git status --short
    echo ""
    read -rp "Commit message (or press Enter to skip): " COMMIT_MSG
    if [ -n "$COMMIT_MSG" ]; then
      git add -A
      git commit -m "$COMMIT_MSG"
      git push origin main
      success "Changes committed and pushed"
    else
      warn "Skipping commit. Proceeding with current state."
    fi
  else
    success "Working tree is clean"
  fi

  # ── Build ────────────────────────────────────────────────
  step "Building production app (npx tauri build)"

  if [ -d ".next" ]; then
    info "Clearing .next cache..."
    rm -rf .next
  fi

  npx tauri build
  success "Build completed"

  NSIS_FILE=$(find "$BUNDLE_DIR/nsis" -name "*.exe" 2>/dev/null | head -1)
  MSI_FILE=$(find  "$BUNDLE_DIR/msi"  -name "*.msi" 2>/dev/null | head -1)

  [ -n "$NSIS_FILE" ] && success "NSIS: $NSIS_FILE" || warn "NSIS installer not found"
  [ -n "$MSI_FILE"  ] && success "MSI:  $MSI_FILE"  || warn "MSI installer not found"

  # ── Release notes ────────────────────────────────────────
  step "Release details"

  read -rp "Release title (Enter for 'Release $TAG'): " RELEASE_TITLE
  [ -z "$RELEASE_TITLE" ] && RELEASE_TITLE="Release $TAG"

  echo "Release notes (type END on a new line when done):"
  RELEASE_NOTES=""
  while IFS= read -r line; do
    [ "$line" = "END" ] && break
    RELEASE_NOTES+="$line\n"
  done
  [ -z "$RELEASE_NOTES" ] && RELEASE_NOTES="Release $TAG"

  # ── Create & push tag ────────────────────────────────────
  step "Creating and pushing tag $TAG"

  git tag -a "$TAG" -m "$RELEASE_TITLE"
  git push origin "$TAG"
  success "Tag $TAG pushed"

  # ── Create GitHub release via API ────────────────────────
  step "Creating GitHub release via API"

  # Escape release notes for JSON
  NOTES_JSON=$(printf '%s' "$RELEASE_NOTES" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null \
    || printf '%s' "$RELEASE_NOTES" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')

  RESPONSE=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    "https://api.github.com/repos/${GITHUB_REPO}/releases" \
    -d "{
      \"tag_name\": \"${TAG}\",
      \"name\": \"${RELEASE_TITLE}\",
      \"body\": ${NOTES_JSON},
      \"draft\": false,
      \"prerelease\": false
    }")

  RELEASE_ID=$(echo "$RESPONSE" | grep '"id"' | head -1 | sed 's/[^0-9]*//g')
  RELEASE_URL=$(echo "$RESPONSE" | grep '"html_url"' | head -1 | sed 's/.*"html_url": "\([^"]*\)".*/\1/')

  [ -z "$RELEASE_ID" ] && error "Failed to create release. Response:\n$RESPONSE"
  success "Release created: $RELEASE_URL"

  # ── Upload installer assets ──────────────────────────────
  step "Uploading installer assets"

  upload_asset() {
    local FILE="$1"
    local NAME
    NAME=$(basename "$FILE")
    info "Uploading $NAME..."
    curl -s -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Content-Type: application/octet-stream" \
      "https://uploads.github.com/repos/${GITHUB_REPO}/releases/${RELEASE_ID}/assets?name=${NAME}" \
      --data-binary @"$FILE" > /dev/null
    success "Uploaded: $NAME"
  }

  [ -n "$NSIS_FILE" ] && upload_asset "$NSIS_FILE"
  [ -n "$MSI_FILE"  ] && upload_asset "$MSI_FILE"

  # ── Done ─────────────────────────────────────────────────
  echo ""
  echo -e "${BOLD}${GREEN}========================================${NC}"
  echo -e "${BOLD}${GREEN}  Release complete!${NC}"
  echo -e "${BOLD}${GREEN}========================================${NC}"
  echo -e "  Tag     : ${CYAN}$TAG${NC}"
  echo -e "  Release : ${CYAN}$RELEASE_URL${NC}"
  echo ""
}

# ════════════════════════════════════════════════════════════
#  DISPATCH
# ════════════════════════════════════════════════════════════
case "$COMMAND" in
  bump)    do_bump ;;
  release) do_release ;;
  all)     do_bump && do_release ;;
esac
