# Project Progress

## What Works
- Astro 7 static application shell with one cohesive React 19 workspace island
- Source-owned Bearnie components and semantic design tokens
- Lazy-loaded tool registry that avoids eagerly shipping every payment tool
- Dense, horizontal multi-pane canvas with tabs, zoom, archive, collapse, close, and Mac keyboard controls
- Build-time protection against the malicious `keyv@6.0.0` release (GHSA-3p9h-f68w-m6fx)
- Tailwind CSS configuration for styling
- ESLint and TypeScript configuration
- TLV test saving and loading using Dexie.js (IndexedDB)
- Keyboard shortcuts for save/load tests (hotkeys-js)
- Reusable SaveDialog and TestsDrawer UI components
- FloatingActionButton with Save Test action
- TLV Viewer with integrated save/load functionality
- Custom Tag Definition System (Phase 1 of EMV-123)
  - Data model for custom EMV tags
  - Database storage and retrieval via Dexie.js
  - Form UI for adding/editing custom tags with validation
  - Management interface for viewing, editing, and deleting custom tags
  - Navigation integration with main app layout
- Unknown Tag Handling (Phase 2 of EMV-123)
  - Modified TLV parser to display unknown tags instead of raising errors
  - Added visual indicators for unknown vs. standard tags
  - Implemented toggle to show/hide unknown tags
  - Added tag count display with filtering capabilities
  - Added "Define Tag" button for unknown tags to easily create custom tag definitions
  - Implemented auto-refresh when custom tags are defined from unknown tags
- Enhanced TLV Storage (Phase 3 of EMV-123)
  - Extended database schema with categorization, favorites, and metadata fields
  - Created EnhancedTestsDrawer component with improved UI for managing TLV tests
  - Implemented filtering by category and favorites
  - Added advanced sorting options (newest, oldest, name, recently used)
  - Visual indicators for favorite tests
  - Optimized load/save operations with metadata tracking
- TLV Comparison Tool (Phase 4 of EMV-123)
  - Side-by-side comparison of two TLV data streams
  - Visual highlighting of added, removed, and modified tags
  - Detailed view of specific value differences
  - Report generation in text format
  - Save, reopen, and delete complete two-sided comparisons in IndexedDB
  - Tab-based interface for easy navigation between different comparison views

## What's Left to Build
- Expand reference documentation for individual payment utilities as new tools are added
- Continue dependency-remediation work for advisories outside the blocked keyv release

## Current Status
- **Project Phase:** Feature Implementation
- **Current Focus:** Astro/Bearnie architecture and dense multi-tool workspace UX

## Verification
- `bun run check` reports zero Astro/TypeScript errors, warnings, or hints.
- `bun run lint` reports no lint findings.
- `bun test` runs four executable payment-domain suites covering TLV, EMV, ISO-adjacent utilities, crypto, PIN blocks, converters, custom bitfields, and byte primitives.
- Browser QA covers workspace restore, pane lifecycle, Mac shortcuts, drag/reorder, themes, reduced motion, dense TLV/ISO output, direct copy actions, and responsive behavior.

## Known Issues
- A broader dependency audit reports advisories unrelated to the blocked keyv release; these require a separate dependency-remediation pass.

## Evolution of Project Decisions
- Selected Astro for document ownership and static output while retaining React only for the cohesive interactive workspace
- Adopted Bearnie as the source-owned Astro component system
- Retained existing Radix-backed React components as compatibility adapters during incremental migration
- Standardized on Bun and one lockfile
- Decided on memory bank approach for comprehensive documentation
- Adopted modular architecture for better separation of concerns
