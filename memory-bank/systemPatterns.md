# System Patterns

## Architecture Overview

```text
Astro/Bearnie host
        │
        └── WorkspaceIsland
                 ├── canvas state and commands
                 ├── tool registry
                 ├── React view adapters
                 └── browser persistence adapters

Payment-domain TypeScript
        ├── EMV and TLV
        ├── ISO 8583 and APDU
        ├── cryptography and PIN blocks
        └── converters and validators
```

## Key Decisions

### One deep workspace module

The multi-pane workspace is a single client island. Pane order, active focus, keyboard routing, drag state, archive state, themes, and IndexedDB-backed data form one cohesive module behind the `WorkspaceIsland` interface.

### Astro and Bearnie own the host

Routes, layouts, metadata, static HTML, loading fallbacks, and future content-oriented surfaces use Astro and Bearnie. React modules never import `.astro` files.

### Framework-independent payment logic

Parsers, builders, validators, and calculators accept typed values and return results or readable errors. They do not import UI frameworks. The tool registry is the interface that exposes those capabilities to the workspace.

### Browser capabilities are adapters

IndexedDB, clipboard, file loading, and URL state are browser adapters used inside the client module. Payment computations remain directly testable without them.

## Data Processor Pattern

All tools follow the same deep processing flow:

```text
input → normalization → validation → computation → typed result → presentation
```

## Placement Rules

- Static UI: Astro + Bearnie.
- Stateful pane UI: the workspace island.
- New calculators: declarative tool specifications.
- Payment computations: `src/utils/`.
- Persistence or browser APIs: adapters at the client seam.
- Build/security policy: executable checks under `scripts/`.
