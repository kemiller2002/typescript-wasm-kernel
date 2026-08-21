// A hand-written EngineTransport for this demo page — not a real engine,
// just enough state and command handling to exercise every bridge
// primitive. Nothing here is bridge code; BrowserKernel itself is imported
// unmodified from the real build.
import { BrowserKernel } from "../dist/kernel/browser-kernel.js";

let effectSequence = 0;
function httpEffect(url, timeoutMs = 3000) {
  return { kind: "Http", correlationId: `demo-${++effectSequence}`, method: "GET", url, timeoutMs };
}

class KitchenSinkEngine {
  #counter = 0;
  #panelOpen = false;
  #query = "";
  #items = [
    { id: "1", label: "Write the kernel" },
    { id: "2", label: "Write the tests" },
    { id: "3", label: "Ship it" },
  ];
  #nextItemId = 4;
  #selectedId = null;
  #log = [];
  #nextLogId = 1;
  #broken = false;
  #cancellableId = null;
  #showBrokenProjection = false;

  async start() {}

  #pushLog(text) {
    this.#log = [{ id: String(this.#nextLogId++), text }, ...this.#log].slice(0, 12);
  }

  #view(overrides = {}) {
    const view = {
      counter: this.#counter,
      panelOpen: this.#panelOpen,
      query: this.#query,
      items: this.#items.map((item) => ({ ...item, selected: item.id === this.#selectedId })),
      log: this.#log,
      deliberatelyMissing: "present — click “Trigger a malformed projection” to make it go stale",
      ...overrides.view,
    };
    if (this.#showBrokenProjection) delete view.deliberatelyMissing;
    return { view, effects: overrides.effects ?? [], cancellations: overrides.cancellations ?? [] };
  }

  async dispatch(message) {
    if (this.#broken && message.kind !== "Initialize") {
      throw new Error("simulated engine crash — the transport itself is throwing now");
    }
    if (message.kind === "Initialize") {
      this.#pushLog("Initialize");
      return this.#view();
    }
    if (message.kind === "Event") {
      const { name, key, value } = message.event;
      switch (name) {
        case "increment":
          this.#counter += 1;
          this.#pushLog(`increment → ${this.#counter}`);
          return this.#view();
        case "toggle":
          this.#panelOpen = !this.#panelOpen;
          this.#pushLog(`toggle → panelOpen=${this.#panelOpen}`);
          return this.#view();
        case "search":
          this.#query = value ?? "";
          this.#pushLog(`search (data-on="input") → "${this.#query}"`);
          return this.#view();
        case "addItem":
          this.#items = [...this.#items, { id: String(this.#nextItemId), label: `Item ${this.#nextItemId}` }];
          this.#nextItemId += 1;
          this.#pushLog("addItem");
          return this.#view();
        case "removeItem":
          this.#items = this.#items.filter((item) => item.id !== key);
          this.#pushLog(`removeItem key=${key}`);
          return this.#view();
        case "selectItem":
          this.#selectedId = key;
          this.#pushLog(`selectItem key=${key} (click on a plain <li>, default trigger)`);
          return this.#view();
        case "shuffle":
          this.#items = [...this.#items].reverse();
          this.#pushLog("shuffle — same DOM nodes, new order");
          return this.#view();
        case "triggerSuccess":
          this.#pushLog("→ effect requested: success");
          return this.#view({ effects: [httpEffect("/demo/success")] });
        case "triggerNetworkFailure":
          this.#pushLog("→ effect requested: network failure");
          return this.#view({ effects: [httpEffect("/demo/network-failure")] });
        case "triggerInvalidResponse":
          this.#pushLog("→ effect requested: invalid response");
          return this.#view({ effects: [httpEffect("/demo/invalid-response")] });
        case "triggerTimeout":
          this.#pushLog("→ effect requested: timeout (800ms, always OutcomeUnknown)");
          return this.#view({ effects: [httpEffect("/demo/hang", 800)] });
        case "triggerCancellable": {
          const effect = httpEffect("/demo/hang", 30000);
          this.#cancellableId = effect.correlationId;
          this.#pushLog(`→ effect requested: cancellable (${effect.correlationId})`);
          return this.#view({ effects: [effect] });
        }
        case "cancelEffect":
          if (!this.#cancellableId) {
            this.#pushLog("cancelEffect — nothing in flight");
            return this.#view();
          }
          this.#pushLog(`cancelEffect → ${this.#cancellableId}`);
          return this.#view({ cancellations: [this.#cancellableId] });
        case "triggerBrokenProjection":
          this.#showBrokenProjection = true;
          this.#pushLog("→ (deliberately) omitting a bound view key");
          return this.#view();
        case "breakTransport":
          this.#pushLog("breakTransport → every dispatch after this one throws");
          this.#broken = true;
          return this.#view();
        default:
          this.#pushLog(`unrecognized event: ${name}`);
          return this.#view();
      }
    }
    if (message.kind === "EffectResult") {
      const { outcome } = message.result;
      const detail = outcome.kind === "Success" ? `status ${outcome.status}`
        : outcome.kind === "Failure" ? `reason ${outcome.reason}`
        : outcome.kind === "OutcomeUnknown" ? outcome.reason
        : "";
      this.#pushLog(`← EffectResult ${outcome.kind}${detail ? ` (${detail})` : ""}`);
      if (message.result.correlationId === this.#cancellableId) this.#cancellableId = null;
      return this.#view();
    }
    return this.#view();
  }
}

// Demo-only: fake fetch so this page needs no server. BrowserKernel's own
// fetch/timeout/AbortController/classification logic is exercised for real —
// only the network layer underneath it is simulated.
const realFetch = window.fetch?.bind(window);
window.fetch = async (url, init) => {
  if (url === "/demo/success") return { status: 200, json: async () => ({ message: "hello from the (fake) server" }) };
  if (url === "/demo/network-failure") throw new Error("simulated DNS failure");
  if (url === "/demo/invalid-response") return { status: 200, json: async () => { throw new Error("not valid JSON"); } };
  if (url === "/demo/hang") {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error(String(init.signal?.reason))));
    });
  }
  if (realFetch) return realFetch(url, init);
  throw new Error(`kitchen-sink.js: no fake handler for ${url}`);
};

const diagnosticsEl = document.getElementById("diagnostics");
const diagnosticsLines = [];
const diagnosticsSink = {
  report(event) {
    const stamp = new Date().toISOString().slice(11, 19);
    const line = event.kind === "BridgeError"
      ? `[${stamp}] BridgeError (${event.phase}): ${event.detail}`
      : `[${stamp}] EffectTiming ${event.correlationId}: ${event.durationMs.toFixed(1)}ms`;
    diagnosticsLines.unshift(line);
    diagnosticsLines.length = Math.min(diagnosticsLines.length, 12);
    diagnosticsEl.textContent = diagnosticsLines.join("\n");
  },
};

const kernel = new BrowserKernel(new KitchenSinkEngine(), document, diagnosticsSink);
await kernel.start();
