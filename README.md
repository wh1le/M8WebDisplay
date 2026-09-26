# M8 Headless Web Display

This is alternative frontend for [M8 Headless](https://github.com/DirtyWave/M8HeadlessFirmware).

It runs entirely in the browser and only needs to be hosted on a server to satisfy browser security policies. No network communication is involved.

Try it out at https://derkyjadex.github.io/M8WebDisplay/.

Features:

- Render the M8 display
- Route M8's audio out to the default audio output
- Keyboard and gamepad input
- Custom key/button mapping
- Touch-compatible on-screen keys
- Firmware loader
- Full offline support
- Installable as a [PWA](https://en.wikipedia.org/wiki/Progressive_web_application)

## Supported Platforms

The following should generally work, details are below.

- Chrome 89+ on macOS, Windows and Linux<sup>1</sup>
- Edge 89+ on macOS and Windows
- Chrome on Android<sup>2</sup>, without audio<sup>3</sup>

The web display uses the Web Serial API to communicate with the M8. This API is currently only supported by desktop versions of Google Chrome and Microsoft Edge in versions 89 or later. For Chrome on Android the code can fallback to using the WebUSB API.

1. On Ubuntu and Debian systems (and perhaps others) users do not have permission to access the M8's serial port by default. You will need to add yourself to the `dialout` group and restart your login session/reboot. After this you should be able to connect normally.
2. Newer Samsung phones appear to handle USB serial in a way that prevents Chrome from being able to open the device. There is an [outstanding Chromium bug](https://bugs.chromium.org/p/chromium/issues/detail?id=1099521#c21) to fix this.
3. The way that that Android handles USB audio devices (such as the M8) prevents us from being able to redirect the audio to the phone's speakers or headphone output. When the M8 is attached, Android appears to completely disable the internal audio interface and uses the M8 for all audio input and output instead. So the page is able to receive the audio from the M8 but it does not have anywhere to redirect it to other than the M8 itself.

## Developing

To build this project you need a standard unix-like environment and a recent-ish version of [Node.js](https://nodejs.org/) (15.6 works, earlier versions might not). You should be able to build on macOS, Linux and [WSL](https://docs.microsoft.com/en-us/windows/wsl/) on Windows.

From a fresh clone, run this in your terminal:

```
pnpm dev
```

This will download the necessary node packages, build the files required to run a debug version of the display and launch a local web server. If this is successful you can open http://localhost:8000/ in Chrome to launch the display. Press `ctrl-c` to stop the server.

You can edit the files in `src/js/` and simply refresh the page to see the changes. If you edit the `*.scss` files or the shaders you will need to run `pnpm build` to regenerate the necessary files before refreshing. You can do this from another terminal window/tab, there is no need to restart the server.

Chrome requires that pages are served securely in order to enable features such as the Serial API. Normally this means using HTTPS but there is an exception when you use `localhost`. If you want to test your changes on another computer on your network you will need to run the local web server with HTTPS:

```
pnpm dev:https
```

This will generate a certificate and the local web server will now work from `https://<your-computer-name>:8000` (the full list of addresses is shown in the command output). When you use this address you will need to either ignore the security warning or install the certificate at `cert/server.crt` as a trusted Certificate Authority on your device.

To build a release version of the display run:

```
pnpm deploy
```

This will build and copy the release files to the `deploy/` directory. These files can be hosted on any static web server as long as has an HTTPS address.

## Project layout

```
public/   files copied to the deploy root unchanged (icon.png, app.webmanifest)
src/      all source: index.html, js/, css/, shaders/ and the assets embedded by the build
scripts/  build.sh, ws.sh, cert.sh, m8web.sh
electron/ Electron shell (main.cjs)
build/    generated output, not tracked
dist/     packaged AppImages, not tracked
```

`index.html` refers to files the way the finished site lays them out (`index.css`,
`main.js`, `worker.js`, `icon.png`, `app.webmanifest`). The dev server serves the
repository root and rewrites those paths to the matching sources, so the same markup
works before and after a build.

## Desktop app (Electron)

The display can be wrapped in an Electron shell so that it runs like a native
app. This is mainly useful on a Steam Deck, where it can then be added as a
non-Steam game.

```
pnpm electron   # build and run in an Electron window
pnpm package    # build dist/M8WebDisplay.AppImage
```

`electron/main.cjs` loads `build/index.html` and replaces the browser's device
pickers with automatic selection of the M8 at the session level, so no
permission prompt is shown. Links in the page are opened in the system browser
instead of navigating the display away.

### Steam Deck

1. Copy `dist/M8WebDisplay.AppImage` to `~/Applications/` and make it
executable.
2. Give your user access to the M8's serial port. Create
`/etc/udev/rules.d/99-m8-headless.rules` containing
`SUBSYSTEM=="tty", ATTRS{idVendor}=="16c0", MODE="0666"`, then run
`sudo udevadm control --reload && sudo udevadm trigger`.
3. Add `scripts/m8web.sh` as a non-Steam game (Games → Add a Non-Steam Game).
It runs the AppImage with `--no-sandbox`, which SteamOS needs when Electron is
launched from Steam. Set `M8WEB_APPIMAGE` if the AppImage lives elsewhere.
4. In Gaming Mode the display enables its on-screen controls automatically
(1280×800 touch screen). Bind the Deck controls to A, S, Z, X and the arrow
keys for keyboard-style play.

## TODO/Ideas

- Avoid/automatically recover from bad frames
- Auto-reboot for firmware loader/real M8 support
- Selectable audio output device

## Licence

This code is released under the MIT licence.

See LICENSE for more details.
