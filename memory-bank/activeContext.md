# Active Context

## Recent Changes (2025-05-14)

### UI Theme and Color Fixes

- Fixed UI color issues by reverting to Tailwind CSS utility classes for backgrounds and text, ensuring consistent appearance across all components.
- Removed the highlight feature from tag actions and related components, as it was deemed unnecessary.
- Ensured all tag rendering and comparison tables use clear, accessible color schemes (green for added, red for removed, amber for modified).

### TLV Viewer Redesign

- Replaced the old TLV display with `CompactTlvDisplay` for a much cleaner, scannable layout.
- All tags are now visible at a glance, with expandable rows for detailed info.
- Tag descriptions are available as tooltips on hover.
- Placeholder UI is shown for tag-specific rendering (e.g., tag `9C`).
- Value tabs allow toggling between hex, ASCII, binary, and decimal.
- Unknown and custom tags are visually distinct.

### TLV Comparison Tool Redesign

- Old comparison UI replaced by a new, unified, and simplified tool (`SimplifiedTlvComparison`).
- Inputs for two TLV streams with clear labels and load-from-drawer integration.
- Unified table view: all tags from both streams are shown in a single table, with side-by-side values.
- Color-coded highlighting for added (green), removed (red), and modified (amber) tags.
- Differences summary and report tab for easy text export.
- Copy-to-clipboard for reports.
- All logic for tag mapping, difference calculation, and unified row generation is now memoized and more efficient.

### Codebase/UX Improvements

- App module type and navigation updated for new features.
- All previous comparison and display logic replaced in favor of new, user-driven design.

## Upcoming Tasks / Ideas

- Implement custom UI renderers for specific tags (e.g., full UI for tag `9C` Transaction Type, CVR, etc.).
- Allow users to register custom tag UIs via config/code.
- Add quick search/filter for tags in the TLV viewer.
- Option to collapse/expand all tags at once.
- Add more advanced binary/bitfield visualizations for certain tags (e.g., CVR, IAD breakdowns).
- Integrate contextual help/docs for each tag.
- Improve accessibility and keyboard navigation for all new UI components.
- Add test coverage for new display and comparison logic.
- Refactor legacy components to match new design patterns.

## Current Work Focus

- Implementing enhanced TLV parsing with custom tag definition (Ticket EMV-123)
- Supporting unknown tag display in the TLV parser
- Creating a tag comparison tool with visual differencing
- Improving TLV data storage and retrieval functionality

## Recent Changes

- Implemented persistent storage for TLV and ISO 8583 tests using Dexie.js (IndexedDB)
- Added keyboard shortcuts (Ctrl+S/⌘+S to save, Ctrl+O/⌘+O to load) via hotkeys-js
- Created reusable `SaveDialog` and `TestsDrawer` components for saving/loading tests
- Updated `FloatingActionButton` to include a Save Test action
- Integrated save/load UI and logic into the TLV Viewer component

## Next Steps

1. Phase 1: Implement custom tag definition system

   - Create data model for custom tags
   - Implement storage and retrieval
   - Build UI for tag management
   - Integrate with existing TLV parser

2. Phase 2: Implement unknown tag handling

   - Modify parser to display unknown tags
   - Add appropriate styling and indicators
   - Implement filtering options

3. Phase 3: Enhance TLV storage system

   - Extend data model for saved TLV samples
   - Improve the categorization and search features
   - Enhance the library management UI

4. Phase 4: Build comparison tool
   - Implement comparison algorithm
   - Build side-by-side visualization UI
   - Add difference highlighting and navigation

## Active Decisions and Considerations

- Using Jotai for form state management due to atomic update requirements
- Adopting TypeScript with strict type checking for all data structures
- Following a modular approach with domain-specific utilities
- Prioritizing type safety and validation for all payment data handling

## Important Patterns and Preferences

- PascalCase for React components
- camelCase for variables, functions, and methods
- kebab-case for file and directory names
- Descriptive prefixes for specific tool categories (crypto, emv, iso, pin, card)
- Single responsibility components with clear documentation

## Learnings and Project Insights

- React 19 introduces new features that can improve performance for this application
- Proper type definitions for payment industry standards will be critical for maintainability
- Shadcn/UI components provide accessibility features needed for enterprise applications
- Careful state management will be essential for complex form handling
- Cryptographic operations require thorough validation and error handling
