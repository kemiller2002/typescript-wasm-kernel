import type { CorrelationId, EffectOutcome, EffectRequest, SemanticEvent } from "../protocol.js";

export type EmailAddress = string & { readonly __emailAddress: unique symbol };

export type State =
  | { readonly kind: "Empty"; readonly version: number }
  | { readonly kind: "Editing"; readonly email: string; readonly version: number }
  | { readonly kind: "Invalid"; readonly email: string; readonly reason: string; readonly version: number }
  | { readonly kind: "Checking"; readonly email: EmailAddress; readonly correlationId: CorrelationId; readonly version: number }
  | { readonly kind: "Available"; readonly email: EmailAddress; readonly version: number }
  | { readonly kind: "Unavailable"; readonly email: EmailAddress; readonly version: number }
  | { readonly kind: "CheckFailed"; readonly email: EmailAddress; readonly retryable: boolean; readonly version: number }
  | { readonly kind: "OutcomeUnknown"; readonly email: EmailAddress; readonly obligation: "ReconcileAvailability"; readonly version: number };

export type Command =
  | { readonly kind: "CommitEmail"; readonly value: string }
  | { readonly kind: "CheckAvailability"; readonly capability: "Http"; readonly correlationId: CorrelationId }
  | { readonly kind: "RecordAvailability"; readonly correlationId: CorrelationId; readonly outcome: EffectOutcome };

export type TransitionError =
  | { readonly kind: "IllegalFromCurrentState" }
  | { readonly kind: "StaleEffectResult" }
  | { readonly kind: "InvalidEmail"; readonly reason: string };

export type TransitionResult =
  | { readonly accepted: true; readonly state: State; readonly effects: readonly EffectRequest[] }
  | { readonly accepted: false; readonly state: State; readonly error: TransitionError };

const accepted = (state: State, effects: readonly EffectRequest[] = []): TransitionResult => ({ accepted: true, state, effects });

export const initialState = (): State => ({ kind: "Empty", version: 0 });

export function decodeEmail(value: string): EmailAddress | null {
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized as EmailAddress : null;
}

// The bridge forwards event names verbatim from `data-event` attributes; this
// is the one place that vocabulary is closed and validated against the
// domain's own commands.
export function eventToCommand(event: SemanticEvent, correlationId: CorrelationId): Command {
  switch (event.name) {
    case "emailChanged": return { kind: "CommitEmail", value: event.value ?? "" };
    case "checkAvailability": return { kind: "CheckAvailability", capability: "Http", correlationId };
    default: throw new Error(`Unrecognized event: ${event.name}`);
  }
}

export function transition(state: State, command: Command): TransitionResult {
  switch (command.kind) {
    case "CommitEmail": {
      const value = command.value.trim();
      return accepted(value === "" ? { kind: "Empty", version: state.version + 1 } : { kind: "Editing", email: value, version: state.version + 1 });
    }
    case "CheckAvailability": {
      if (state.kind !== "Editing" && state.kind !== "Invalid" && state.kind !== "CheckFailed") {
        return { accepted: false, state, error: { kind: "IllegalFromCurrentState" } };
      }
      const email = decodeEmail(state.email);
      if (email === null) {
        const invalid: State = { kind: "Invalid", email: state.email, reason: "Enter a valid email address.", version: state.version + 1 };
        return { accepted: false, state: invalid, error: { kind: "InvalidEmail", reason: invalid.reason } };
      }
      const next: State = { kind: "Checking", email, correlationId: command.correlationId, version: state.version + 1 };
      return accepted(next, [{ kind: "Http", correlationId: command.correlationId, method: "GET", url: `/api/email-availability?email=${encodeURIComponent(email)}`, timeoutMs: 5000 }]);
    }
    case "RecordAvailability": {
      if (state.kind !== "Checking" || state.correlationId !== command.correlationId) {
        return { accepted: false, state, error: { kind: "StaleEffectResult" } };
      }
      switch (command.outcome.kind) {
        case "Success": {
          const body = command.outcome.body;
          if (typeof body !== "object" || body === null || !("available" in body) || typeof body.available !== "boolean") {
            return accepted({ kind: "CheckFailed", email: state.email, retryable: false, version: state.version + 1 });
          }
          return accepted(body.available
            ? { kind: "Available", email: state.email, version: state.version + 1 }
            : { kind: "Unavailable", email: state.email, version: state.version + 1 });
        }
        case "Failure": return accepted({ kind: "CheckFailed", email: state.email, retryable: command.outcome.reason === "network", version: state.version + 1 });
        // This domain never requests cancellation, but the protocol allows a
        // transport to report one anyway (e.g. a page navigating away
        // mid-check). No evidence was gathered either way, so this is not a
        // failure: return to an editable state rather than surfacing an error.
        case "Cancelled": return accepted({ kind: "Editing", email: state.email, version: state.version + 1 });
        case "OutcomeUnknown": return accepted({ kind: "OutcomeUnknown", email: state.email, obligation: "ReconcileAvailability", version: state.version + 1 });
      }
    }
  }
}
