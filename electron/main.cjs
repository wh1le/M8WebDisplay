const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, shell } = require("electron");

const INDEX = path.join(__dirname, "..", "build", "index.html");

// M8WEB_DEBUG=1 prints what the main process sees and forwards renderer logs.
const DEBUG = process.env.M8WEB_DEBUG === "1";
const debug = (...args) => {
  if (DEBUG) console.error("[m8]", ...args);
};

// The M8 headless firmware runs on a Teensy 4.1, whose USB serial descriptor
// usually reads "USB Serial". Match it loosely, then fall back to the first port.
function looksLikeM8(port) {
  return (
    /m8|teensy|usb serial|dirtywave/i.test(port.displayName ?? "") ||
    /^(0x)?16c0$/i.test(port.vendorId ?? "")
  );
}

function configureSession(session) {
  // Electron replaces the browser's device pickers with these events, so the
  // display connects without any user interaction.
  session.on("select-serial-port", (event, portList, _contents, callback) => {
    event.preventDefault();
    debug(
      "select-serial-port",
      portList.map((p) => ({
        portId: p.portId,
        displayName: p.displayName,
        vendorId: p.vendorId,
        productId: p.productId,
      })),
    );
    const port = portList.find(looksLikeM8) ?? portList[0];
    debug("choosing port:", port?.portId ?? "(none)");
    callback(port ? port.portId : "");
  });

  session.on("select-usb-device", (event, details, callback) => {
    event.preventDefault();
    const device =
      details.deviceList?.find((d) =>
        looksLikeM8({ displayName: d.deviceName }),
      ) ?? details.deviceList?.[0];
    callback(device ? device.deviceId : "");
  });

  // Audio is captured from the M8's USB audio input with getUserMedia, so the
  // media permission has to be granted as well.
  const allowed = (permission) =>
    permission === "serial" || permission === "usb" || permission === "media";

  session.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(allowed(permission));
  });

  session.setPermissionCheckHandler((_contents, permission) =>
    allowed(permission) ? true : undefined,
  );

  session.setDevicePermissionHandler(
    (details) =>
      details.deviceType === "serial" || details.deviceType === "usb",
  );
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    title: "M8 Web Display",
  });

  configureSession(win.webContents.session);

  if (DEBUG) {
    win.webContents.on("console-message", (event, ...args) => {
      debug("[renderer]", event.message ?? args[0]);
    });
  }

  // Keep the display in the window; send docs/firmware links to the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  if (!fs.existsSync(INDEX)) {
    win.loadURL(
      `data:text/html,${encodeURIComponent(
        "<body style='font-family:sans-serif;background:#111;color:#eee'>" +
          "<h1>Build missing</h1><p>Run <code>pnpm build</code> first.</p></body>",
      )}`,
    );
    return;
  }

  win.loadFile(INDEX);
}

app.commandLine.appendSwitch("disable-serial-blocklist");

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => app.quit());
