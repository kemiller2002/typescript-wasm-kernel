# Dependency-Minimal Browser Kernel Architecture Policy

**Status:** Working architectural constraint  
**Scope:** Browser kernel, SPA infrastructure, WebAssembly integration, and related client-side application architecture

---

# 1. Governing Principle

The browser kernel is **dependency-free by default**.

External libraries are architectural exceptions.

A dependency must justify itself by reducing total system complexity, implementation risk, standards risk, security risk, or maintenance burden.

Convenience alone is not sufficient justification.

The default platform is:

```text
HTML
CSS
TypeScript
Standard Browser APIs
WebAssembly
```

Nothing else is assumed.

---

# 2. Simplicity Over Convenience

The governing design philosophy is:

> Simple can be easy, but easy is never simple.

A library may make an individual task easier while making the system as a whole more complex.

Examples of hidden complexity introduced by dependencies include:

```text
additional APIs
configuration
transitive dependencies
upgrade churn
supply-chain exposure
build tooling
version compatibility
hidden runtime behavior
framework conventions
larger debugging surface
larger AI-agent context requirements
new failure modes
maintainer/project risk
```

A locally owned 30-line implementation can be simpler than a 5-line call into a large external dependency.

Line count is not the primary measure of simplicity.

The relevant question is:

> How many concepts, authorities, dependencies, and hidden behaviors must someone understand to reason correctly about the system?

---

# 3. Native Platform First

Before adding a dependency, determine whether the browser or language already provides the necessary capability.

Prefer native browser primitives such as:

```text
fetch
AbortController
URL
URLSearchParams
history
FormData
EventTarget
CustomEvent
Promise
async / await
Map
Set
structuredClone
localStorage
sessionStorage
IndexedDB
WebSocket
ResizeObserver
IntersectionObserver
MutationObserver
crypto
<template>
HTML constraint validation
semantic HTML elements
CSS selectors
CSS state
CSS transitions
CSS animations
```

Prefer TypeScript/JavaScript language constructs such as:

```text
functions
modules
readonly values
discriminated unions
switch
arrays
records/objects
Map
Set
Promise
async / await
```

Do not add a library merely to wrap a standardized API with another API.

---

# 4. Functional Structure Without Functional Libraries

The TypeScript browser kernel should follow a heavily functional architecture using ordinary TypeScript.

Prefer:

```text
pure functions
immutable inputs and outputs
explicit state
discriminated unions
exhaustive handling
explicit Result values
effects represented as data
explicit capabilities
explicit dependencies
small modules
boundary-localized mutation
```

Do not introduce a functional-programming runtime or abstraction library unless a clear need is proven.

Avoid adding complexity such as:

```text
large effect systems
monad libraries
higher-kinded abstraction layers
large reactive runtimes
general-purpose functional frameworks
```

unless experiments demonstrate that they reduce total complexity rather than merely adding abstraction.

The target is:

```text
Functional Core
+
Imperative Browser Shell
```

---

# 5. Impurity Belongs at the Boundary

Browser operations are inherently effectful.

Examples:

```text
DOM mutation
fetch
history navigation
storage
timers
file APIs
clipboard
observers
WebSocket
browser permissions
```

These effects should be isolated in browser adapters.

Pure modules should not directly read:

```text
document
window
Date.now()
Math.random()
localStorage
fetch
```

Instead, they should receive values explicitly or produce explicit effect requests.

Example:

```text
event
  ↓
pure transition
  ↓
state + Effect[]
  ↓
effect interpreter
  ↓
browser
```

---

# 6. No Framework by Default

The architecture does not assume:

```text
React
Vue
Angular
Svelte
Redux
MobX
Zustand
RxJS
Axios
Lodash
React Hook Form
router frameworks
dependency-injection containers
state-management libraries
validation libraries
UI component frameworks
```

These are not automatically prohibited forever.

They are simply not default dependencies.

Each must independently prove that it reduces more complexity than it introduces.

---

# 7. Example Native Replacements

Instead of an HTTP library:

```text
fetch
AbortController
```

Instead of a routing library:

```text
URL
URLSearchParams
history.pushState
history.replaceState
popstate
```

Instead of a form library:

```text
semantic HTML forms
native constraint validation
FormData
typed decoding
```

Instead of a state-management framework:

```text
explicit immutable state
pure transition functions
explicit events
explicit effects
```

Instead of a utility library:

```text
Array
Object
Map
Set
standard language functions
small local helpers
```

Instead of a dependency-injection container:

```text
records/objects of capability functions
explicit function parameters
```

Instead of a reactive library:

```text
small explicit projection/diff logic
```

until a more complex runtime is demonstrated to be necessary.

---

# 8. Dependency Approval Test

Every proposed third-party dependency must answer all of the following.

## Platform Availability

1. Can HTML already do this?
2. Can CSS already do this?
3. Can the browser Web APIs already do this?
4. Can TypeScript/JavaScript already do this?
5. Can WebAssembly or the selected strongly typed language already do this?

## Implementation Complexity

6. Can the exact required subset be implemented clearly in-house?
7. How much code is actually required?
8. Is our required capability substantially smaller than the dependency's full feature set?
9. Is the difficult part algorithmic, security-sensitive, standards-sensitive, or merely tedious?

## System Complexity

10. What new concepts does the dependency introduce?
11. What configuration does it require?
12. What runtime behavior becomes hidden?
13. What debugging knowledge becomes necessary?
14. What build/tooling changes are required?

## Dependency Risk

15. How many transitive dependencies does it introduce?
16. What is the supply-chain risk?
17. How frequently does the dependency change?
18. What breaking-change history does it have?
19. What happens if the maintainer or project disappears?
20. How difficult is replacement?

## AI-Agent Cost

21. How much new API/documentation surface must an agent understand?
22. Does the dependency increase repository/context retrieval?
23. Does it introduce framework-specific implicit behavior?
24. Does it make debugging more dependent on external documentation?
25. Does it reduce more reasoning than it adds?

## Final Test

26. Does the dependency eliminate more total complexity than it introduces?

If the answer to #26 is unclear, the dependency should not be added.

---

# 9. When External Dependencies May Be Justified

A dependency may be appropriate when correct implementation would be disproportionately:

```text
security-sensitive
cryptographically difficult
standards-sensitive
algorithmically complex
compatibility-sensitive
legally/regulatorily sensitive
browser-quirk-heavy
maintenance-intensive
```

Examples may include:

```text
cryptographic primitives not already provided by Web Crypto
complex document/media codecs
standards-heavy protocol implementations
high-quality accessibility primitives with difficult edge cases
specialized parsing where correctness is security critical
```

Even then:

```text
use the smallest appropriate dependency
isolate it behind an internal interface
prevent it from leaking throughout the architecture
make replacement possible
document why it exists
```

---

# 10. Dependency Isolation Rule

Any third-party dependency that is approved should be wrapped behind a narrow internal boundary.

Application code should depend on:

```text
our interface
```

not:

```text
the dependency's API everywhere
```

Example:

```text
Application
    ↓
HttpCapability
    ↓
BrowserHttpAdapter
    ↓
external dependency, if one is ever justified
```

This preserves replacement ability.

---

# 11. Browser Kernel Responsibility Budget

The browser kernel may grow because real browser integration requires:

```text
initialization
engine loading
event delegation
DOM updates
navigation
async effect dispatch
effect correlation
error propagation
cancellation
cleanup
subscriptions
browser compatibility
accessibility behavior
capability dispatch
transport integration
```

That growth is acceptable.

The kernel must not grow because of:

```text
business logic
domain state
authorization rules
workflow rules
application-specific caches
domain-specific validation
application-specific rendering decisions
feature-level state machines
policy interpretation
```

The goal is not the fewest lines of TypeScript.

The goal is the smallest **semantic authority** in TypeScript.

---

# 12. AI-Agent Design Implication

External dependencies have an additional cost in AI-developed systems.

A dependency may reduce typing while increasing the agent's required context:

```text
library API
configuration
version-specific behavior
framework conventions
documentation
known bugs
integration patterns
transitive dependencies
upgrade history
```

Therefore:

> Less code is not necessarily less reasoning.

A slightly larger amount of explicit, boring, locally owned code may require substantially less probabilistic reconstruction by an AI agent.

This should be measured experimentally.

Potential measures include:

```text
tokens per correct change
files inspected
tool calls
external documentation retrieval
repair loops
framework-specific mistakes
dependency-related regressions
upgrade work
```

---

# 13. Prototype Constraint

The initial browser-kernel prototype MUST use only:

```text
HTML
CSS
TypeScript
standard browser APIs
```

The first TypeScript application engine must also use no external runtime libraries.

The first WebAssembly engine integration should add only the minimum tooling required by the target language/runtime.

No library should be introduced because:

```text
"this is how people normally do it"
"it saves a few lines"
"it is popular"
"everyone uses it"
"there is already an npm package"
```

Popularity is not architectural justification.

---

# 14. Wasm Integration Constraint

The browser kernel must remain independent of the Wasm implementation language.

Target engines may include:

```text
TypeScript reference engine
C# / .NET Wasm
F# / .NET Wasm
Rust Wasm
Kotlin Wasm
Java Wasm
```

Language-specific tooling belongs behind:

```text
EngineTransport
ProtocolCodec
engine bootstrap
```

The rest of the browser kernel must not change when engine language changes.

---

# 15. Review Rule

Whenever code review proposes a new dependency, reviewers should ask:

```text
What problem does this solve?
Why can't the platform solve it?
Why can't a small local implementation solve it?
What total complexity does this dependency add?
What authority does it gain?
How difficult is removal?
What will an AI agent have to learn because we added it?
```

A dependency should be treated similarly to adding a new external service:

> It is a long-term architectural relationship, not a trivial convenience.

---

# 16. Current Architectural Baseline

```text
HTML
    native semantics and structure

CSS
    layout, presentation, visual interaction

TypeScript Browser Kernel
    EVENT
    VIEW
    EFFECT
    RESULT
    NAVIGATION
    LIFECYCLE

Standard Browser APIs
    actual browser capabilities

Application Engine
    authoritative application semantics

WebAssembly
    optional execution boundary for strongly typed engines
```

No external framework is required by the architecture.

---

# 17. Summary Rules

```text
Native before dependency.

Language feature before library.

Small local implementation before general framework.

Explicit before magical.

Visible behavior before hidden behavior.

Capability before ambient authority.

Owned code before unnecessary supply-chain dependency.

Total system simplicity before local convenience.
```

The goal is not ideological dependency elimination.

The goal is to require every dependency to prove that it makes the **whole system simpler**, not merely the next five minutes of implementation easier.
