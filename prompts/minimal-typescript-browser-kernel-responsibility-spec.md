# Minimal TypeScript Browser Kernel — Responsibility Specification

Status: Working architecture note
Purpose: Define what JavaScript/TypeScript should and should not own in a browser application where authoritative application semantics live behind a stable engine interface, potentially implemented in WebAssembly.

## 1. Architectural Goal

The browser application is split into four major concerns:

HTML  → semantic document structure
CSS   → presentation and purely visual interaction
TypeScript Browser Kernel → browser mechanism
Application Engine → application semantics

The application engine may initially be written in TypeScript and later replaced by:

- C# / .NET WebAssembly
- F# / .NET WebAssembly
- Rust WebAssembly
- Kotlin WebAssembly
- Java WebAssembly
- other compatible implementations

The browser kernel MUST NOT depend on which language implements the engine.

Governing principle:

JavaScript/TypeScript may provide mechanism, but it must not own application meaning.

## 2. Core Architecture

Native Browser

HTML                  CSS
 │                     │
 └──── native UI ──────┘
          │
     browser events
          │
          ▼
TypeScript Kernel
- events → engine
- effects ← engine
- results → engine
- DOM ops ← engine
- navigation
- lifecycle
          │
   Stable Engine API
          │
Application Engine
- state
- transitions
- validation
- evidence
- capabilities
- obligations
- effects
- projections

The TypeScript browser kernel should be application-agnostic.

It may understand:
DOM, events, fetch, history, storage, focus, files, browser APIs, protocol transport.

It must not understand:
customers, patients, orders, payments, reservations, workflow rules, business policies, authorization rules, domain validation.

## 3. Six Core Browser-Kernel Systems

1. EVENT — browser → engine
2. VIEW — engine → DOM
3. EFFECT — engine → browser APIs
4. RESULT — browser APIs → engine
5. NAVIGATION — browser history/URL ↔ engine
6. LIFECYCLE — browser lifecycle ↔ engine

Everything else should ideally be an optional capability module.

## 4. EVENT System

The browser kernel owns physical browser event handling, including click, submit, input, change, blur, focus, keydown, pointer events, drag/drop, visibility changes, and popstate.

Raw DOM events should normally NOT cross directly into the application engine. The kernel should translate physical browser events into semantic events.

Example:

DOM click
→ Activate("cancel-reservation")
→ engine

Another example:

input
→ debounce / blur / validity check
→ ValueCommitted(field="email", value="user@example.com")
→ engine

Key principle:

Cross the browser/engine boundary at semantic frequency, not physical-event frequency.

High-frequency events such as mousemove, pointermove, scroll, animation frames, and every keystroke should remain browser-side unless their semantic meaning requires engine involvement.

## 5. Native HTML Responsibilities

HTML should continue to own browser-native structure and semantics whenever practical:

- forms
- labels
- buttons
- links
- input types
- required fields
- email syntax
- number ranges
- date controls
- select controls
- details/summary
- dialog where appropriate
- semantic headings
- landmarks
- accessibility structure
- native navigation

Example:

<input type="email" required>

The browser can answer whether a value satisfies basic email syntax.
The engine can answer whether the email domain is allowed, whether an account already exists, or whether the address is permitted for a workflow.

Do not move functionality into Wasm merely because Wasm can perform it.

## 6. CSS Responsibilities

CSS should own purely visual interaction whenever possible:

- hover appearance
- focus appearance
- responsive layout
- media queries
- container queries
- transitions
- animations
- visual disabled states
- spacing
- typography
- layout
- presentation

No event should cross into the engine simply to change button appearance.

If hover has application meaning, then a semantic event may be justified. Example: hovering a customer record may request a protected preview only if the user has a capability.

## 7. VIEW System

The browser kernel owns physical DOM changes. The application engine determines what should be shown; the kernel executes the mechanism.

Initial useful DOM operations:

- SetText
- SetValue
- SetAttribute
- RemoveAttribute
- AddClass
- RemoveClass
- SetVisible
- SetEnabled
- SetChecked
- SetSelected
- Focus
- ScrollIntoView
- InsertView
- ReplaceView
- RemoveView
- ClearRegion

Potential additional operations:

- MoveView
- ReorderChildren

Initially avoid unrestricted operations such as:

- SetInnerHtml
- ExecuteScript
- RunSelectorAndDoAnything
- SetArbitraryProperty
- CallArbitraryDomMethod

These become escape hatches.

## 8. Loading, Unloading, and Replacing HTML

SPA view loading/unloading belongs partly to VIEW and partly to NAVIGATION/LIFECYCLE.

Useful operations:

- InsertView
- RemoveView
- ReplaceView
- AppendView
- PrependView
- ClearRegion

Example:

Engine requests ReplaceRegion(region="main", view=CustomerDetails(...)).
The TypeScript kernel locates the region, renders or instantiates the requested view, replaces the DOM content, and maintains generic event handling.

The engine should not manipulate the DOM directly.

## 9. Where HTML Fragments Come From

Three broad approaches are possible.

A. Native HTML Templates

<template id="customer-card">...</template>

Engine requests InstantiateTemplate("customer-card", data).

Advantages: browser-native, easy to inspect, semantic HTML, low application-JS complexity.

B. Typed View Models + Known Templates

Example:
CustomerView { name, status, can_cancel }

The browser kernel or generated renderer knows how to project the view model into HTML. This is a strong initial candidate.

C. Raw HTML from Engine

Example: ReplaceRegion("main", "<div>...</div>")

Avoid initially because it introduces XSS/sanitization risk, stringly typed UI, harder verification, potential CSP complications, and harder agent reasoning.

## 10. Application State Should Not Generate DOM Commands Directly

Avoid coupling business transitions directly to DOM operations.

Do not have Pending → Confirmed return SetText("status", "Confirmed") directly.

Prefer:

Domain State
→ View Projection
→ View Model
→ UI Diff / View Commands
→ TypeScript Kernel
→ DOM

Example:

Reservation = Confirmed(confirmation)

projects into:

ReservationView {
  status_text = "Confirmed"
  can_cancel = false
  show_confirmation = true
}

Then the UI layer determines physical DOM changes.

## 11. NAVIGATION System

The browser kernel owns browser navigation mechanisms:

- URL
- pathname
- query string
- hash
- history
- pushState
- replaceState
- back
- forward
- popstate
- external navigation

Example flow:

User clicks /customers/291
→ TypeScript intercepts semantic SPA navigation
→ NavigationRequested("/customers/291")
→ engine
→ Navigate("/customers/291")
→ TypeScript executes history.pushState(...)

The engine decides whether navigation is legal, what the route means, and what application state should result.

Native external links should generally remain native when application semantics do not require interception.

## 12. LIFECYCLE System

The kernel owns browser/document lifecycle observation.

Potential lifecycle messages:

- EngineStarting
- EngineStarted
- ViewMounted
- ViewUnmounting
- ViewUnmounted
- DocumentVisible
- DocumentHidden
- PageLeaving
- PageRestored
- Online
- Offline

Avoid recreating component lifecycle complexity equivalent to componentDidMount/componentWillUnmount/useEffect for everything.

Lifecycle notifications should mainly serve subscriptions, cleanup, focus management, external widgets, network lifecycle, and browser-specific resources.

Business logic should rarely depend directly on DOM mount/unmount.

## 13. Page Unloading

Do not rely on page unload as the only moment for critical state persistence.

The kernel may attempt cleanup, abort open effects, release observers/subscriptions, and signal lifecycle changes when practical.

Never design critical behavior around “if unload runs successfully, save the financial transaction.”

## 14. EFFECT System

The application engine requests external effects. The TypeScript kernel executes browser mechanisms.

Examples:

- HttpRequest
- Navigate
- StorageRead
- StorageWrite
- ClipboardWrite
- Focus
- FileOpen
- Download
- ScheduleTimer
- OpenWebSocket

The engine determines why the effect should occur. The kernel only performs it.

## 15. RESULT System

Every asynchronous browser operation should produce an explicit result.

Examples:

- HttpResult
- StorageResult
- ClipboardResult
- FileSelected
- TimerElapsed
- WebSocketOpened
- WebSocketMessage
- WebSocketClosed
- PermissionResult
- GeolocationResult

The kernel must not interpret transport/platform outcomes as domain truth.

HTTP 409 must not automatically become ReservationRejected. That interpretation belongs in the engine.

## 16. Correlation IDs

All asynchronous operations should use correlation IDs.

Example:
EffectRequest { request_id = 847 }

Later:
EffectResult { request_id = 847 }

This avoids hidden dependence on promise ordering, closure state, and implicit callbacks.

Use correlation for HTTP, storage, file selection, permissions, clipboard, geolocation, timers, WebSocket actions, and other asynchronous effects.

## 17. HTTP / Fetch Capability

The TypeScript kernel should own browser fetch execution.

Flow:

engine
→ HttpRequest effect
→ TypeScript
→ fetch()
→ transport result
→ TypeScript
→ HttpResult
→ engine

Transport-level results may contain request_id, HTTP status, headers, body, timing, network failure, aborted, or timeout.

TypeScript must not interpret business meaning.

A timeout after POST /payment must not automatically mean PaymentFailed. The engine may need Success, Failure, or OutcomeUnknown depending on the operation.

## 18. Cancellation

The browser kernel should manage browser-level cancellation mechanisms such as AbortController, timer cancellation, subscription removal, stream cancellation, WebSocket close, and observer disconnect.

Engine: CancelEffect(request_id)
Kernel: physically aborts browser operation.

## 19. Forms

The browser should handle native input behavior, HTML validity, required, email syntax, number ranges, date controls, checkbox/radio mechanics, autofill, and file-selection mechanics.

The kernel should handle semantic submit capture, value extraction, generic serialization, and correlation.

The engine should handle domain validation, cross-field business validation, commands, state transitions, authorization, and workflow rules.

Preferred flow:

HTML form
→ native validity
→ semantic submit
→ generic browser extraction
→ engine decoding
→ typed draft
→ domain validation
→ command

Possible future improvements:

- schema-generated form bindings
- typed element IDs
- generated serializers
- declarative metadata
- compile-time HTML/engine contracts

## 20. Focus Management

The browser kernel owns physical focus operations such as Focus(element), Blur(element), and ScrollIntoView(element).

The engine may request Focus("first-invalid-field").

Engine = policy; browser kernel = mechanism.

## 21. Storage Capability

Storage should be optional rather than mandatory kernel core.

Possible adapters:

- localStorage
- sessionStorage
- IndexedDB
- Cache API

Preferred operations:

- StorageRead
- StorageWrite
- StorageDelete

Prefer scoped capabilities such as DraftStorage, PreferenceStorage, and CacheStorage over unrestricted storage access.

## 22. URL State

The browser kernel handles window.location, pathname, query parameters, hash, and history state.

It may send:

LocationChanged { path, query, fragment }

The engine determines application meaning.

## 23. Timers and Clock

Timers are browser mechanisms.

Potential API:

- ScheduleOnce
- ScheduleRecurring
- CancelTimer

If the engine requires current time, use an explicit GetCurrentTime capability rather than letting domain code read browser time directly.

## 24. Browser Observers

Optional capability modules may wrap:

- ResizeObserver
- IntersectionObserver
- MutationObserver
- visibility events

Only semantically meaningful events should enter the engine. Purely visual resize behavior should generally remain CSS/browser-native.

## 25. Real-Time Communication

Optional capability modules:

- WebSocket
- Server-Sent Events

TypeScript owns open, close, transport reconnection when protocol-defined, message bytes/text, network errors, and connection lifecycle.

The engine interprets application messages such as ReservationUpdated, OrderCancelled, and PaymentSettled.

The kernel should not contain domain message interpretation.

## 26. File Capability

Browser kernel may provide:

- OpenFilePicker
- ReadFileMetadata
- ReadFileBytes
- DownloadBlob
- CreateObjectUrl
- RevokeObjectUrl

The engine owns file-type policy, business validation, content interpretation, authorization decisions, and upload rules.

## 27. Clipboard Capability

Optional operations:

- ClipboardRead
- ClipboardWrite

Browser/permission mechanics belong to TypeScript. Application meaning belongs to the engine.

## 28. External Links and Native Browser Navigation

Do not intercept browser behavior unnecessarily.

Prefer native <a href="..."> for ordinary external navigation, mailto, tel, downloads, and new tabs unless application semantics require interception.

Guiding principle:

Do not replace native browser behavior unless application semantics require control.

## 29. Additional Optional Capabilities

Possible modules:

- Http
- Storage
- Files
- Clipboard
- Notifications
- Geolocation
- Media
- Camera
- Microphone
- WebSocket
- SSE
- WebRTC
- ServiceWorker
- Workers
- Crypto
- Payments
- Fullscreen
- PointerLock
- DragDrop
- Observers
- Print
- Share

These should not all exist in Kernel Core.

## 30. Service Workers

Service workers have their own installation, waiting, activation, background execution, caching, fetch interception, and push behavior.

Therefore service-worker support should be a separate module rather than part of mandatory kernel core.

## 31. Presentation State Classes

Not every state belongs in the authoritative state system.

A. Authoritative Domain State
Examples: payment status, reservation status, eligibility, permissions, obligations.
Owned by engine/domain model.

B. Application / Workflow State
Examples: active workflow, pending command, loading operation, reconciliation operation.
Typically engine-owned.

C. Presentation State
Examples: expanded row, selected tab, draft text, local validation display.
May live in a typed UI layer and does not require high-assurance domain semantics.

D. Browser-Ephemeral State
Examples: hover, pointer coordinates, scroll position, animation progress, browser focus internals.
Prefer leaving these in browser-native behavior.

## 32. What TypeScript MUST NOT Own

TypeScript browser-kernel code must never contain:

- customer rules
- patient rules
- payment rules
- reservation rules
- authorization policies
- workflow truth
- domain state transitions
- business calculations
- semantic retry decisions
- policy interpretation
- evidence evaluation
- obligation resolution

Prohibited example:

if reservation.status == "pending": show cancel button

Preferred:

engine projects can_cancel = true
kernel executes SetVisible(cancelButton, true)

The kernel is not allowed to derive can_cancel.

## 33. Forbidden Escape Hatches

Kernel-facing APIs should not expose:

- eval
- executeJavascript
- callArbitraryFunction
- getArbitraryProperty
- setArbitraryProperty
- invokeAnything
- arbitrary DOM method calls

Capabilities should be narrow and explicit.

Example:
BrowserCapabilities { Http, Navigation, Clipboard, Storage, Focus, Files }

The engine should receive only capabilities it needs.

## 34. Kernel Complexity Budget

Do not optimize only for line count.

The more important requirement is a responsibility budget.

The kernel may grow because production browser handling requires initialization, event delegation, async effects, error propagation, DOM updates, cleanup, subscriptions, capability dispatch, correlation, browser differences, abort/cancellation, accessibility support, and transport integration.

That is acceptable.

What is not acceptable is growth caused by business logic, domain-specific rendering decisions, workflow state, application data models, authorization policy, feature-specific caches, or application-specific lifecycle logic.

A 3,000-line generic kernel may be healthy. A 1,000-line kernel containing hidden business meaning is not.

## 35. TypeScript Reference Engine

The first implementation should include a TypeScript reference engine, but it must obey the same architectural restrictions as future Wasm engines.

The TypeScript engine must NOT directly use document, window, fetch, localStorage, or browser DOM APIs.

It communicates only through the stable engine protocol.

Browser Kernel
→ EngineTransport
→ DirectTypeScriptTransport / DotNetWasmTransport / RustWasmTransport / KotlinWasmTransport / JavaWasmTransport

Replacing the engine must not require changes to browser behavior.

## 36. Stable Engine Interface

Conceptually:

interface ApplicationEngine {
  initialize(input: InitInput): EngineResult;
  handleEvent(event: SemanticEvent): EngineResult;
  handleEffectResult(result: EffectResult): EngineResult;
}

type EngineResult = {
  viewChanges: ViewChange[];
  effects: EffectRequest[];
};

Transport should be independently replaceable:

interface EngineTransport {
  start(): Promise<void>;
  dispatch(message: BrowserToEngineMessage): Promise<EngineToBrowserMessage>;
}

## 37. Three Protocol Directions

Avoid one unstructured message channel.

Browser → Engine:
- SemanticEvent
- EffectResult
- LifecycleEvent
- LocationChanged

Engine → Browser:
- ViewChange
- EffectRequest
- SubscriptionRequest
- NavigationRequest

Initialization:
- Capabilities
- Configuration
- ProtocolVersion
- Environment

## 38. Protocol Typing

Avoid:
{ type: "anything", payload: any }

Prefer finite unions.

SemanticEvent examples:
- Activate(...)
- Submit(...)
- ValueCommitted(...)
- SelectionChanged(...)
- NavigationRequested(...)

EffectRequest examples:
- Http(...)
- StorageRead(...)
- StorageWrite(...)
- Navigate(...)
- ClipboardWrite(...)
- Focus(...)

The TypeScript representation should map naturally to F# discriminated unions, Rust enums, C# sealed record hierarchies, Kotlin sealed classes, Java sealed interfaces, and WIT variants.

## 39. Serialization Should Be Replaceable

The protocol and its serialization should not be the same abstraction.

Initial choice: JSON, because it is easy to inspect, debug, log, test, fuzz, and use across languages.

Later compare:

- JSON
- MessagePack
- CBOR
- Protocol Buffers
- FlatBuffers
- direct Wasm memory
- WIT / Component Model

Performance optimization must not force changes to application semantics.

## 40. Engine Replacement Invariant

Formal invariant:

Replacing the application engine implementation must not require modification of HTML behavior, CSS behavior, event semantics, effect semantics, navigation semantics, lifecycle semantics, or view semantics.

Only EngineTransport, ProtocolCodec, and language-specific bootstrapping may differ.

This is the foundation for interchangeable C#, F#, Rust, Kotlin, Java, and TypeScript engines.

## 41. First Reference Application

Recommended test application: Email Availability Form.

It should contain:

- email field
- submit button
- status region
- native HTML email validation
- CSS hover/focus
- semantic ValueCommitted
- engine domain validation
- HTTP effect
- TypeScript fetch execution
- effect result
- engine interpretation
- view projection
- minimal DOM updates
- submit action

Possible engine states:

- Empty
- Editing
- Checking
- Available
- Unavailable
- Invalid
- CheckFailed

Flow:

User enters email
→ browser syntax validation
→ ValueCommitted
→ engine
→ Checking + HttpRequest
→ kernel executes fetch
→ HttpResult
→ engine
→ Available / Unavailable / Failure
→ view projection
→ kernel applies DOM changes

## 42. Future Engine Swap Experiment

After validating the protocol with the TypeScript engine:

Engine 1: TypeScript reference engine.
Engine 2: C# / .NET Wasm. No browser-kernel changes except transport adapter.
Engine 3: F# / .NET Wasm.
Engine 4: Rust Wasm.
Later: Kotlin Wasm and Java Wasm.

If language replacement forces changes to browser-event semantics or view semantics, the abstraction should be considered suspect.

## 43. React Comparison

The proposed kernel is NOT intended to recreate React.

React-style responsibilities should be decomposed as follows:

React component state → presentation state or engine state
global application state → engine
business reducers → engine transitions
useEffect business orchestration → explicit engine effects
Context → explicit projection/capabilities
virtual DOM → evaluate whether needed
reconciliation → projection/diff or fine-grained updates
event handling → kernel EVENT
DOM updates → kernel VIEW
fetch lifecycle → engine effects + kernel transport
routing → NAVIGATION
mount/unmount mechanics → LIFECYCLE where genuinely needed

The goal is to determine which pieces disappear rather than merely rebuilding them.

## 44. Main Architectural Question

The core question is not whether this can technically be made to work.

It is:

Can this architecture remain small, generic, understandable, testable, and application-agnostic while supporting a real SPA?

Main failure mode:

tiny browser bridge
→ more rendering logic
→ more component lifecycle
→ more caches
→ more diffing
→ more application-specific rules
→ React-like framework recreated

The Browser Kernel specification should make that growth visible.

## 45. Current Working Summary

HTML = semantic structure
CSS = presentation and visual behavior

TypeScript Browser Kernel =
- EVENT
- VIEW
- EFFECT
- RESULT
- NAVIGATION
- LIFECYCLE

Optional Browser Capabilities =
- HTTP
- Storage
- Files
- Clipboard
- Timers
- Observers
- WebSocket
- SSE
- Geolocation
- Media
- Workers
- Service Workers
- Crypto
- etc.

Application Engine =
- authoritative state
- commands
- transitions
- validation
- business semantics
- capabilities
- evidence
- obligations
- effect decisions
- view projections

Intended outcome:

HTML/CSS
+
small generic TypeScript browser kernel
+
stable engine ABI
+
replaceable strongly typed application engine

The browser kernel is a platform adapter.
It is not the application.
