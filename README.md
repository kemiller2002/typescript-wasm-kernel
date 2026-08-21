# TypeScript browser kernel

A dependency-minimal reference implementation of the specifications in `prompts/`.
JavaScript/TypeScript in `src/kernel/` owns browser mechanism; `src/engine/` owns
typed application semantics behind the stable protocol in `src/protocol.ts`.

## Install

```sh
npm install @echelon-foundry/typescript-wasm-kernel
```

```ts
import {
  BrowserKernel,
  DirectTypeScriptTransport,
} from "@echelon-foundry/typescript-wasm-kernel";

const kernel = new BrowserKernel(
  new DirectTypeScriptTransport(),
  document,
);

await kernel.start();
```

## Run

```sh
npm install
npm run check
npm run build
python3 -m http.server 4173
```

Open `http://localhost:4173`. The example expects
`GET /api/email-availability?email=...` to return `{ "available": boolean }`;
without a backend it intentionally demonstrates the typed failure state.

## Architecture

- Native HTML owns form and email-syntax validation.
- CSS owns visual interaction.
- The kernel is a generic declarative bridge: `data-event`, `data-text`, `data-bind-<attr>`, `data-if`, and `data-each` are the only vocabulary it understands, and it interprets none of it — see [docs/USAGE.md](docs/USAGE.md).
- The engine owns state, legal transitions, validation, evidence, obligations, and view projection (a flat `ViewState`, not DOM operations).
- `npm run check:architecture` mechanically rejects browser dependencies and dynamic escapes in the engine.
- `EngineTransport` is the swap point for a future WebAssembly engine.
- See [docs/ROADMAP.md](docs/ROADMAP.md) for the full bridge responsibility checklist — what's implemented and tested, what's deliberately deferred, and why.

## Publishing

The CI workflow builds, tests, and validates the npm tarball on pushes and pull
requests. Publishing is triggered by a semantic-version tag and authenticates
with npm Trusted Publishing over GitHub OIDC. No npm token is stored in GitHub.

Configure the package's **Trusted Publisher** on npmjs.com with:

- Provider: GitHub Actions
- Organization or user: `kemiller2002`
- Repository: `typescript-wasm-kernel`
- Workflow filename: `publish.yml`
- Environment: leave empty
- Allowed action: `npm publish`

Then:

1. Update the package version with `npm version patch` (or `minor`/`major`).
2. Push the commit and generated tag with `git push --follow-tags`.

The publish workflow rejects a tag whose version does not exactly match
`package.json`, then runs all checks before publishing. npm automatically
generates provenance for public packages published through Trusted Publishing.

For example, package version `0.2.1` must be released with tag `v0.2.1`.
