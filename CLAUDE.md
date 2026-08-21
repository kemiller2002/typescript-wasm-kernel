# Working in this repository

Start here. This file is the on-ramp; it points to the detailed docs rather
than duplicating them. If something here and a linked doc disagree, the doc
is more likely current — but treat that as a bug to fix (in whichever file
is stale), not something to silently pick a side on.

## What this is

A dependency-minimal reference implementation of a browser architecture
where **the browser renders and interacts; the application engine owns
meaning**. The engine is TypeScript today (`src/engine/`) and is designed to
be replaceable by a real WASM engine (F#/C#/Rust/Kotlin/Java) without
changing the bridge. See `prompts/*.md` for the full specifications this
repo implements — read `prompts/README.md` first for how the three files
relate, including a documented disagreement between two of them (see
"Known contradictions" below).

## The one rule that matters most

```text
src/kernel/   →  browser mechanism only (DOM, fetch, events, timers)
src/protocol.ts → the wire contract: plain, JSON-serializable data only
src/engine/   →  application meaning only (state, transitions, validation)
```

`src/engine/**` must never reference `document`, `window`, `fetch`,
`localStorage`, `sessionStorage`, or use `any`/`dynamic` typing —
`scripts/check-architecture.ts` mechanically enforces this substring/word
ban and runs as part of `npm test`. `src/kernel/**` is the only place
allowed to touch the browser. If you find yourself writing a `switch` on
business meaning in `src/kernel/`, or a DOM call in `src/engine/`, stop —
that's the boundary breaking, not a shortcut.

`architecture.yaml` states the intended contract; its header comment says
plainly which parts of it are actually mechanically checked vs. enforced
only by TypeScript's compiler or code review. Don't assume a claim there is
automated just because it's written down.

## Before writing any feature

For every meaningful change, work out — briefly, in your own reasoning, not
necessarily as a committed artifact — the same shape the architecture specs
require:

```text
Feature:
Authoritative state:        (what part of src/engine/domain.ts owns this?)
Relevant states:            (what union members already exist / are needed?)
Legal transitions:          (what commands cause what state changes?)
Invariants:                 (what must always remain true?)
Capabilities:                (what can the UI do in each state — projected, not reconstructed by the DOM)
Inputs:                     (SemanticEvent shape — name/key/value)
Outputs/projections:        (ViewState keys the engine will produce)
External effects:           (EffectRequest — and all four EffectOutcome variants: Success/Failure/Cancelled/OutcomeUnknown)
Browser responsibilities:   (what's genuinely new data-* wiring vs. reuse of existing primitives)
Kernel responsibilities:    (should almost always be "none — existing primitives cover it")
Engine responsibilities:    (state, transition, projection)
Uncertainties:              (mark explicitly rather than silently guessing)
```

If a change can't be described this way — if it needs a second place to
hold state, or the kernel needs to know what a value *means* rather than
just where to put it — that's a sign the design needs rethinking before
code, not after.

## Where things are

- `src/protocol.ts` — the stable engine↔kernel contract: `SemanticEvent`,
  `ViewState`, `EffectRequest`/`EffectResult`/`EffectOutcome`,
  `EngineTransport`. Read this file first; everything else is built on it.
- `src/kernel/browser-kernel.ts` — the generic declarative bridge. Binds
  `data-event`/`data-text`/`data-bind-<attr>`/`data-if`/`data-each`, executes
  HTTP effects, funnels every engine round-trip through one error-boundary
  chokepoint (`#send`). It does not know what any event name or view key
  means.
- `src/kernel/diagnostics.ts` — injectable `DiagnosticsSink`, bridge-only
  concern (never engine/view state).
- `src/engine/domain.ts` — the one reference feature's authoritative state,
  transitions, and event→command mapping.
- `src/engine/engine.ts` — `ReferenceEngine` (routes messages to
  `transition()`) and `project()` (state → `ViewState`).
- `src/engine/transport.ts` — `DirectTypeScriptTransport`, today's
  in-process stand-in for a real WASM transport.
- `index.html` — the one shipped reference feature (email availability).
- `examples/kitchen-sink.html` + `examples/kitchen-sink.js` — a living,
  interactive reference for every bridge primitive and every
  `EffectOutcome`, driven by a throwaway demo engine (not part of the
  published package).
- `docs/ROADMAP.md` — status of every bridge responsibility against what's
  actually implemented and tested. Read this before assuming something is
  missing or done.
- `docs/USAGE.md` — step-by-step for *consuming* the published package in
  another project.
- `test/domain.test.ts` — pure engine-logic tests, run directly against
  `src/*.ts` (their only import from `protocol.ts` is type-only, so no build
  is required first).
- `test/kernel.test.ts` — bridge tests against a real DOM (`jsdom`, a
  devDependency only, justified in the roadmap and this file's own header
  comment: `BrowserKernel`'s constructor has a real runtime import from
  `protocol.ts`, so it — unlike `domain.ts` — must be imported from `dist/`,
  not `src/`, when tests run directly via
  `node --experimental-strip-types`. That's why `pretest` builds first.

## Commands

```bash
npm run build              # tsc → dist/
npm run check:architecture # scripts/check-architecture.ts
npm test                   # pretest (build) → check:architecture → node --test
npm run check              # alias for npm test (pretest already builds)
```

Always run `npm run check` (or `npm test`) before considering a change
done — not just `tsc`. The architecture check and the kernel tests both
require a fresh `dist/`; `pretest` handles that automatically.

## Testing conventions

- Test state and transitions, not implementation details (per
  `prompts/zero-authoritative-javascript-web-architecture-spec-v0.1.md`'s
  Testing section): given state X and evidence Y, command Z legally
  transitions to state A and produces projection/effect B. Also test the
  illegal case.
- `kernel.test.ts` uses a `ScriptedTransport` test double and asserts both
  on what was dispatched (`transport.calls`) and on resulting DOM state.
  Note the two different timing regimes documented at the top of that file:
  an assertion on `transport.calls` right after a synchronous DOM event is
  safe immediately (the push happens synchronously inside the click's own
  call chain); an assertion on *applied* DOM state after a click-triggered
  re-projection needs `await flush()` first, since applying the response
  happens after a microtask boundary. Getting this wrong produces tests
  that pass for the wrong reason or fail flakily — read the existing tests
  before adding new ones in this style.
- Never call `kernel.start()` more than once in a test to simulate a new
  projection — it re-binds the DOM and double-registers listeners. Trigger
  a later projection through a real event round-trip instead (see the
  `tick()` helper in `kernel.test.ts`).

## Known contradictions (documented, not silently resolved)

- `prompts/minimal-typescript-browser-kernel-responsibility-spec.md` §36
  specifies an imperative `ViewChange[]`/element-id protocol. The other
  prompt spec, and this implementation, use a declarative `ViewState` +
  `data-*` binding model instead. See `docs/ROADMAP.md` for the full note.
- `architecture.yaml` documents its own enforcement gap in its header
  comment as of this writing — check it hasn't drifted from
  `scripts/check-architecture.ts` again before trusting it at face value.

## Definition of done

A change is not done because the UI appears to work. It's done when:
authoritative state and legal transitions are explicit; illegal transitions
are rejected (and tested); required capabilities are explicit in the
projection, not reconstructed by the DOM; effect outcomes are represented
for all four cases; kernel and engine responsibilities stayed separated (no
new business logic leaked into `src/kernel/`); no unnecessary dependency was
introduced (or, if one was, it's justified against
`prompts/dependency-minimal-browser-kernel-architecture-policy.md` §8 and
noted in the relevant doc); `npm run check` passes; and — for anything
touching the DOM — it's been exercised in a real browser, not just asserted
in jsdom.
