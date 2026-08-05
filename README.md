# Card Payment Tools

A compact, local-first workspace for EMV, ISO 8583, cryptography, PIN blocks, card data, and encoding utilities.

## Architecture

- **Astro 7** owns the document, routing, static output, metadata, and global styles.
- **Bearnie** owns the design-system source under `src/components/bearnie/`, the semantic theme in `src/styles/bearnie.css`, and native Astro UI.
- **React 19** is limited to the stateful payment-tool workspace through `src/islands/WorkspaceIsland.tsx`.
- Payment parsers and calculators remain framework-independent TypeScript under `src/utils/` and `src/tools/`.
- IndexedDB stores saved tests, custom tags, custom bitfields, and workspace state locally.

The single workspace island is intentional: pane order, keyboard focus, drag state, persistence, and command routing form one cohesive client module. New static surfaces should be Astro/Bearnie; new payment logic should stay outside either UI framework. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Features

- Parse, inspect, edit, copy, and validate BER-TLV/EMV data.
- Parse and compose ISO 8583 messages.
- Compare, save, reopen, and copy TLV payloads; inspect APDUs.
- Validate EMV configuration and CA public keys.
- Run payment cryptography, PIN-block, card-number, hash, and conversion tools.
- Open multiple independent panes, reorder them, use tabs or split mode, zoom, collapse, archive, and restore without discarding mounted tool state.
- Persist the workspace and user-defined tag decoders locally.

## Development

This repository uses Bun as its only package manager.

```sh
bun install
bun run dev
```

Open [http://localhost:4321](http://localhost:4321).

Verification:

```sh
bun run check
bun run lint
bun test
bun run build
```

`bun run build` also runs the repository security gate for [GHSA-3p9h-f68w-m6fx](https://github.com/advisories/GHSA-3p9h-f68w-m6fx) and fails if malicious `keyv@6.0.0` appears in the lockfile or installed dependency tree.

## Deployment

Firebase Hosting serves the static Astro build from `dist` on the `payment-tlv-utilities` site in project `srbwebapp-73021`.

```sh
bun run build
firebase deploy --only hosting --project srbwebapp-73021
```

Pushes to `master` also build and deploy the same `dist` artifact through the Firebase Hosting workflow.

## Project Structure

- `src/pages/` — Astro routes.
- `src/layouts/` — Astro document and layout modules.
- `src/components/bearnie/` — Bearnie-owned Astro components.
- `src/styles/bearnie.css` — Bearnie semantic tokens and elevations.
- `src/islands/` — explicit client-runtime seams.
- `src/components/workspace/` — multi-pane React workspace implementation.
- `src/components/ui/` — React compatibility adapters and payment-tool views.
- `src/tools/` — tool registry and declarative calculator specifications.
- `src/utils/` — framework-independent payment-domain logic and browser adapters.
- `scripts/` — build and security checks.

## macOS Shortcuts

- `⌘K` — add a tool.
- `⌘B` — collapse or expand the sidebar.
- `⌥←` / `⌥→` — previous or next pane.
- `⌥⇧←` / `⌥⇧→` — move the active pane.
- `⌥1…9` — focus a pane by number.
- `⌥↩` — zoom the active pane.
- `⌥T` — toggle split and tabs.
- `⌥-` / `⌥=` — collapse or expand the active pane.
- `⌥D` — duplicate the active pane.
- `⌥A` — archive the active pane.
- `⌥W` — close the active pane.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — current module seams and migration rules.
- `memory-bank/` — product context, implementation patterns, and progress notes.
