import { on, show } from "./util.js";

const updateInterval = 30 * 60 * 1000;

let reloading = false;
function reload() {
  if (!reloading) {
    window.location.reload();
    reloading = true;
  }
}

let reloadAction = () => {};
on("#reload button", "click", () => reloadAction());

export async function setup() {
  on(navigator.serviceWorker, "controllerchange", () => reload());

  let firstInstall = !navigator.serviceWorker.controller;

  const reg = await navigator.serviceWorker
    .register("worker.js")
    .catch(async () => {
      if (!navigator.serviceWorker.controller) {
        return;
      }

      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((entry) => entry.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      reload();
    });

  if (!reg) {
    return;
  }

  on(reg, "updatefound", () => {
    if (firstInstall) {
      firstInstall = false;
      return;
    }

    const newWorker = reg.installing;
    on(newWorker, "statechange", () => {
      if (newWorker.state === "installed") {
        if (navigator.serviceWorker.controller) {
          reloadAction = () => newWorker.postMessage({ action: "skipWaiting" });
        } else {
          reloadAction = reload;
        }

        show("#reload");
      }
    });
  });

  setInterval(() => reg.update(), updateInterval);
}
