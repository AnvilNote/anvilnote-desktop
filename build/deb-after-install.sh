#!/bin/bash
# electron-builder's default deb postinst refreshes the desktop and mime
# databases but not the GTK icon cache, so the app can show a blank/generic
# icon in launchers until the next cache refresh. Force it here.
if hash gtk-update-icon-cache 2>/dev/null; then
  gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi
