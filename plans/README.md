# Animation plans

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Pointer pane drag settle](001-pointer-pane-drag-settle.md) | MEDIUM | DONE |
| 002 | [TLV structural row motion](002-tlv-structural-row-motion.md) | MEDIUM | DONE |
| 003 | [Sanity disclosure motion](003-sanity-disclosure-motion.md) | LOW | DONE |
| 004 | [Inline parse-error motion](004-inline-parse-error-motion.md) | LOW | DONE |

## Recommended order

1. Execute 001 first because it is isolated to the canvas.
2. Execute 002 next because it touches TLV row lifecycle behavior.
3. Execute 003 and 004 last; both add scoped CSS but have no direct dependency on each other.

All plans use the existing motion tokens in `src/index.css`; no new dependency is permitted.
