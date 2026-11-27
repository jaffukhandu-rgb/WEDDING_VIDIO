// Keep the first close pending after the browser transport disconnects.
import { chromium } from "playwright";
import { once } from "node:events";

const schedule = globalThis.setTimeout;
globalThis.setTimeout = (callback, ms, ...args) =>
  schedule(callback, callback.name === "stopLongRender" ? 10 : ms, ...args);

let closeCalls = 0;
chromium.launch = async () => {
  let disconnect;
  return {
    newPage() {
      return new Promise((_, reject) => { disconnect = reject; });
    },
    async close() {
      if (++closeCalls > 1) return;
      disconnect(new Error("Fixture browser disconnected"));
      await once(process, "message");
      process.send({ closeCalls });
    }
  };
};
await import("../../server/render-server.js");
