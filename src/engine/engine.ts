import { eventToCommand, initialState, transition, type Command, type State } from "./domain.js";
import { PROTOCOL_VERSION, type BrowserToEngineMessage, type CorrelationId, type EngineToBrowserMessage, type ViewState } from "../protocol.js";

const assertNever = (value: never): never => { throw new Error(`Unhandled state: ${JSON.stringify(value)}`); };

export function project(state: State): ViewState {
  switch (state.kind) {
    case "Empty": return { statusText: "", submitDisabled: false };
    case "Editing": return { statusText: "Ready to check.", submitDisabled: false };
    case "Invalid": return { statusText: state.reason, submitDisabled: false };
    case "Checking": return { statusText: "Checking…", submitDisabled: true };
    case "Available": return { statusText: `${state.email} is available.`, submitDisabled: false };
    case "Unavailable": return { statusText: `${state.email} is already in use.`, submitDisabled: false };
    case "CheckFailed": return { statusText: "The availability check failed.", submitDisabled: false };
    case "OutcomeUnknown": return { statusText: "The result is uncertain; reconciliation is required.", submitDisabled: true };
    default: return assertNever(state);
  }
}

export class ReferenceEngine {
  #state: State = initialState();
  #sequence = 0;

  get state(): State { return this.#state; }

  handle(message: BrowserToEngineMessage): EngineToBrowserMessage {
    if (message.kind === "Initialize") {
      if (message.protocolVersion !== PROTOCOL_VERSION) throw new Error("Unsupported protocol version");
      return { view: project(this.#state), effects: [], cancellations: [] };
    }
    const command: Command = message.kind === "Event"
      ? eventToCommand(message.event, this.#nextCorrelationId())
      : { kind: "RecordAvailability", correlationId: message.result.correlationId, outcome: message.result.outcome };
    const result = transition(this.#state, command);
    this.#state = result.state;
    return { view: project(this.#state), effects: result.accepted ? result.effects : [], cancellations: [] };
  }

  #nextCorrelationId(): CorrelationId {
    this.#sequence += 1;
    return `email-check-${this.#sequence}` as CorrelationId;
  }
}
