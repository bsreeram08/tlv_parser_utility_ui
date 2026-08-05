# 002 — Animate only structurally changed TLV rows

- **Status**: DONE
- **Commit**: d7650fa
- **Severity**: MEDIUM
- **Category**: State indication, missed opportunities
- **Estimated scope**: 2 files, about 55 lines

## Problem

Adding or deleting a TLV element instantly inserts or removes a row. The full parse result must not stagger or animate because it is functional data.

```tsx
// src/components/ui/tlv-viewer/compact-tlv-display.tsx:214 — current
<div className="divide-y">
  {visibleRows.map((row) => (
    <TlvTableRow
      key={row.key}
      {...row}
      onRefresh={onRefresh}
      onEditElement={onEditElement}
      onDeleteElement={onDeleteElement}
      highlighted={highlightPath === row.path}
    />
  ))}
</div>
```

```tsx
// src/components/ui/tlv-viewer/compact-tlv-display.tsx:348 — current
<TagActionsMenu
  tag={element.tag}
  path={path}
  onEdit={onEditElement ? () => setEditOpen(true) : undefined}
  onDelete={onDeleteElement ? () => onDeleteElement(path) : undefined}
/>
```

## Target

- Only a newly added, highlighted row enters from `opacity: 0; transform: translateY(-3px) scale(0.995)` to settled in `160ms var(--ease-out)`.
- A confirmed deletion transitions to `opacity: 0; transform: translateY(-3px) scale(0.995)` for `120ms var(--ease-in-out)` before invoking the existing delete callback.
- Initial parsing, filtering, tab switching, and ordinary value edits must not animate the table rows.
- Under reduced motion, use opacity only for `100ms`.

## Repo conventions to follow

- Existing edited-row feedback uses `.tlv-mutation-feedback` at `src/index.css:325-342`.
- Structural additions already set `highlightPath` through `showMutationFeedback` in `src/components/ui/tlv-viewer/tlv-viewer.tsx:67-83`.
- Use the repo tokens at `src/index.css:73-75`.

## Steps

1. In `src/components/ui/tlv-viewer/compact-tlv-display.tsx`, give every row a stable `tlv-structural-row` class plus `data-structural-entry={highlighted}` and `data-exiting`.
2. Add local exit state and a timeout ref to `TlvTableRow`. On confirmed deletion, set exit state, wait `120ms` (`100ms` under reduced motion), then call `onDeleteElement(path)`.
3. Disable pointer events and set `aria-hidden` while a row is exiting so actions cannot be repeated.
4. Clean up the pending timeout on unmount.
5. In `src/index.css`, add transform/opacity transitions with `@starting-style` scoped to `.tlv-structural-row[data-structural-entry="true"]`. Because edited existing rows do not remount, they must not replay the entrance.
6. Add the exact reduced-motion override using opacity only.

## Boundaries

- Do NOT stagger or animate initial parse results.
- Do NOT change TLV data, row keys, filtering, edit behavior, or undo behavior.
- Do NOT animate layout properties.
- Do NOT add a dependency.

## Verification

- **Mechanical**: run `npm run build`, `npm run lint`, and `git diff --check`. Build must pass; no new lint warnings.
- **Feel check**:
  - Parse the eight-tag example: all eight rows must appear immediately with no stagger.
  - Add tag `9F02`: only the new row should settle in.
  - Delete it: the confirmed row should fade/shift for `120ms`, then disappear and remain undoable.
  - At 10% playback, confirm other rows never move.
  - Under reduced motion, confirm opacity remains and translation/scale are removed.
- **Done when**: structural edits are legible without animating parsed data as a group.
