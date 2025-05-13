# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- TLV Comparison Tool (EMV-123 Phase 4)
  - Side-by-side comparison of two TLV data streams
  - Visual highlighting for added, removed, and modified tags
  - Detailed difference view with specific value changes
  - Report generation with copy/download capabilities
  - Tab-based interface for navigating between different views
  - Integration with enhanced storage for loading saved TLV data
- Enhanced TLV Storage (EMV-123 Phase 3)
  - Extended database schema with categorization and metadata
  - Improved filtering and sorting capabilities
  - Favorites system with visual indicators
  - Recently accessed tracking
  - Category-based organization

### Added (2025-05-13)
- Unknown Tag Handling (EMV-123 Phase 2)
  - Modified TLV parser to display unknown tags instead of raising errors
  - Added visual styling to distinguish unknown and custom tags
  - Implemented toggle controls to show/hide unknown tags
  - Added tag count display with filtering capabilities
  - Added "Define Tag" button for unknown tags to easily create custom tag definitions
  - Implemented auto-refresh when custom tags are defined from unknown tags

- Custom Tag Definition System (EMV-123 Phase 1)
  - Data model for custom EMV tags with validation
  - Database layer using Dexie.js for storing custom tag definitions
  - Custom Tag Form UI for adding/editing tag definitions
  - Custom Tag Manager interface for viewing, searching, and managing tags
  - Navigation integration in main application layout

### Added (Initial Implementation)
- Project initialized with React + TypeScript + Vite
- Shadcn/UI component library and Tailwind CSS configured
- ESLint and TypeScript strict config
- Memory Bank documentation system established
- Core TLV parsing utilities and types implemented
- TLV Viewer UI with input, display, and error handling
- Persistent storage for TLV and ISO 8583 tests using Dexie.js (IndexedDB)
- Keyboard shortcuts (Ctrl+S/⌘+S to save, Ctrl+O/⌘+O to load) via hotkeys-js
- Reusable `SaveDialog` and `TestsDrawer` components for saving/loading tests
- `FloatingActionButton` updated to include Save Test action
- Integrated save/load UI and logic into the TLV Viewer component
- Modular architecture for easy extension (ISO 8583, EMV, Crypto utilities)
