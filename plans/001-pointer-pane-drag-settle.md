# 001 — Add pointer-only pane drag feedback and FLIP settling

- **Status**: DONE
- **Commit**: d7650fa
- **Severity**: MEDIUM
- **Category**: Physicality, interruptibility, missed opportunities
- **Estimated scope**: 2 files, about 80 lines

## Problem

Pointer dragging identifies the source and target, but the drop target appears abruptly and reordered panes teleport to their new positions. Keyboard reordering must remain immediate.

```tsx
// src/components/workspace/tool-canvas.tsx:228 — current
const handleDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
  event.preventDefault();
  const sourceId =
    draggedPanelId || event.dataTransfer.getData("application/x-tool-panel");
  if (sourceId && sourceId !== targetId) onReorder(sourceId, targetId);
  setDraggedPanelId(null);
  setDragOverPanelId(null);
};
```

```tsx
// src/components/workspace/tool-canvas.tsx:570 — current
dragging && "scale-[0.995] opacity-55",
dropTarget && "border-primary ring-2 ring-primary/30",
active && "border-ring/70 ring-1 ring-ring/30"
```

## Target

- Pointer drop target only: overlay enters from `opacity: 0; transform: scale(0.995)` to `opacity: 0.7; transform: scale(1)` in `120ms var(--ease-out)` and exits in `90ms var(--ease-out)`.
- Pointer drop settling only: FLIP each pane from its pre-drop horizontal delta to `translateX(0)` over `180ms cubic-bezier(0.77, 0, 0.175, 1)` using the Web Animations API.
- Never run FLIP for `Alt+Shift+[`, `Alt+Shift+]`, tab selection, addition, deletion, restoration, or any other state update.
- Under `prefers-reduced-motion: reduce`, use opacity-only target feedback for `100ms`; for FLIP cap displacement at `6px` and use `100ms cubic-bezier(0.23, 1, 0.32, 1)`.
- Animate only `transform` and `opacity`.

## Repo conventions to follow

- Motion tokens live at `src/index.css:73-75`: `--ease-out`, `--ease-in-out`, and `--ease-drawer`.
- Reduced-motion behavior lives at `src/index.css:374-432` and removes movement while retaining opacity feedback.
- Existing pointer-drag state lives in `src/components/workspace/tool-canvas.tsx:360-390`.

## Steps

1. In `src/components/workspace/tool-canvas.tsx`, import `useLayoutEffect` and `useRef`.
2. Add a ref holding pre-drop pane X positions plus a boolean/ref that is set only by `handleDrop` immediately before `onReorder`.
3. In `handleDrop`, capture every visible `[data-tool-panel]` element's `getBoundingClientRect().left` keyed by `data-panel-id`, then call `onReorder`.
4. Add a `useLayoutEffect` keyed by `panels`. If and only if a pointer-drop snapshot exists, calculate `oldLeft - newLeft` for each surviving pane and call `element.animate` from `translateX(delta)` to `translateX(0)` with the exact target timing. Clear the snapshot before starting animations so unrelated state updates cannot reuse it.
5. Detect `prefers-reduced-motion` in that effect. Cap delta to `6px` and use the exact reduced timing above.
6. Add `data-drop-target={dropTarget}` and a stable class to each panel section. Remove `dropTarget && "border-primary ring-2 ring-primary/30"`.
7. In `src/index.css`, add the pointer-fine drop-target overlay and asymmetric transition durations. Add the reduced-motion opacity-only override.

## Boundaries

- Do NOT animate keyboard reordering or keyboard focus navigation.
- Do NOT install a motion dependency.
- Do NOT animate width, height, margin, padding, left, or right.
- Do NOT change drag behavior, pane order semantics, or active-pane state.
- If the cited source has drifted materially, stop and report instead of improvising.

## Verification

- **Mechanical**: run `npm run build`, `npm run lint`, and `git diff --check`. Build must pass; lint must introduce no new warnings.
- **Feel check**:
  - Drag the first pane header over the second. The target border should gently resolve and both panes should settle horizontally without flashing.
  - Press `Alt+Shift+]`. The keyboard reorder must remain immediate with no FLIP.
  - At 10% playback, verify the pointer settle starts from the old pane coordinates and ends at the exact new coordinates.
  - Enable reduced motion and verify the target uses opacity, while settling moves no more than `6px`.
- **Done when**: only pointer drop produces the target and FLIP motion, with no layout-property animation.
