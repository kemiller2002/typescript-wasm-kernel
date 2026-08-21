export { BrowserKernel } from "./kernel/browser-kernel.js";
export { DirectTypeScriptTransport } from "./engine/transport.js";
export { ReferenceEngine, project } from "./engine/engine.js";
export { PROTOCOL_VERSION } from "./protocol.js";

export type {
  BrowserToEngineMessage,
  CorrelationId,
  EffectOutcome,
  EffectRequest,
  EffectResult,
  EngineToBrowserMessage,
  EngineTransport,
  SemanticEvent,
  ViewItem,
  ViewPrimitive,
  ViewState,
  ViewValue,
} from "./protocol.js";

export type {
  Command,
  EmailAddress,
  State,
  TransitionError,
  TransitionResult,
} from "./engine/domain.js";
