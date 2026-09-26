import * as Keyboard from "./keyboard.js";
import * as Settings from "./settings.js";
import { appendButton, off, on, steamDeck } from "./util.js";

let connection;
let keyState = 0;

const keyBitMap = {
  up: 6,
  down: 5,
  left: 7,
  right: 2,
  select: 4,
  start: 3,
  option: 1,
  edit: 0,
};

const defaultInputMap = Object.freeze({
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ShiftLeft: "select",
  Space: "start",
  KeyZ: "option",
  KeyX: "edit",

  Gamepad12: "up",
  Gamepad64: "up",
  Gamepad13: "down",
  Gamepad65: "down",
  Gamepad14: "left",
  Gamepad66: "left",
  Gamepad15: "right",
  Gamepad67: "right",
  Gamepad8: "select",
  Gamepad2: "select",
  Gamepad5: "select",
  Gamepad9: "start",
  Gamepad3: "start",
  Gamepad1: "option",
  Gamepad0: "edit",
});

const inputMap = {};

let activeSource = null;
let selectedSource = null;

function handleInput(input, isDown, e) {
  if (!input) return;

  activeSource = input.startsWith("Gamepad") ? gamepadSource() : "keyboard";
  renderMappings();

  if (resolveCapture) {
    e?.preventDefault();
    if (isDown) {
      resolveCapture(input);
    }
    return;
  }

  if (Keyboard.handleKey(input, isDown, e)) return;

  handleAction(inputMap[input], isDown, e);
}

function handleControl(isDown, e) {
  const action = e.target.dataset.action;
  if (!action) return;

  if (isMapping && isDown && !resolveCapture) {
    startMapKey(e.target, action);
  } else {
    handleAction(action, isDown, e);
  }
}

function handleAction(action, isDown, e) {
  if (!action) return;

  e?.preventDefault();

  const bit = keyBitMap[action];
  if (bit === undefined) return;

  const newState = isDown ? keyState | (1 << bit) : keyState & ~(1 << bit);

  if (newState === keyState) return;

  keyState = newState;

  connection.sendKeys(keyState);

  document
    .querySelector(`#controls > [data-action="${action}"]`)
    .classList.toggle("active", isDown);
}

export function setup(connection_) {
  connection = connection_;

  Keyboard.setup(connection);

  on(document, "keydown", (e) => handleInput(e.code, true, e));

  on(document, "keyup", (e) => handleInput(e.code, false, e));

  const controls = document.getElementById("controls");

  on(controls, "mousedown", (e) => handleControl(true, e));

  on(controls, "touchstart", (e) => handleControl(true, e));

  on(controls, "mouseup", (e) => handleControl(false, e));

  on(controls, "touchend", (e) => handleControl(false, e));

  appendButton("#mapping-buttons", "Reset to Default", resetMappings);
  appendButton("#mapping-buttons", "Clear All", clearMappings);
  appendButton("#mapping-buttons", "Done", stopMapping);
  setupMappingInfo();

  Object.assign(inputMap, Settings.load("inputMap", defaultInputMap));
}

let gamepadsRunning = false;
const gamepadStates = [];
const hatMap = {
  0: [true, false, false, false],
  1: [true, false, false, true],
  2: [false, false, false, true],
  3: [false, true, false, true],
  4: [false, true, false, false],
  5: [false, true, true, false],
  6: [false, false, true, false],
  7: [true, false, true, false],
  8: [false, false, false, false],
  15: [false, false, false, false],
};

function pollGamepads() {
  if (!gamepadsRunning) return;

  let somethingPresent = false;
  for (const gamepad of navigator.getGamepads()) {
    if (!gamepad?.connected) continue;

    somethingPresent = true;

    let state = gamepadStates[gamepad.index];
    if (!state) {
      state = gamepadStates[gamepad.index] = {
        buttons: [],
        axes: Array(gamepad.axes.length)
          .fill(null)
          .map((_) => ({})),
      };
    }

    if (gamepad.mapping !== "standard") {
      for (let i = 0; i < gamepad.axes.length; i++) {
        if (state.axes[i].isHat === false) continue;

        const value = (gamepad.axes[i] + 1) * 3.5;
        const error = Math.abs(Math.round(value) - value);
        const hatPosition = hatMap[Math.round(value)];
        if (error > 4.8e-7 || hatPosition === undefined) {
          // definitely not a hat based on this value
          state.axes[i].isHat = false;
          continue;
        } else if (value === 0 && state.axes[i].isHat !== true) {
          continue;
        } else {
          state.axes[i].isHat = true;
        }

        for (let b = 0; b < 4; b++) {
          const pressed = hatPosition[b];
          if (state.buttons[64 + b] !== pressed) {
            state.buttons[64 + b] = pressed;
            handleInput(`Gamepad${64 + b}`, pressed);
          }
        }
      }
    }

    for (let i = 0; i < gamepad.axes.length; i++) {
      const value = gamepad.axes[i];
      if (state.axes[i].isHat === true || Math.abs(value) > 1) continue;

      const negative = value <= -0.5;
      const positive = value >= 0.5;
      if (state.axes[i].negative !== negative) {
        state.axes[i].negative = negative;
        handleInput(`GamepadAxis${i}-`, negative);
      }
      if (state.axes[i].positive !== positive) {
        state.axes[i].positive = positive;
        handleInput(`GamepadAxis${i}+`, positive);
      }
    }

    for (let i = 0; i < gamepad.buttons.length; i++) {
      const pressed = gamepad.buttons[i].pressed;
      if (state.buttons[i] !== pressed) {
        state.buttons[i] = pressed;
        handleInput(`Gamepad${i}`, pressed);
      }
    }
  }

  if (somethingPresent) {
    requestAnimationFrame(pollGamepads);
  } else {
    gamepadsRunning = false;
  }
}

on(window, "gamepadconnected", (e) => {
  if (e.gamepad.mapping !== "standard") {
    console.warn("Non-standard gamepad attached. Mappings may be funny.");
  }

  renderMappings();

  if (!gamepadsRunning) {
    gamepadsRunning = true;
    pollGamepads();
  }
});

on(window, "gamepaddisconnected", (e) => {
  gamepadStates[e.gamepad.index] = null;
  renderMappings();
});

export let isMapping = false;
let resolveMapping = null;
let resolveCapture = null;

const inputNames = {
  ShiftLeft: "Left Shift",
  ShiftRight: "Right Shift",
  ControlLeft: "Left Ctrl",
  ControlRight: "Right Ctrl",
  AltLeft: "Left Alt",
  AltRight: "Right Alt",
  MetaLeft: "Left Meta",
  MetaRight: "Right Meta",
};

function inputName(input) {
  if (inputNames[input]) return inputNames[input];

  const gamepad = /^Gamepad(Axis)?(\d+)([-+])?$/.exec(input);
  if (gamepad) {
    return `Gamepad${gamepad[1] ? " axis" : ""} ${gamepad[2]}${gamepad[3] ?? ""}`;
  }

  return input
    .replace(/^Key/, "")
    .replace(/^Digit/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

const deckButtons = {
  0: "A",
  1: "B",
  2: "X",
  3: "Y",
  4: "L1",
  5: "R1",
  6: "L2",
  7: "R2",
  8: "View",
  9: "Menu",
  10: "L3",
  11: "R3",
  12: "D-pad Up",
  13: "D-pad Down",
  14: "D-pad Left",
  15: "D-pad Right",
  64: "D-pad Up",
  65: "D-pad Down",
  66: "D-pad Left",
  67: "D-pad Right",
};

function deckName(input) {
  const button = /^Gamepad(\d+)$/.exec(input);
  return deckButtons[button?.[1]] ?? inputName(input);
}

const sources = {
  keyboard: {
    match: (input) => !input.startsWith("Gamepad"),
    label: (input) => inputName(input),
  },
  controller: {
    match: (input) => input.startsWith("Gamepad"),
    label: (input) => inputName(input),
  },
  steamdeck: {
    match: (input) => input.startsWith("Gamepad"),
    label: (input) => deckName(input),
  },
};

function gamepadSource() {
  return steamDeck ? "steamdeck" : "controller";
}

function detectedSource() {
  if (activeSource) return activeSource;

  const connected = navigator.getGamepads?.().some((pad) => pad?.connected);
  return connected ? gamepadSource() : "keyboard";
}

function setupMappingInfo() {
  for (const button of document.querySelectorAll("#mapping-info > button")) {
    on(button, "click", () => {
      selectedSource = button.dataset.source;
      renderMappings();
    });
  }
}

function renderMappings() {
  if (!isMapping) return;

  const selected = selectedSource ?? detectedSource();
  const source = sources[selected];

  const mapped = {};
  for (const [input, action] of Object.entries(inputMap)) {
    if (!source.match(input)) continue;

    mapped[action] ??= [];
    mapped[action].push(source.label(input));
  }

  for (const button of document.querySelectorAll("#mapping-info > button")) {
    button.classList.toggle("active", button.dataset.source === selected);
  }

  for (const key of document.querySelectorAll("#controls > div")) {
    key.querySelector(".mapped").innerText = (mapped[key.dataset.action] ?? [])
      .sort()
      .join(", ");
  }
}

export function startMapping() {
  isMapping = true;
  document.body.classList.add("mapping");
  renderMappings();
  return new Promise((resolve) => {
    resolveMapping = resolve;
  });
}

export function stopMapping() {
  cancelCapture();
  document.body.classList.remove("mapping");
  isMapping = false;
  selectedSource = null;
  resolveMapping?.();
}

export function captureNextInput() {
  cancelCapture();
  return new Promise((resolve) => {
    resolveCapture = resolve;
  }).then((input) => {
    resolveCapture = null;
    return input;
  });
}

export function cancelCapture() {
  resolveCapture?.(null);
}

async function startMapKey(keyElement, action) {
  const cancel = (e) => {
    e.stopPropagation();
    cancelCapture();
  };

  on(document.body, "mousedown", cancel, true);
  on(document.body, "touchstart", cancel, true);
  document.body.classList.add("capturing");
  keyElement.classList.add("mapping");
  try {
    const input = await captureNextInput();
    if (input) {
      inputMap[input] = action;
      Settings.save("inputMap", inputMap);
      selectedSource = activeSource;
      renderMappings();
    }
  } finally {
    keyElement.classList.remove("mapping");
    document.body.classList.remove("capturing");
    off(document.body, "touchstart", cancel, true);
    off(document.body, "mousedown", cancel, true);
  }
}

export function resetMappings() {
  for (const input of Object.keys(inputMap)) {
    delete inputMap[input];
  }
  Object.assign(inputMap, defaultInputMap);
  Settings.save("inputMap", inputMap);
  renderMappings();
}

export function clearMappings() {
  for (const input of Object.keys(inputMap)) {
    delete inputMap[input];
  }
  Settings.save("inputMap", inputMap);
  renderMappings();
}
