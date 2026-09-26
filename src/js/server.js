import path from "node:path";
import { fileURLToPath } from "node:url";

import LocalWebServer from "local-web-server";
import CliView from "lws/lib/view/cli-view.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const routes = [
  ["/worker.js", "/src/js/dev-worker.js"],
  ["/", "/src/index.html"],
  ["/:name.css", "/build/:name.css"],
  ["/:name.js", "/src/js/:name.js"],
  ["/icon.png", "/public/icon.png"],
  ["/app.webmanifest", "/public/app.webmanifest"],
];

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
}

const key = option("key");
const cert = option("cert");

const server = await LocalWebServer.create({
  directory: root,
  port: Number(option("port", 8000)),
  rewrite: routes.map(([from, to]) => `${from} -> ${to}`),
  blacklist: ["/cert/private-key.pem"],
  logFormat: "dev",
  view: new CliView(),

  ...(key && { key, cert }),
});

server.on("verbose", (name, value) => {
  if (name === "server.error") {
    console.error(`\n  ${value.message}`);

    process.exitCode = 1;
  }
});
