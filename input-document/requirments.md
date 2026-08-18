Minimal Browser–WASM Application Bridge Specification

1. Purpose

This specification defines a minimal architecture for browser applications in which:

* HTML owns document structure and browser-native semantics.
* CSS owns presentation and visual interaction.
* WebAssembly owns application state, business rules, computation, and state transitions.
* JavaScript or TypeScript provides only the smallest necessary bridge between the browser and WebAssembly.

The goal is not to create another frontend framework.

The goal is to make WebAssembly a practical primary application runtime while preserving everything the browser already does well.

The bridge exists only to fill gaps between browser capabilities and WebAssembly.

⸻

2. Core Principle

If HTML, CSS, or the browser already owns a capability, the bridge must not replace it.

The architecture is intentionally subtractive.

New bridge features are added only when:

1. The required behavior cannot reasonably be expressed using native HTML, CSS, or browser APIs.
2. The behavior is necessary to connect browser interaction to the WASM application.
3. The capability can remain domain-independent.
4. Adding it does not introduce application logic into the browser layer.

When the web platform later provides an equivalent capability, the bridge capability should be deprecated and removed.

⸻

3. Architectural Boundary

┌───────────────────────────────────────┐
│              HTML / CSS               │
│                                       │
│ structure                             │
│ semantics                             │
│ accessibility                         │
│ layout                                │
│ responsive behavior                   │
│ native controls                       │
│ browser interaction                   │
└──────────────────┬────────────────────┘
                   │
              browser events
                   │
                   ▼
┌───────────────────────────────────────┐
│          Minimal JS/TS Bridge          │
│                                       │
│ event forwarding                      │
│ WASM loading                          │
│ state projection                      │
│ browser API access                    │
│ native template instantiation         │
└──────────────────┬────────────────────┘
                   │
              intents/results
                   │
                   ▼
┌───────────────────────────────────────┐
│                WASM                   │
│                                       │
│ application state                     │
│ domain model                          │
│ validation                            │
│ state transitions                     │
│ search                                │
│ sorting                               │
│ filtering                             │
│ authorization                         │
│ workflows                             │
│ derived view state                    │
└───────────────────────────────────────┘

⸻

4. Ownership Rules

4.1 HTML owns

HTML remains responsible for semantic structure.

Examples include:

* forms
* inputs
* buttons
* links
* selects
* options
* tables
* dialogs
* details/summary
* lists
* images
* media
* headings
* sections
* landmarks
* accessibility semantics
* tab order
* form semantics
* native validation attributes
* <template>

The bridge must not invent replacements for existing semantic HTML elements.

⸻

4.2 CSS owns

CSS remains responsible for presentation and presentational state.

Examples include:

* layout
* responsive behavior
* hover
* focus appearance
* animations
* transitions
* visibility where purely presentational
* media queries
* container queries
* typography
* spacing
* visual hierarchy

The bridge must not introduce:

data-hover
data-animation
data-responsive
data-layout

or equivalent abstractions.

⸻

4.3 Browser owns transient interaction state

The browser should retain ownership of state that exists purely as part of the user’s current interaction.

Examples:

* cursor position
* text selection
* focus
* scroll position
* hover
* native dropdown state
* text composition/IME state
* drag interaction state
* media playback state

Application code should not continuously synchronize these values into WASM unless the domain genuinely requires them.

⸻

4.4 WASM owns application state

WASM is the canonical application state store.

Examples:

* entities
* selected entity
* current workflow state
* permissions
* domain validation
* application validation
* search indexes
* search queries where application relevant
* filtering
* sorting
* business rules
* derived state
* command eligibility
* state transitions
* application errors
* application-level loading state

There must not be a second application state model maintained in JavaScript.

⸻

5. No Shadow JavaScript State

JavaScript must not maintain a duplicate copy of the application domain model.

This is prohibited:

WASM customer state
        +
JavaScript customer state
        +
DOM customer state

The desired model is:

WASM
  canonical application state
DOM
  current browser projection
JS/TS
  no domain model

The browser may naturally contain values in controls, but those values do not constitute a second authoritative application model.

⸻

6. Data Flow

The architecture uses explicit one-directional flows.

Browser to WASM

Browser interaction becomes an event or intent.

DOM Event
   ↓
Bridge
   ↓
WASM Intent

Examples:

SearchChanged(“smi”)
CustomerSelected(42)
SortChanged(NameAscending)
EmailChanged(“user@example.com”)
SubmitOrder
CancelOrder

The bridge must communicate intent rather than performing business operations itself.

⸻

WASM to Browser

WASM determines the resulting application state.

Only the information required to update the visible browser state is projected back.

WASM state transition
       ↓
view projection
       ↓
bridge
       ↓
DOM

⸻

7. No Two-Way Binding

Automatic two-way binding is prohibited.

The architecture must not provide:

DOM property ↔ observable application property

Instead:

DOM change
   ↓
event
   ↓
WASM transition
   ↓
new projection
   ↓
DOM

This eliminates the need for:

* observables
* dirty checking
* watcher graphs
* mutation interception
* automatic dependency tracking
* computed observables
* synchronization engines

⸻

8. Input Editing

The bridge must not blindly overwrite an input’s value after every keystroke.

The browser should be allowed to manage normal editing behavior.

Example:

<input type=“email”>

The browser owns:

caret
selection
composition
editing
focus

WASM may receive:

EmailChanged(value)

and may respond with application state such as:

emailValid
validationMessage
canSubmit

WASM should only explicitly replace the control value when application semantics require doing so.

Examples:

* reset
* canonical formatting
* loading an existing record
* authoritative external update

⸻

9. WASM Calls Should Be Coarse-Grained

The bridge should communicate intent rather than repeatedly invoking WASM for individual low-level operations.

Bad:

compare(a,b)
compare(a,c)
compare(b,c)
...

Preferred:

SortCustomers(NameAscending)

Bad:

isMatch(customer1, query)
isMatch(customer2, query)
isMatch(customer3, query)

Preferred:

SearchCustomers(query, limit)

Rule:

Cross the JS/WASM boundary with intent, not implementation steps.

⸻

10. Canonical Data Should Remain in WASM

Large collections should normally remain in WASM memory.

Example:

100,000 customers
remain in WASM

A search operation:

SearchCustomers(“smi”, 20)

should return only what is required to render the result.

For example:

[
    { id: 42, label: “John Smith” },
    { id: 81, label: “Samantha Smith” }
]

rather than transferring the complete customer collection to JavaScript.

⸻

11. Minimal Bridge Capabilities

The initial bridge should contain only capabilities demonstrated to be necessary.

The expected primitive categories are:

11.1 Event forwarding

Forward browser events into WASM.

Conceptually:

<button data-event=“save”>
    Save
</button>

The browser event becomes:

Save

or:

Save(elementKey)

The bridge does not determine whether save is legal.

⸻

11.2 Text projection

Project WASM-provided text into DOM text nodes.

Conceptually:

<span data-text=“customerName”></span>

The operation must use:

element.textContent

by default.

Arbitrary HTML injection should not be supported by the initial specification.

⸻

11.3 Property or attribute projection

WASM may project values into existing HTML properties or attributes.

Examples include:

disabled
checked
selected
value
href
src
aria-expanded
aria-invalid
title

The bridge should not create semantic abstractions such as:

enable
disable
selected-state
checkbox-state

These concepts already belong to HTML.

The bridge only performs generic projection.

⸻

11.4 Conditional structure

HTML currently lacks general application-state-driven structural inclusion.

A minimal conditional mechanism may therefore be justified.

Conceptually:

<template data-if=“hasSearchResults”>
    ...
</template>

The condition must reference an already-derived WASM view value.

The bridge must not evaluate expressions.

Valid:

hasSearchResults

Invalid:

results.length > 0

Invalid:

user.age > 18 && user.active

The calculation belongs in WASM.

⸻

11.5 Collection repetition

HTML does not currently provide general data-driven template repetition.

A minimal repetition primitive is therefore justified.

Conceptually:

<template data-each=“customers”>
    ...
</template>

The bridge instantiates the native HTML template once per projected record.

The bridge must not become a general template language.

⸻

11.6 Keys

Repeated structures should support stable identity.

Conceptually:

<template
    data-each=“customers”
    data-key=“id”>

Keys allow the bridge to preserve DOM elements when collections change.

The reconciliation mechanism should remain constrained to keyed repeated templates rather than evolve into arbitrary virtual DOM reconciliation.

⸻

11.7 Browser capability commands

WASM cannot directly perform all browser operations.

The bridge may expose a constrained set of browser capabilities.

Examples:

focus element
scroll element into view
open native dialog
close native dialog
read clipboard
write clipboard
fetch resource
navigate
use history API
read file
persist browser-local data

These must be explicit capabilities.

WASM should request them.

The bridge performs them and returns their result where appropriate.

⸻

12. Native Templates First

Reusable view structure should begin with native HTML:

<template id=“customer-row”>
    <tr>
        ...
    </tr>
</template>

The architecture must not initially introduce:

* custom component syntax
* component classes
* component lifecycle
* component-local state
* component dependency injection
* JSX
* template interpolation languages

If native <template> cannot solve a demonstrated requirement, the missing capability should be documented before adding another abstraction.

⸻

13. No Expression Language

HTML bindings must not become an embedded programming language.

This is valid:

<div data-if=“canPurchase”>

This is prohibited:

<div data-if=“customer.age >= 18 && customer.enabled”>

This is prohibited:

<div data-text=“firstName + ‘ ‘ + lastName”>

This is prohibited:

<div data-if=“calculatePermission(user)”>

Bindings may reference identifiers or simple statically resolvable property paths only.

Derived values belong in WASM.

⸻

14. No Computed Browser State

The bridge must not implement:

* computed values
* selectors containing business logic
* derived observable values
* expression evaluation
* filters
* pipes
* browser-side domain formatting rules

Example:

Do not:

<span data-text=“price * quantity”>

Instead WASM projects:

lineTotal = “$42.00”

when presentation-ready output is appropriate.

⸻

15. Searching

Search logic belongs in WASM.

Example flow:

input event
“smi”
    ↓
SearchChanged(“smi”)
    ↓
WASM
    search
    ranking
    filtering
    permissions
    limits
    ↓
top 20 view results
    ↓
browser

The bridge may coalesce or debounce browser events because that is interaction transport behavior rather than domain behavior.

Debouncing must not contain search semantics.

⸻

16. Sorting

Sorting belongs in WASM.

The browser should communicate:

SortChanged(NameAscending)

rather than implementing:

customers.sort(...)

The canonical collection remains in WASM.

Only the resulting visible projection needs to cross the boundary.

⸻

17. Filtering

Application filtering belongs in WASM.

Browser controls communicate filter selection as intent:

StatusFilterChanged(Active)

WASM determines which records match.

CSS selectors may still be used for purely presentational filtering where no application semantics are involved.

⸻

18. Validation

Domain and application validation belong in WASM.

HTML native validation should still be used where it naturally applies.

Examples:

<input
    type=“email”
    required
    maxlength=“200”>

HTML may enforce basic browser constraints.

WASM decides application rules such as:

email already exists
customer cannot order in current state
account has insufficient permissions
transition is prohibited

WASM may project resulting states using native attributes:

aria-invalid
disabled

and text error messages.

⸻

19. Forms

Native HTML forms should be preserved.

Example:

<form data-event-submit=“createCustomer”>

The browser retains:

* semantic form structure
* accessibility behavior
* native controls
* keyboard behavior

The bridge forwards submission intent.

WASM decides whether the state transition succeeds.

⸻

20. Accessibility

Accessibility must remain browser-native wherever possible.

Prefer:

* semantic elements
* labels
* fieldsets
* legends
* native dialog
* native buttons
* native links
* native inputs
* native table semantics

WASM may project application state into accessibility attributes such as:

aria-expanded
aria-selected
aria-invalid
aria-disabled

The bridge must not recreate accessibility behavior that HTML already provides.

⸻

21. Async Work

Application workflows involving asynchronous browser capabilities should remain explicit.

Example:

WASM
LoadCustomer(42)
    ↓
BrowserCapability:
Fetch(“/customers/42”)
    ↓
Bridge
fetch(...)
    ↓
result
    ↓
WASM
CustomerLoaded(...)

The bridge owns the browser API call.

WASM owns the meaning of the result.

⸻

22. Fetching

The bridge may expose a generic HTTP capability.

The bridge must not become:

* a repository
* a service layer
* a query library
* a caching framework
* an application API client

Application-level request decisions belong in WASM.

⸻

23. Routing

Prefer native URLs, links, and History API behavior.

Routing semantics should not be implemented in the bridge unless necessary.

WASM may determine application route state.

The bridge may perform browser navigation as a capability.

⸻

24. Rendering Strategy

The initial implementation should favor simplicity.

Start with:

WASM
 ↓
small view result
 ↓
JS
 ↓
native DOM update

Do not begin by creating:

* virtual DOM
* diffing engine
* render trees
* JSX
* component reconciliation
* reactive dependency graphs

Optimization should occur only after measured performance demonstrates a problem.

⸻

25. Collection Reconciliation

Repeated templates are the one place where limited reconciliation may be justified.

Given:

existing:
1 2 3
new:
1 3 4

the bridge may:

keep 1
remove 2
move/retain 3
instantiate 4

This reconciliation must remain specific to explicitly keyed repeated collections.

It must not expand into arbitrary DOM-tree reconciliation.

⸻

26. Interop Representation

The bridge protocol should evolve based on evidence.

Initial implementation may use a simple representation such as JSON.

Example:

{
  “event”: “customerSearch”,
  “query”: “smi”,
  “limit”: 20
}

WASM may return:

{
  “results”: [
    {
      “id”: 42,
      “label”: “John Smith”
    }
  ]
}

If profiling demonstrates that serialization is material, the implementation may evolve toward:

* WASM linear-memory structures
* typed arrays
* binary records
* generated bindings

Performance optimization must not change the architectural ownership rules.

⸻

27. Explicitly Excluded Features

The bridge must not initially provide:

application state store
component state
observables
computed observables
two-way binding
dependency tracking
hooks
effects
component lifecycle
dependency injection
service containers
routing framework
HTTP framework
validation framework
business expressions in HTML
template programming language
filters/pipes
virtual DOM
JSX
application-level async orchestration
business-level event bus
client-side domain model
browser-side authorization logic
browser-side business rules

Any proposal to introduce one requires architectural review.

⸻

28. Feature Admission Rule

A new bridge capability must answer all of the following:

1. Does HTML already provide this?

If yes:

Reject.

2. Does CSS already provide this?

If yes:

Reject.

3. Does the browser already provide this?

If yes:

Expose the browser capability directly if necessary rather than recreating it.

4. Is this application or domain logic?

If yes:

Put it in WASM.

5. Is this purely a connection problem between WASM and the browser?

If yes:

It may belong in the bridge.

⸻

29. Framework Drift Test

The implementation should be considered at risk of becoming a framework if the bridge begins accumulating:

* state
* lifecycle
* computed values
* application logic
* custom UI controls
* custom accessibility behavior
* large binding vocabulary
* expression syntax
* rendering abstractions
* dependency systems
* plugin systems
* application services

A useful rule:

If the bridge needs to understand what a customer, order, invoice, user, permission, workflow, or business rule means, the architecture has failed.

⸻

30. Prototype Success Criteria

The initial spike should demonstrate:

* WASM-owned canonical state
* browser-native form interaction
* searchable dropdown
* sorting
* filtering
* conditional rendering
* repeated templates
* form validation
* asynchronous fetch
* application state transition
* accessibility
* keyboard navigation

The experiment should test at least:

1,000 records
10,000 records
100,000 records
1,000,000 records

where practical.

⸻

31. Performance Measurements

Measure:

WASM startup time
event → WASM latency
search execution time
sort execution time
filter execution time
WASM → browser transfer time
serialization cost
DOM rendering cost
total input → rendered-result latency
memory usage
bundle size

Compare at minimum:

JSON boundary
structured WASM memory boundary

More sophisticated protocols should only be considered if evidence warrants them.

⸻

32. Language Evaluation

The architecture should not be tied unnecessarily to one WASM source language.

Candidate implementations should include:

F#
C#
Rust

and potentially:

Java
Kotlin
Go
Swift

Evaluate:

* generated WASM size
* startup time
* memory usage
* browser interoperability
* build complexity
* debugging
* toolchain maturity
* generated JavaScript glue
* typing strength
* state modeling
* AI code-generation quality
* AI repair behavior
* enterprise adoption cost

The optimal language may not be the one producing the fastest WASM.

The goal is the best overall development system.

⸻

33. AI Development Objective

The architecture should maximize the amount of application work performed within a constrained typed environment.

Ideally, most AI-generated application changes occur in:

/domain
/state
/transitions
/workflows
/validation
/search
/view-models

The bridge should be small, stable, and rarely modified.

This reduces the amount of frontend infrastructure an AI agent must understand before making a change.

⸻

34. Static Analysis Opportunity

Because HTML bindings contain identifiers rather than arbitrary expressions, they can potentially be statically analyzed.

Example:

<div data-if=“canPurchase”>
    <span data-text=“customerName”></span>
    <button data-event=“purchase”>
        Purchase
    </button>
</div>

A build tool can potentially derive:

Required view state:
canPurchase : bool
customerName : string
Emitted events:
purchase

This could generate a typed application contract.

Example conceptual output:

type ViewState =
    {
        CanPurchase: bool
        CustomerName: string
    }
type ViewEvent =
    | Purchase

This possibility should be explored before introducing dynamic binding features.

⸻

35. Long-Term Direction

The desirable end state is not a larger bridge.

It is a smaller one.

As browser standards evolve:

browser gains capability
        ↓
bridge capability becomes unnecessary
        ↓
delete bridge code

The architecture should therefore optimize for deletion rather than accumulation.

⸻

36. Summary

The system can be reduced to a simple division of responsibility:

HTML
    structure and semantics
CSS
    presentation
Browser
    native interaction
WASM
    application meaning
Bridge
    communication

The bridge should ultimately need only a few primitive concepts:

EVENT
PROJECT
REPEAT
CONDITION
TEMPLATE
BROWSER CAPABILITY

Everything else must justify its existence.

The governing rule is:

Use the browser wherever the browser already knows how to solve the problem. Use WASM wherever application meaning or state is involved. Add bridge behavior only where those two worlds genuinely cannot communicate without it.