#!/bin/zsh
set -euo pipefail

TARGET_DIR="$HOME/Library/Application Support/ProxyMenu"
PLIST_PATH="$HOME/Library/LaunchAgents/local.codex.proxymenu.plist"
LABEL="local.codex.proxymenu"
USER_ID="$(id -u)"

/bin/launchctl bootout "gui/$USER_ID" "$PLIST_PATH" >/dev/null 2>&1 || true
rm -f "$PLIST_PATH"
rm -rf "$TARGET_DIR"

echo "Proxy menu removed."
