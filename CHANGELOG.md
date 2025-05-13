# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
