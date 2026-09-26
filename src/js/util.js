const userAgent = navigator.userAgent;
const linux = /Linux/.test(userAgent) && !/Android/.test(userAgent);
const deckScreen =
  [screen.width, screen.height].sort((a, b) => a - b).join() === "800,1280";

export const steamDeck =
  /Valve Steam Client\/Steam Deck/.test(userAgent) ||
  (linux && navigator.maxTouchPoints > 0 && deckScreen);

export function show(query) {
  document.querySelectorAll(query).forEach((e) => {
    e.classList.remove("hidden");
  });
}

export function hide(query) {
  document.querySelectorAll(query).forEach((e) => {
    e.classList.add("hidden");
  });
}

export function toggle(query) {
  document.querySelectorAll(query).forEach((e) => {
    e.classList.toggle("hidden");
  });
}

export function wait(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function appendButton(target, title, onClick) {
  const button = document.createElement("button");
  button.innerText = title;
  on(button, "click", onClick);

  if (typeof target === "string") {
    target = document.querySelector(target);
  }

  target.append(button);

  return button;
}

export function on(target, eventType, action, useCapture) {
  if (typeof target === "string") {
    target = document.querySelectorAll(target);
  } else if (!Array.isArray(target)) {
    target = [target];
  }

  for (const element of target) {
    element.addEventListener(eventType, action, useCapture);
  }
}

export function off(target, eventType, action, useCapture) {
  target.removeEventListener(eventType, action, useCapture);
}
