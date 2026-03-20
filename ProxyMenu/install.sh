#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$HOME/Library/Application Support/ProxyMenu"
SCRIPT_PATH="$TARGET_DIR/ProxyMenu.js"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/local.codex.proxymenu.plist"
LABEL="local.codex.proxymenu"
KEYCHAIN_SERVICE="codex.proxy-menu.https.wifi"
KEYCHAIN_ACCOUNT="enoFkG"
USER_ID="$(id -u)"

mkdir -p "$TARGET_DIR" "$LAUNCH_AGENTS_DIR"
cp "$ROOT_DIR/ProxyMenu.js" "$SCRIPT_PATH"
chmod 700 "$SCRIPT_PATH"

if [[ -n "${PROXY_PASSWORD:-}" ]]; then
  /usr/bin/security add-generic-password \
    -U \
    -a "$KEYCHAIN_ACCOUNT" \
    -s "$KEYCHAIN_SERVICE" \
    -w "$PROXY_PASSWORD" \
    >/dev/null
fi

/bin/cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/osascript</string>
    <string>-l</string>
    <string>JavaScript</string>
    <string>$SCRIPT_PATH</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>StandardOutPath</key>
  <string>/tmp/proxymenu.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/proxymenu.err</string>
</dict>
</plist>
EOF

/bin/launchctl bootout "gui/$USER_ID" "$PLIST_PATH" >/dev/null 2>&1 || true
/bin/launchctl bootstrap "gui/$USER_ID" "$PLIST_PATH"
/bin/launchctl kickstart -k "gui/$USER_ID/$LABEL"

echo "Proxy menu installed and started."
