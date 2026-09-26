#!/usr/bin/env bash
# SteamOS launcher for the packaged M8 Web Display AppImage.
#
# Point Steam's "Add a Non-Steam Game" at this script. The --no-sandbox flag is
# needed when Electron is launched from Steam on SteamOS, where the setuid
# chrome-sandbox helper is unavailable.
set -euo pipefail

app="${M8WEB_APPIMAGE:-$HOME/Applications/M8WebDisplay.AppImage}"

if [ ! -x "$app" ]; then
	echo "M8 Web Display AppImage not found at: $app" >&2
	echo "Set M8WEB_APPIMAGE to the AppImage path." >&2
	exit 1
fi

exec "$app" --no-sandbox "$@"
