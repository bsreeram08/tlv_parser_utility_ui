# 003 — Bridge EMV sanity-check disclosure changes

- **Status**: DONE
- **Commit**: d7650fa
- **Severity**: LOW
- **Category**: State indication
- **Estimated scope**: 2 files, about 35 lines

## Problem

The EMV Sanity Checks chevron rotates, but the findings content snaps open and closed.

```tsx
// src/components/ui/emv-checks/tlv-lint-panel.tsx:88 — current
<ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
```

```tsx
// src/components/ui/emv-checks/tlv-lint-panel.tsx:98 — current
<CollapsibleContent>
  {sorted.length > 0 && (
    <CardContent className="space-y-2 pt-0">
```

## Target

- Scope motion only to the sanity panel, not the high-frequency sidebar collapsibles.
- Open from `opacity: 0; transform: translateY(-2px)` to settled over `140ms var(--ease-out)`.
- Close from settled to `opacity: 0; transform: translateY(-2px)` over `100ms var(--ease-in-out)`.
- Under reduced motion, animate opacity only for `100ms`.

## Repo conventions to follow

- Easing tokens live at `src/index.css:73-75`.
- Radix disclosure state is exposed through `data-state` on `CollapsibleContent`.
- Similar short component motion uses `120-160ms` in `src/index.css:313-342`.

## Steps

1. Add class `tlv-lint-disclosure` to the `CollapsibleContent` in `src/components/ui/emv-checks/tlv-lint-panel.tsx`.
2. Add scoped open and close keyframes in `src/index.css` that animate only transform and opacity with the exact target values.
3. Bind the keyframes to `.tlv-lint-disclosure[data-state="open"]` and `[data-state="closed"]` with fill mode `both` so Radix presence can run the close phase before unmount.
4. Add reduced-motion keyframes that animate opacity only for `100ms`.

## Boundaries

- Do NOT change `src/components/ui/collapsible.tsx` globally.
- Do NOT animate the sidebar groups.
- Do NOT animate height or grid rows.
- Do NOT modify finding order or content.

## Verification

- **Mechanical**: run `npm run build`, `npm run lint`, and `git diff --check`.
- **Feel check**:
  - Open and close a sanity panel with findings; content should bridge the disclosure without feeling delayed.
  - Rapidly reverse it and confirm it does not flash.
  - Confirm sidebar categories remain unchanged.
  - Under reduced motion, content should fade without positional movement.
- **Done when**: only the sanity findings disclosure receives the subtle bridge.
