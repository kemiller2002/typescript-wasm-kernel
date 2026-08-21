import type { BrowserToEngineMessage, EngineToBrowserMessage, EngineTransport } from "../protocol.js";
import { ReferenceEngine } from "./engine.js";

export class DirectTypeScriptTransport implements EngineTransport {
  readonly #engine = new ReferenceEngine();
  async start(): Promise<void> {}
  async dispatch(message: BrowserToEngineMessage): Promise<EngineToBrowserMessage> {
    return this.#engine.handle(message);
  }
}
