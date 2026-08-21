import { DirectTypeScriptTransport } from "./engine/transport.js";
import { BrowserKernel } from "./kernel/browser-kernel.js";

const kernel = new BrowserKernel(new DirectTypeScriptTransport(), document);
void kernel.start();
