export const PROTOCOL_VERSION = 1 as const;

export type CorrelationId = string & { readonly __correlationId: unique symbol };

// `name` is a domain-chosen identifier (the value of a `data-event` attribute).
// The bridge does not know its meaning; only the engine's own event-to-command
// mapping interprets it, the same way it would interpret any other evidence.
export type SemanticEvent = {
  readonly kind: "Event";
  readonly name: string;
  readonly key?: string;
  readonly value?: string;
};

export type EffectOutcome =
  | { readonly kind: "Success"; readonly status: number; readonly body: unknown }
  | { readonly kind: "Failure"; readonly reason: "network" | "aborted" | "invalid-response" }
  | { readonly kind: "Cancelled" }
  | { readonly kind: "OutcomeUnknown"; readonly reason: "timeout-after-dispatch" };

export type EffectResult = {
  readonly kind: "HttpResult";
  readonly correlationId: CorrelationId;
  readonly outcome: EffectOutcome;
};

export type BrowserToEngineMessage =
  | { readonly kind: "Initialize"; readonly protocolVersion: typeof PROTOCOL_VERSION; readonly capabilities: readonly ["Http"] }
  | { readonly kind: "Event"; readonly event: SemanticEvent }
  | { readonly kind: "EffectResult"; readonly result: EffectResult };

// A projection, not the engine's internal state: named values a view may bind
// to via data-text/data-bind-*, and named lists a view may repeat via
// data-each. The bridge resolves these generically; it never knows what a
// key like "statusText" or "customers" means.
export type ViewPrimitive = string | number | boolean;
export type ViewItem = { readonly [field: string]: ViewPrimitive };
export type ViewValue = ViewPrimitive | readonly ViewItem[];
export type ViewState = { readonly [key: string]: ViewValue };

export type EffectRequest = {
  readonly kind: "Http";
  readonly correlationId: CorrelationId;
  readonly method: "GET";
  readonly url: string;
  readonly timeoutMs: number;
};

export type EngineToBrowserMessage = {
  readonly view: ViewState;
  readonly effects: readonly EffectRequest[];
  // Correlation IDs of previously requested effects the engine no longer
  // needs the result of. The kernel executes cancellation; only the engine
  // decides when an in-flight effect is no longer wanted.
  readonly cancellations: readonly CorrelationId[];
};

export interface EngineTransport {
  start(): Promise<void>;
  dispatch(message: BrowserToEngineMessage): Promise<EngineToBrowserMessage>;
}
