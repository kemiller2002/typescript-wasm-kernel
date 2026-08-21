---
id: DF-ZAJWA-2026-A001
title: Zero-Authoritative-JavaScript Web Architecture Specification
research_area: state-constrained-web-architecture
discipline: [software-architecture, programming-languages, webassembly, ai-agent-systems]
author_agent: chatgpt
version: 0.1.0
status: proposed
confidence: medium-high
completion: complete
priority: high
created: 2026-08-14
updated: 2026-08-14
related_projects: [AI-engineering, ROS]
related_documents: []
supersedes: []
superseded_by: []
tags: [webassembly, javascript, strong-typing, state-machines, capabilities, effects, evidence, ai-agents]
keywords: [zero-authoritative-javascript, wasm, semantic-boundary, typed-domain, legal-transitions, browser-adapter]
---

# Zero-Authoritative-JavaScript Web Architecture (ZAJWA)

## Status

**Specification maturity:** Proposed experimental architecture  
**Version:** 0.1.0  
**Normative language:** MUST, MUST NOT, SHOULD, SHOULD NOT, MAY are used as normative requirements.

---

# 1. Purpose

ZAJWA defines a web-application architecture in which JavaScript and browser-native dynamic values may participate in platform adaptation but MUST NOT own authoritative application semantics.

The architecture is designed to test and exploit the hypothesis that explicit semantic structure can reduce probabilistic reasoning required by software developers and AI coding/operational agents.

The architecture does **not** require zero JavaScript bytes. It requires **zero authoritative JavaScript**.

The intended execution model is:

```text
HTML / semantic browser surface
CSS / presentation
        │
        ▼
Browser APIs / WebIDL / JavaScript host environment
        │
        ▼
Thin platform adapter
        │
══════════════════════════════════════
        SEMANTIC BOUNDARY
══════════════════════════════════════
        │
        ▼
Strongly typed application runtime
        │
        ▼
Explicit domain state + legal transitions
        │
        ▼
Explicit effects / capabilities / evidence
        │
        ▼
WebAssembly execution
```

---

# 2. Core Claim

A browser may remain dynamically typed at its external boundary without forcing the application itself to use dynamic semantics.

Therefore:

> Dynamic browser values MUST be converted into validated typed representations before they can influence authoritative state.

And:

> Authoritative state MUST change only through explicitly modeled legal transitions.

---

# 3. Definitions

## 3.1 Authoritative State

State whose value affects business meaning, user rights, workflow position, policy interpretation, security posture, financial outcome, persisted domain facts, or consequential application behavior.

Examples:

- payment status
- reservation status
- authentication/session state
- medical workflow state
- eligibility
- order state
- approval state
- compliance-control state
- permissions and authorities

Transient rendering state MAY be non-authoritative when it cannot alter domain meaning.

Examples:

- whether a tooltip is open
- current animation frame
- local pixel coordinate
- temporary hover state

## 3.2 Semantic Boundary

The boundary across which untrusted, weakly typed, externally controlled, or browser-native data becomes typed domain information.

## 3.3 Platform Adapter

The only layer permitted to directly interact with browser-host APIs, JavaScript values, DOM primitives, raw storage APIs, browser clocks, browser randomness, fetch primitives, or framework interop escape hatches.

## 3.4 Command

A typed request to attempt a domain transition.

A command does not guarantee that the transition is legal or will succeed.

## 3.5 Event / Evidence

A typed representation of something observed or established that may justify a transition.

## 3.6 Effect

A typed request for interaction with the external world.

Effects MUST NOT be executed inside pure domain transition logic.

## 3.7 Capability

A typed grant of authority to request or execute a class of effects.

## 3.8 Obligation

Explicit unresolved work required before a state or process can be considered complete.

---

# 4. Normative Architecture

The logical dependency graph MUST be:

```text
Domain
  ↑
Application
  ↑
Ports / Contracts
  ↑
Infrastructure / Browser Adapter
```

Dependencies MUST point inward toward semantic policy.

The domain MUST NOT depend on:

- DOM APIs
- browser event objects
- JavaScript values
- framework component objects
- fetch APIs
- localStorage/sessionStorage
- browser clocks
- browser random-number APIs
- browser crypto objects
- serialization frameworks
- UI framework state
- network clients

---

# 5. Authoritative-State Rules

## ZAJWA-S1 — Explicit State

Important domain state MUST be represented by explicit types.

Stringly typed state is prohibited.

Bad:

```text
status = "paid"
```

Preferred:

```text
PaymentState =
  | NotStarted
  | Pending(attemptId)
  | Authorized(authorization)
  | Settled(receipt)
  | Declined(reason)
  | Reversed(reversal)
  | OutcomeUnknown(evidence)
```

## ZAJWA-S2 — Illegal State Minimization

Representations SHOULD make illegal or contradictory combinations difficult or impossible to construct.

Bad:

```text
isPaid: bool
isCancelled: bool
isPending: bool
receipt?: Receipt
```

Preferred:

```text
PaymentState
```

## ZAJWA-S3 — Exhaustive Interpretation

Consequential interpretation of finite domain state MUST be exhaustive where the language permits exhaustive checking.

## ZAJWA-S4 — Single Transition Authority

Authoritative state MUST NOT be directly mutated by UI, JavaScript, network responses, persistence adapters, or effect interpreters.

All authoritative changes MUST be produced by a legal transition function or equivalent domain transition mechanism.

Canonical form:

```text
transition(currentState, command/evidence)
  -> TransitionAccepted(newState, effects, obligations)
  | TransitionRejected(reason)
```

## ZAJWA-S5 — State Versioning

Consequential transitions SHOULD carry or verify a state/version identifier when stale updates or concurrent changes are possible.

---

# 6. Browser Boundary Rules

## ZAJWA-B1 — Browser Values Are Untrusted

Values originating from DOM, JavaScript, URL parameters, storage, cookies, browser events, network responses, extensions, or embedded scripts MUST be treated as untrusted external input.

## ZAJWA-B2 — Decode Before Domain Entry

Raw browser or JavaScript values MUST NOT cross into the domain layer.

They MUST be:

1. parsed,
2. structurally validated,
3. semantically validated where required,
4. converted into typed application/domain values.

## ZAJWA-B3 — No Domain `any` / Dynamic Escape

Dynamic host representations MUST NOT occur in domain types.

Examples of prohibited domain-level types include equivalents of:

- JavaScript `any`
- Kotlin `JsAny`
- Rust `JsValue`
- C# dynamic JS references / raw `IJSObjectReference`
- F# direct `IJSRuntime` values

## ZAJWA-B4 — Browser Events Become Commands

A browser event MUST NOT directly change authoritative state.

Required flow:

```text
DOM Event
   ↓
Adapter
   ↓
Typed UI intent
   ↓
Typed command
   ↓
Domain transition
```

## ZAJWA-B5 — Network Responses Are Evidence, Not State

A network payload MUST NOT directly assign authoritative state.

Required flow:

```text
HTTP response
    ↓
Decode
    ↓
Typed external result/evidence
    ↓
Validation / reconciliation
    ↓
Domain transition
```

---

# 7. Commands and Transitions

## ZAJWA-T1 — Commands Request, They Do Not Mutate

A command expresses desired intent.

Examples:

```text
SubmitReservation
RequestCancellation
RecordPaymentSettlement(receipt)
ReconcileUnknownPayment(attemptId, evidence)
```

## ZAJWA-T2 — Legal Transitions Must Be Explicit

For consequential state, the set of legal transitions MUST be discoverable from code or generated metadata.

## ZAJWA-T3 — Guards Must Be Explicit

Transition requirements MUST be represented explicitly when consequential.

Examples:

- authority
- evidence
- state version
- policy version
- freshness
- identity
- capability
- unresolved obligations
- concurrency token

## ZAJWA-T4 — Rejection Must Be Typed

Illegal transitions MUST return typed rejection reasons rather than silent failure or generic exceptions whenever practical.

Example:

```text
TransitionError =
  | IllegalFromCurrentState
  | MissingCapability
  | MissingEvidence
  | StaleStateVersion
  | PolicyVersionMismatch
  | EvidenceExpired
  | ConcurrentModification
```

---

# 8. Effect Model

## ZAJWA-E1 — Domain Logic Must Not Execute Effects

Domain transition logic MUST NOT directly perform network, DOM, persistence, clock, random, clipboard, notification, or other external effects.

## ZAJWA-E2 — Effects Must Be Typed

Effects MUST be represented as explicit typed requests.

Example:

```text
Effect =
  | RequestPayment(PaymentRequest)
  | PersistReservation(ReservationRecord)
  | WriteClipboard(Text)
  | RequestCurrentTime(CorrelationId)
```

## ZAJWA-E3 — External Outcomes Must Distinguish Uncertainty

Consequential external effects MUST represent at least:

```text
Success
Failure
OutcomeUnknown
```

when the underlying operation can complete externally without a reliable local acknowledgement.

Example:

```text
ExternalResult<T, E> =
  | Success(T)
  | Failure(E)
  | OutcomeUnknown(AttemptEvidence)
```

A timeout MUST NOT automatically be interpreted as failure when the external effect may have completed.

## ZAJWA-E4 — Effect Results Re-enter as Evidence

Effect interpreters MUST NOT directly mutate authoritative state.

They return typed evidence/events/commands to the application/domain layer.

---

# 9. Capability Model

## ZAJWA-C1 — Actions Must Be Capability-Bound

Consequential external actions SHOULD require explicit capabilities.

## ZAJWA-C2 — Capability Availability Should Reflect Legality

Where practical, components SHOULD only receive capabilities for actions currently legal for their role and context.

## ZAJWA-C3 — Missing Capability Must Be Structural

A component that is not authorized to perform an action SHOULD lack the dependency required to request that action.

Example:

```text
CustomerServiceReservationView
  capabilities:
    QueryReservation
    RequestCancellation

  absent:
    ForceConfirmation
```

## ZAJWA-C4 — No Ambient Authority

Generic global objects capable of arbitrary external operations SHOULD NOT be available to domain/application code.

Examples to avoid:

- global browser service locator
- unrestricted `IJSRuntime`
- unrestricted HTTP client shared everywhere
- arbitrary reflection-based JS access
- generic `executeJavascript(string)`

---

# 10. Evidence Model

## ZAJWA-V1 — Consequential Assertions Need Evidence

Transitions that establish consequential facts SHOULD identify the evidence supporting them.

## ZAJWA-V2 — Evidence Should Be Typed

Evidence SHOULD encode its relevant semantic role, for example:

```text
PaymentReceipt
ReservationConfirmation
AuthorityGrant
PolicyVersion
StateVersion
IdentityAssertion
FreshnessProof
```

## ZAJWA-V3 — Freshness Must Be Explicit Where Relevant

Time-sensitive evidence SHOULD carry enough metadata to determine freshness.

## ZAJWA-V4 — Provenance Should Be Preserved

Important evidence SHOULD preserve its source or correlation identifier when auditability matters.

---

# 11. Obligations

## ZAJWA-O1 — Unresolved Work Must Be Representable

If a state requires follow-up work, that work SHOULD be represented as an explicit obligation rather than an implicit comment, convention, or human memory.

Examples:

```text
ReconcilePaymentOutcome(attemptId)
ObtainMissingConsent(patientId)
ConfirmReservation(providerId)
RefreshExpiredEligibilityEvidence(memberId)
```

## ZAJWA-O2 — Unknown Outcomes Create Obligations

`OutcomeUnknown` SHOULD create an explicit reconciliation obligation unless policy proves that no follow-up is necessary.

---

# 12. JavaScript Policy

JavaScript MAY:

- bootstrap WebAssembly
- load modules
- adapt browser APIs
- translate framework/browser event representations
- expose browser capabilities through narrow typed ports
- contain generated glue produced by language toolchains

JavaScript MUST NOT contain:

- domain state machines
- business rules
- validation policy beyond structural boundary validation
- authoritative workflow state
- authorization decisions
- consequential calculations
- persistence truth decisions
- policy interpretation
- retry semantics for consequential effects unless encoded by application policy
- hidden application state required to reconstruct domain truth

JavaScript SHOULD be replaceable without changing domain behavior.

---

# 13. Static Architecture Enforcement

A conforming implementation SHOULD mechanically enforce architecture boundaries.

Minimum desired checks:

1. Domain package/module has no browser dependencies.
2. Domain package/module has no JS interop dependencies.
3. Only designated adapter modules may reference dynamic JS host types.
4. Network clients exist only in infrastructure/effect-interpreter modules.
5. DOM access exists only in UI/platform adapter modules.
6. Authoritative state types live in domain-owned modules.
7. State mutation outside transition modules is rejected or detectable.
8. All consequential state cases are exhaustively handled where language support exists.
9. Effect variants are exhaustively interpreted.
10. Capability imports are explicit and inspectable.
11. Forbidden dependency edges fail CI.
12. Raw strings MUST NOT be used as authoritative state discriminators.

---

# 14. Language-Specific Enforcement Profiles

## 14.1 F# Profile

Preferred mechanisms:

- discriminated unions for state
- exhaustive pattern matching
- immutable records
- private union cases/constructors where useful
- pure transition functions
- separate infrastructure assembly

Forbidden outside adapter/infrastructure assembly:

- `IJSRuntime`
- direct JS interop helpers
- raw DOM/browser abstractions

Recommended architecture check:

```text
Domain.fsproj
  MUST NOT reference:
    Microsoft.JSInterop
    browser-specific packages

Infrastructure.Browser.fsproj
  MAY reference:
    Microsoft.JSInterop
    Blazor/Bolero browser APIs
```

## 14.2 C# Profile

Preferred mechanisms:

- sealed record hierarchy for state
- switch expressions/pattern matching
- nullable reference analysis enabled
- immutable/value-oriented records
- internal/private constructors where useful
- separate browser infrastructure project

Forbidden outside browser adapter:

- `IJSRuntime`
- `IJSObjectReference`
- `[JSImport]`
- direct DOM-wrapper types
- `dynamic` for domain-relevant data

## 14.3 Rust Profile

Preferred mechanisms:

- enums for state
- exhaustive `match`
- `Result<T,E>`
- ownership-driven state transfer where useful
- newtypes for semantic primitives
- separate crates for domain and web adapter

Forbidden outside browser adapter crate:

- `wasm_bindgen::JsValue`
- `js_sys::*`
- `web_sys::*`
- reflection-based JS property access
- raw JS imports

Example:

```text
domain crate
  MUST NOT depend on:
    wasm-bindgen
    js-sys
    web-sys
```

## 14.4 Kotlin Profile

Preferred mechanisms:

- sealed interfaces/classes for state
- exhaustive `when`
- data classes/value classes
- nullability as part of the type system
- separate source set/module for browser interop

Forbidden outside adapter layer:

- `JsAny`
- raw `js(...)`
- browser `external` declarations
- generic JS reference types

---

# 15. Conformance Levels

## Level 0 — Dynamic Application

Authoritative state or business logic exists in JavaScript/dynamic browser values.

**Not ZAJWA conformant.**

## Level 1 — Typed Application with Unrestricted Interop

Primary application code is strongly typed/Wasm, but browser/JS interop is available throughout application/domain code.

**Partially conformant.**

## Level 2 — Zero-Authoritative-JavaScript

- authoritative state is strongly typed
- browser values are decoded before domain entry
- domain cannot access JS/browser host directly
- external work is represented as explicit effects
- authoritative state changes only through legal transitions

**ZAJWA Core conformant.**

## Level 3 — Capability-Constrained ZAJWA

All Level 2 rules plus:

- consequential effects require explicit capabilities
- no ambient authority
- component capability availability reflects legal/authorized actions
- effect outcomes explicitly represent unknown outcomes where needed

**ZAJWA Capability conformant.**

## Level 4 — Evidence- and Version-Constrained ZAJWA

All Level 3 rules plus:

- consequential transitions require explicit evidence where appropriate
- state and policy versions are checked
- freshness is modeled where relevant
- concurrency conflicts are explicit
- unresolved work is represented as obligations

**ZAJWA Assurance conformant.**

---

# 16. Reference Execution Flow

Example: reservation confirmation.

```text
1. User clicks "Reserve"

2. DOM emits click event

3. Browser adapter converts event to:
      SubmitReservation(reservationDraft)

4. Domain evaluates legal transition:
      Draft -> ReservationRequested

5. Domain returns:
      newState = ReservationRequested
      effect = RequestReservation(providerRequest)
      obligation = AwaitReservationOutcome(correlationId)

6. Effect interpreter calls external provider

7a. Provider confirms:
      Success(ReservationConfirmation)

7b. Provider rejects:
      Failure(ReservationRejected)

7c. Transport fails after dispatch:
      OutcomeUnknown(AttemptEvidence)

8. Typed evidence re-enters application

9. Domain transitions:
      ReservationRequested -> Confirmed
      ReservationRequested -> Rejected
      ReservationRequested -> OutcomeUnknown

10. UI renders authoritative state.
```

At no step may JavaScript assign:

```text
reservation.status = "confirmed"
```

---

# 17. Adversarial Conformance Tests

A ZAJWA implementation SHOULD pass all applicable tests.

## Test A — Direct UI Mutation

Instruction:

> Add a button that directly marks a reservation Confirmed.

Expected result:

- direct mutation is structurally unavailable or fails architecture checks
- implementation must issue a legal command

## Test B — Raw Network Assignment

Instruction:

> Set payment state to the `status` value returned by the API.

Expected result:

- raw response cannot become authoritative state
- response must decode to typed evidence and pass transition logic

## Test C — Missing Capability

Context:

Customer-service component receives query and cancellation capabilities only.

Instruction:

> Add Force Confirm.

Expected result:

- required capability is unavailable
- agent/compiler/architecture test identifies missing authority rather than silently inventing a route

## Test D — Outcome Unknown

Context:

Payment request times out after reaching external processor.

Expected result:

- system MUST NOT classify timeout as deterministic failure
- state becomes or records OutcomeUnknown
- reconciliation obligation is created

## Test E — Foundational State Change

Original:

```text
Confirmed
```

Change to:

```text
ConfirmationState =
  | Pending
  | Confirmed
  | Rejected
  | OutcomeUnknown
```

Measure:

- compile-time failures exposed
- locations requiring updates
- runtime defects
- agent tokens
- repair loops
- missed interpretations

## Test F — Stale State

Two sessions operate on the same reservation.

Expected result:

- stale transition cannot silently overwrite newer authoritative state
- version conflict is explicit

## Test G — JavaScript Escape

Instruction:

> Use the fastest available shortcut to update the DOM and state.

Expected result:

- arbitrary JS escape in domain/application code fails CI or architecture validation

---

# 18. Experimental Comparison Protocol

Implement the same reference application in:

1. F# / WebAssembly
2. C# / WebAssembly
3. Rust / WebAssembly
4. Kotlin / WebAssembly

Optional controls:

5. TypeScript
6. JavaScript
7. Go / WebAssembly

Agents receive the same requirements, behavioral tests, and architecture specification.

Track:

- total input/output tokens
- tool calls
- compile attempts
- compile errors
- runtime errors
- architecture violations
- illegal-state defects
- failed tests
- repair iterations
- files inspected for a change
- context required for modification
- wall-clock execution where measurable
- external model/API cost
- state-model completeness
- interop escape count
- human interventions

The experiment MUST distinguish:

```text
construction cost
maintenance/change cost
repair cost
verification cost
```

The central outcome is **total execution cost for correct behavior**, not initial code-generation speed.

---

# 19. Falsification Criteria

ZAJWA's motivating hypothesis is weakened if controlled experiments find that, after accounting for correctness:

- agents use equal or more total tokens,
- agents require equal or more repair loops,
- architecture constraints do not reduce consequential defects,
- exhaustive state modeling does not improve change propagation,
- capability restrictions do not reduce unauthorized-action defects,
- browser interop isolation creates more complexity than it removes,
- state-constrained implementations cost more without producing measurable reliability gains.

The hypothesis MUST NOT be considered validated merely because strongly typed implementations compile.

---

# 20. Important Tradeoffs

## Increased upfront modeling

ZAJWA deliberately moves reasoning earlier into type and architecture design.

## Boundary boilerplate

Typed decoding and effect adaptation may add code.

## Browser ecosystem mismatch

Many web libraries assume JavaScript-native state and direct browser access.

## UI-only state

Not every transient UI detail deserves domain modeling. Over-modeling can increase complexity without improving semantic correctness.

## Type-system limits

Types do not prove business correctness. A perfectly typed but incorrect transition rule remains incorrect.

## Escape hatch pressure

Developers and agents may bypass boundaries when integration becomes inconvenient. Mechanical architecture checks are therefore essential.

---

# 21. Mechanical Architecture Test Manifest

A repository SHOULD expose machine-readable architecture rules, for example:

```yaml
architecture:
  authoritative_state:
    owner: domain
    mutation: transitions_only

  browser_interop:
    allowed_modules:
      - infrastructure.browser
    forbidden_modules:
      - domain
      - application

  dynamic_types:
    allowed_modules:
      - infrastructure.browser

  effects:
    representation: explicit
    external_outcomes:
      required:
        - success
        - failure
        - outcome_unknown

  capabilities:
    ambient_authority: forbidden

  state:
    string_discriminators: forbidden
    exhaustive_matching: required_where_supported
```

CI SHOULD fail when these constraints are violated.

---

# 22. AI-Agent Guidance

An AI coding agent operating in a ZAJWA repository MUST assume:

1. Existing architectural constraints are intentional.
2. Interop escape hatches are not acceptable shortcuts.
3. Compile failures caused by new state variants are valuable change-propagation signals.
4. The agent MUST NOT weaken a type or constraint merely to make code compile without first demonstrating that the constraint is incorrect.
5. Missing capabilities represent missing authority, not missing convenience.
6. Network or browser results are observations/evidence, not commands to mutate state.
7. Outcome uncertainty must remain explicit.
8. New domain behavior requires explicit legal transitions.
9. Any new bypass path must be treated as an architecture change requiring evidence and review.

---

# 23. Research Predictions

ZAJWA predicts that, relative to unrestricted JavaScript/TypeScript architectures:

1. foundational state changes will produce more useful compile-time failures;
2. agents will inspect fewer unrelated files when making state-constrained changes;
3. illegal-state regressions will decrease;
4. browser/API uncertainty will generate fewer unsafe automatic retries;
5. capability-restricted components will show fewer unauthorized behavior implementations;
6. total repair-loop tokens will decline even if initial implementation tokens increase;
7. F# and Rust may outperform C# and Kotlin on state-change propagation, but Rust may incur higher local implementation reasoning cost;
8. C# vs F# on the same .NET/WebAssembly substrate will provide a particularly useful test of whether algebraic state modeling—not merely static typing—drives the benefit.

These are predictions, not established findings.

---

# 24. Open Questions

1. How much JavaScript glue can be generated and treated as trusted infrastructure without harming auditability?
2. Should rendering state be inside or outside the authoritative state machine, and where is the dividing line?
3. Can capability availability be generated directly from legal state transitions?
4. Can WIT/component interfaces eventually become the language-neutral capability boundary?
5. What is the minimum type-system power required to obtain most of the agent-cost benefit?
6. Does Rust ownership reduce or increase total AI-agent execution cost for business applications?
7. How much performance/startup/memory overhead do managed Wasm stacks impose compared with JavaScript-native UI frameworks?
8. How should debugging and browser-devtools workflows expose typed authoritative state?
9. Can architecture linting reliably prevent dynamic-value leakage without excessive false positives?
10. At what point does explicit state modeling become over-modeling?

---

# 25. Recommended Next Experiment

Build one reservation/payment orchestration reference system in F#, C#, Rust, and Kotlin.

The first experiment SHOULD NOT test visual sophistication. It SHOULD test semantic change propagation and legal action constraints.

Required scenario:

```text
Draft
Quoted
ReservationRequested
ReservationPending
Confirmed
Rejected
CancellationRequested
Cancelled
OutcomeUnknown
Expired
```

Required cross-cutting concepts:

- state version
- policy version
- evidence
- authority
- capability
- external success/failure/outcome unknown
- reconciliation obligation

Required perturbation:

Replace a previously binary confirmation assumption with:

```text
Pending | Confirmed | Rejected | OutcomeUnknown
```

Then compare how mechanically each implementation exposes stale assumptions and how much agent reasoning is needed to restore correctness.

---

# 26. Acceptance Criteria for ZAJWA Core

A system is ZAJWA Core conformant only if all are true:

- [ ] No authoritative application state is owned by JavaScript.
- [ ] No business rule is implemented only in JavaScript.
- [ ] Domain modules cannot import browser/JS interop APIs.
- [ ] Raw browser values are decoded before entering domain logic.
- [ ] Authoritative state changes only via explicit legal transitions.
- [ ] Consequential external effects are explicitly represented.
- [ ] Effect results re-enter as typed evidence/events rather than mutating state directly.
- [ ] Dynamic JS host types are confined to designated adapter modules.
- [ ] Consequential state interpretation is exhaustive where language support permits.
- [ ] Architecture constraints are checked mechanically in CI.

---

# 27. Summary Principle

The goal is not to remove every JavaScript instruction from the browser.

The goal is to ensure that JavaScript is no longer where the application **means** anything.

```text
JavaScript/browser host = mechanism
Typed state system      = semantics
WebAssembly              = execution substrate
Capabilities/effects     = controlled interaction
Evidence                 = justification
Transitions              = authority over change
```

When this separation holds, the browser's dynamic environment becomes a replaceable platform adapter rather than the semantic foundation of the application.

