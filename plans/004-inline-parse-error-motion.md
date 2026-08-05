# 004 — Bridge inline parse-error insertion and removal

- **Status**: DONE
- **Commit**: d7650fa
- **Severity**: LOW
- **Category**: Missed opportunities, accessibility
- **Estimated scope**: 2 files, about 70 lines

## Problem

Inline parse errors insert and disappear immediately, shifting the sanity and TLV data panels with no visual bridge.

```tsx
// src/components/ui/tlv-viewer/tlv-viewer.tsx:560 — current
{parseResult && parseResult.errors.length > 0 && (
  <div className="mb-2 space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2">
```

## Target

- Errors enter from `opacity: 0; transform: translateY(-2px)` to settled over `120ms var(--ease-out)`.
- When errors clear, retain the previous error block for `90ms` while transitioning to `opacity: 0; transform: translateY(-2px)`, then unmount it.
- New error contents may replace old contents immediately; do not crossfade functional error text.
- Under reduced motion, use opacity only for `100ms` and retain the block for the full `100ms`.

## Repo conventions to follow

- `TlvParsingResult["errors"]` is the existing error type; do not duplicate it.
- Existing conditional error markup is at `src/components/ui/tlv-viewer/tlv-viewer.tsx:560-582`.
- Motion tokens and reduced-motion rules live in `src/index.css:73-75` and `374-432`.

## Steps

1. In `src/components/ui/tlv-viewer/tlv-viewer.tsx`, extract the existing error markup into a local `AnimatedParseErrors` component accepting `errors: TlvParsingResult["errors"]`.
2. Inside it, retain the last non-empty error array in state. When errors become empty, set `data-exiting`, wait `90ms` (`100ms` under reduced motion), then clear the retained errors. Clean up timeouts.
3. When a new non-empty array arrives, replace retained content immediately and clear exit state.
4. Add class `tlv-parse-errors` and `data-exiting` to the wrapper.
5. In `src/index.css`, add the exact transform/opacity transition, an `@starting-style` entry, the exit state, and the reduced-motion opacity-only override.

## Boundaries

- Do NOT animate individual error lines or stagger them.
- Do NOT delay display of a newly produced error.
- Do NOT change parsing, toast behavior, wording, ordering, or offsets.
- Do NOT add a dependency or animate layout properties.

## Verification

- **Mechanical**: run `npm run build`, `npm run lint`, and `git diff --check`.
- **Feel check**:
  - Parse malformed TLV; the error block must become readable immediately while settling only `2px`.
  - Correct the input; the old block should leave in under `100ms` before the result area closes the gap.
  - Trigger a different error while one is visible; content should replace immediately without crossfade.
  - Under reduced motion, verify opacity remains but translation is removed.
- **Done when**: the layout shift is bridged without delaying functional error content.
