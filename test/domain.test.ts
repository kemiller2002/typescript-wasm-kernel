import assert from "node:assert/strict";
import test from "node:test";
import { eventToCommand, initialState, transition, type State } from "../src/engine/domain.ts";
import type { CorrelationId, SemanticEvent } from "../src/protocol.ts";

const id = "test-1" as CorrelationId;

test("email check follows an explicit legal transition", () => {
  const edited = transition(initialState(), { kind: "CommitEmail", value: "Person@Example.com" });
  assert.equal(edited.state.kind, "Editing");
  const checking = transition(edited.state, { kind: "CheckAvailability", capability: "Http", correlationId: id });
  assert.equal(checking.accepted, true);
  assert.equal(checking.state.kind, "Checking");
  assert.equal(checking.accepted && checking.effects[0]?.kind, "Http");
});

test("raw response is decoded before it becomes authoritative state", () => {
  const checking: State = { kind: "Checking", email: "person@example.com" as never, correlationId: id, version: 2 };
  const result = transition(checking, { kind: "RecordAvailability", correlationId: id, outcome: { kind: "Success", status: 200, body: { available: "yes" } } });
  assert.equal(result.state.kind, "CheckFailed");
});

test("a timeout after dispatch preserves uncertainty and creates an obligation", () => {
  const checking: State = { kind: "Checking", email: "person@example.com" as never, correlationId: id, version: 2 };
  const result = transition(checking, { kind: "RecordAvailability", correlationId: id, outcome: { kind: "OutcomeUnknown", reason: "timeout-after-dispatch" } });
  assert.deepEqual(result.state, { kind: "OutcomeUnknown", email: "person@example.com", obligation: "ReconcileAvailability", version: 3 });
});

test("stale effect evidence cannot overwrite newer state", () => {
  const checking: State = { kind: "Checking", email: "person@example.com" as never, correlationId: id, version: 2 };
  const result = transition(checking, { kind: "RecordAvailability", correlationId: "other" as CorrelationId, outcome: { kind: "Success", status: 200, body: { available: true } } });
  assert.equal(result.accepted, false);
  assert.equal(result.state, checking);
  assert.equal(!result.accepted && result.error.kind, "StaleEffectResult");
});

test("checking is illegal without a committed email", () => {
  const result = transition(initialState(), { kind: "CheckAvailability", capability: "Http", correlationId: id });
  assert.equal(result.accepted, false);
  assert.equal(result.state.kind, "Empty");
});

test("a bridge event maps to its command through the domain's own closed vocabulary", () => {
  const event: SemanticEvent = { kind: "Event", name: "emailChanged", value: "person@example.com" };
  assert.deepEqual(eventToCommand(event, id), { kind: "CommitEmail", value: "person@example.com" });
});

test("an event name outside the domain's vocabulary is rejected rather than silently ignored", () => {
  const event: SemanticEvent = { kind: "Event", name: "somethingElse" };
  assert.throws(() => eventToCommand(event, id));
});
