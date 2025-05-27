#!/bin/bash
# filepath: sync-upstream.sh

# Usage: ./sync-upstream.sh <upstream/branch> <tmp_dir>
# Example: ./sync-upstream.sh upstream/master /tmp/astro-protect

set -e

###########################
# Configuration
DEBUG=true  # Set to true to enable debug output
PROTECT_LIST="scripts/git-protect.list"  # Path to the protected files list
###########################

UPSTREAM_BRANCH="$1"
TMP_DIR="$2"

# Debug output function
log_debug() {
  if [[ "$DEBUG" == true ]]; then
    echo -e "[DEBUG] $*"
  fi
}

# Validate arguments
if [[ -z "$UPSTREAM_BRANCH" || -z "$TMP_DIR" ]]; then
  echo "Usage: $0 <upstream/branch> <tmp_dir>"
  exit 1
fi

if [[ ! -f "$PROTECT_LIST" ]]; then
  echo "File not found: $PROTECT_LIST"
  exit 1
fi

log_debug "Upstream branch: $UPSTREAM_BRANCH"
log_debug "Temporary directory: $TMP_DIR"
log_debug "Protection list file: $PROTECT_LIST"

# Include hidden files (e.g., .env)
shopt -s dotglob

# Step 1: Back up protected files and directories
mkdir -p "$TMP_DIR"
while IFS= read -r path || [[ -n "$path" ]]; do
  [[ -z "$path" ]] && continue
  [[ "${path:0:1}" == "#" ]] && continue
  if [[ -e "$path" ]]; then
    log_debug "Backing up: $path"
    mkdir -p "$TMP_DIR/$(dirname "$path")"
    cp -r "$path" "$TMP_DIR/$(dirname "$path")/"
  else
    log_debug "Skipping non-existent path: $path"
  fi
done < "$PROTECT_LIST"

# Step 2: Fetch and apply upstream content
log_debug "Fetching from remote: ${UPSTREAM_BRANCH%%/*}"
git fetch "${UPSTREAM_BRANCH%%/*}"

log_debug "Checking out from $UPSTREAM_BRANCH"
git checkout "$UPSTREAM_BRANCH" -- .

# Step 3: Restore protected files
while IFS= read -r path || [[ -n "$path" ]]; do
  [[ -z "$path" ]] && continue
  [[ "${path:0:1}" == "#" ]] && continue
  if [[ -e "$TMP_DIR/$path" ]]; then
    log_debug "Restoring: $path"
    rm -rf "$path"
    mkdir -p "$(dirname "$path")"
    cp -r "$TMP_DIR/$path" "$path"
  else
    log_debug "No backup found, skipping: $path"
  fi
done < "$PROTECT_LIST"

# Step 4: Clean up
log_debug "Removing temporary directory: $TMP_DIR"
rm -rf "$TMP_DIR"

echo "✅ Sync complete. Protected files have been restored. Please review and git add/commit/push."
