#!/bin/bash
# electron-builder's default deb postinst refreshes the desktop and mime
# databases but not the GTK icon cache, so the app can show a blank/generic
# icon in launchers until the next cache refresh. Force it here.
if hash gtk-update-icon-cache 2>/dev/null; then
  gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi

# Chromium's setuid sandbox helper only works when it's owned by root with
# the setuid bit set — dpkg installs everything as the owning user by
# default, so without this the app aborts on first launch with "The SUID
# sandbox helper binary was found, but is not configured correctly." This
# is the standard fix other Electron .deb packages (e.g. VS Code) apply in
# their own postinst, keeping the sandbox enabled instead of the app having
# to launch with --no-sandbox.
SANDBOX_BIN="/opt/AnvilNote/chrome-sandbox"
if [ -f "$SANDBOX_BIN" ]; then
  chown root:root "$SANDBOX_BIN" || true
  chmod 4755 "$SANDBOX_BIN" || true
fi
