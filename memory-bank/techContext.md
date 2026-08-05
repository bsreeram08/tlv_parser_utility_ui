# Technical Context

## Technology Stack

### Application host

- **Framework:** Astro 7, statically generated.
- **Design system:** Bearnie-owned Astro components and semantic CSS tokens.
- **Styling:** Tailwind CSS 4 through the official Vite plugin used by Astro.
- **Package manager/runtime:** Bun.

### Interactive workspace

- **Client island:** React 19 through `@astrojs/react`.
- **Accessible interaction adapters:** Radix primitives internal to the React workspace.
- **Forms:** React Hook Form and Zod.
- **Local state:** React state/context and Jotai where appropriate.
- **Persistence:** Dexie over IndexedDB.

### Payment-domain dependencies

- `crypto-js` for established cryptographic operations.
- `buffer` for binary data handling.
- `jsbi` for precise integer arithmetic.

## Development Workflow

```sh
bun install
bun run dev
bun run check
bun run lint
bun test
bun run build
```

Astro serves development on port `4321` by default. The production build is static and requires no server adapter.

## Constraints

- Payment computations remain framework-independent TypeScript.
- The client-only workspace owns all browser state that must coordinate across panes.
- Astro/Bearnie own static routes, the document, metadata, and future progressively enhanced surfaces.
- Bun is the only package manager; do not add an npm lockfile.
- The build must reject malicious `keyv@6.0.0` per GHSA-3p9h-f68w-m6fx.
- Accessibility, keyboard operation, reduced motion, and cross-browser behavior remain release requirements.
