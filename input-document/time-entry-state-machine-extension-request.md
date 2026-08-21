# Extension request from a consuming application: time-entry-state-machine

Filed by: an agent building `time-entry-state-machine`
(`~/dev/time-entry-state-machine`), the first real consumer of this kernel
beyond its own reference "email availability" example. Consumer-side
decision records with full rationale: `research/decisions/DF-TE-2026-A001--wasm-interop-approach.md`
and `research/decisions/DF-TE-2026-A002--persistence-phasing.md` in that
repository.

This is a concrete, evidence-based request, filed per this repository's own
stated policy in `docs/ROADMAP.md` ("building ahead of a real requirement is
itself an architecture violation here... building on request is expected;
building speculatively is not"). Both items below are blocking a real
application, not speculative.

No code in this repository was changed to produce this document — it is a
request for a future work session in this repository to evaluate and, if
accepted, implement.

## Context: what the consumer is building

A time-entry application where an F# domain (`f-sharp/src/TimeEntry.Domain`
in the consumer repo — already implemented and tested, 13/13 specs passing)
compiles to `browser-wasm` and drives the UI through this kernel's
`BrowserKernel` + a custom `EngineTransport` implementation. That transport
implementation itself needs no kernel change — `EngineTransport` is already
the documented swap point. Two other things are blocked, both below.

## Request 1: extend the `Http` effect (method, headers, body)

**Current state** (`src/protocol.ts`):

```ts
export type EffectRequest = {
  readonly kind: "Http";
  readonly correlationId: CorrelationId;
  readonly method: "GET";
  readonly url: string;
  readonly timeoutMs: number;
};
```

`BrowserKernel.#runHttp` (`src/kernel/browser-kernel.ts`) calls
`fetch(effect.url, { method: effect.method, signal: controller.signal,
headers: { accept: "application/json" } })` — no request body, no
caller-supplied headers, and `method` is constrained to the literal `"GET"`
at the type level.

**Concrete need**: the consumer's `prompts/05-github-persistence-specification.md`
specifies persisting time-entry documents via the GitHub Contents API —
`PUT /repos/{owner}/{repo}/contents/{path}` with an `Authorization` header
and a JSON body containing the new content and the expected blob SHA (for
optimistic concurrency — see the consumer's ADR-010 "GitHub persistence uses
optimistic concurrency"). That request shape is not reachable through the
current `Http` effect at all: not through a kernel-type workaround, since
`#runHttp`'s actual `fetch()` call has no path for a body or extra headers
regardless of what `method` string it receives.

**Proposed shape** (illustrative, not prescriptive — this repository owns
the actual design):

```ts
export type EffectRequest = {
  readonly kind: "Http";
  readonly correlationId: CorrelationId;
  readonly method: "GET" | "PUT" | "POST" | "PATCH" | "DELETE";
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string; // pre-serialized by the engine; kernel does not interpret it
  readonly timeoutMs: number;
};
```

Consistent with this repository's existing "the kernel classifies
transport-level outcomes only, never business meaning" rule
(`#runHttp`'s doc comment) and `architecture.yaml`'s
`effects.representation: explicit` — the kernel would still only classify
`Success`/`Failure`/`Cancelled`/`OutcomeUnknown` at the transport level; it
would not interpret GitHub's response body or status codes as domain
meaning. `body` should be an already-serialized string (or left as `unknown`
matching `EffectOutcome.body`) so the engine remains the only party that
understands JSON shape, per `docs/ROADMAP.md` item 12's existing
serialization-boundary reasoning.

Secrets handling note: the consumer's `prompts/09-security-trust-boundaries.md`
requires that credentials never be logged and that the initial experiment
use a narrowly scoped token. Wherever the token is held (engine-provided
header value vs. some other injection point) is this repository's call, but
please treat it explicitly rather than as a "just another header string" —
a diagnostics sink that ever echoes headers would be a real credential leak.

## Request 2: a `Storage` effect kind (get / set / remove)

**Current state**: `docs/ROADMAP.md` item 18 ("Storage adapters") is marked
🧊 Deferred with no effect kind at all. `EffectRequest`'s only member today
is `{kind: "Http", ...}`.

**Concrete need**: per the consumer's `DF-TE-2026-A002`, the first
persistence adapter is deliberately `localStorage`-backed (not GitHub yet —
smallest reversible choice, see that decision record for the full
rationale), specifically *because* GitHub writes aren't reachable yet
(Request 1). But per this kernel's own architecture rule — WASM must not
call browser APIs directly; the bridge owns browser mechanics
(`prompts/dependency-minimal-browser-kernel-architecture-policy.md` §4.3/
§11.7 in this repo, mirrored in the consumer's `prompts/03-wasm-typescript-interface-contract.md`
§8) — even `localStorage` access from the F# engine needs to go through an
explicit effect, not a TypeScript-side workaround bolted onto the UI layer.
Right now there is no effect kind for that at all, so the "smallest
reversible" persistence choice is *also* blocked without this.

**Proposed shape** (illustrative):

```ts
export type EffectRequest =
  | { readonly kind: "Http"; /* ... per Request 1 ... */ }
  | {
      readonly kind: "Storage";
      readonly correlationId: CorrelationId;
      readonly operation: "get" | "set" | "remove";
      readonly key: string;
      readonly value?: string; // present for "set"
    };
```

Result side would need a matching `StorageResult` variant in `EffectResult`,
with an outcome model that at minimum distinguishes success from failure —
whether `OutcomeUnknown` is meaningful for synchronous `localStorage` (it
generally isn't, except perhaps a `QuotaExceededError` mid-write) is this
repository's call; the consumer's own decision record (`DF-TE-2026-A002`,
"Consequences") flags that it should be classified deliberately rather than
assumed away, but doesn't mandate a specific shape.

## What is *not* being requested

- No change to `EngineTransport`, `BrowserKernel`, or the `data-*` binding
  vocabulary — the consumer's WASM-transport need is fully served by
  implementing `EngineTransport` itself, which is already the documented
  extension point. If this repository wants a documented example transport
  (analogous to `DirectTypeScriptTransport`/`ReferenceEngine` today) that
  loads a `dotnet.js`-style WASM runtime, that would be a nice-to-have this
  repository could offer back once the consumer's implementation is working
  — not something being asked for now.
- No general HTTP client/service-layer abstraction (retries, caching,
  batching) — the consumer's own service layer (`prompts/04-service-layer-contract.md`)
  owns that; the kernel effect stays a single request/single result
  primitive, matching `docs/ROADMAP.md`'s "Effect orchestration" invariant.
- No authentication framework — just the ability to attach a caller-supplied
  header to one request.

## Suggested acceptance evidence

Mirroring this repository's own testing conventions
(`test/kernel.test.ts` against real jsdom): tests for each new `method`
value actually reaching `fetch()` with the right method/headers/body; a
`Storage` effect round-trip (`set` then `get` returns the same value,
`remove` then `get` reports absence) against a real or jsdom-provided
`localStorage`; and confirmation that `scripts/check-architecture.ts` still
passes (no new browser dependency leaking into `src/engine/**`).
