# Active Context

## Current Work Focus

- Setting up project structure and foundational components
- Establishing memory bank documentation for the project
- Planning initial implementation of the core modules

## Recent Changes

- Implemented persistent storage for TLV and ISO 8583 tests using Dexie.js (IndexedDB)
- Added keyboard shortcuts (Ctrl+S/⌘+S to save, Ctrl+O/⌘+O to load) via hotkeys-js
- Created reusable `SaveDialog` and `TestsDrawer` components for saving/loading tests
- Updated `FloatingActionButton` to include a Save Test action
- Integrated save/load UI and logic into the TLV Viewer component

## Next Steps

1. Define core data types for EMV tags, ISO 8583 messages, and cryptographic functions
2. Implement TLV (Tag-Length-Value) parsing and formatting utilities
3. Create the base UI layout with navigation between different tools
4. Build the EMV tag editor/viewer component
5. Implement ISO 8583 message builder component

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
