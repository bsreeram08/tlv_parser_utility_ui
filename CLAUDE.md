# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Management
- Use Bun for dependency management and scripts. `bun.lock` is the only lockfile.

### Development Server
- `bun run dev` - Start the Astro development server (defaults to http://localhost:4321)
- `bun run preview` - Preview the static production build

### Build & Quality
- `bun run check` - Run Astro and TypeScript checks
- `bun run build` - Run the keyv advisory gate, Astro checks, and the static production build
- `bun run lint` - Run ESLint for code quality
- `bun run test` - Run executable payment-domain test suites
- `bun run security:advisories` - Reject the malicious `keyv@6.0.0` release
- `firebase deploy --only hosting --project srbwebapp-73021` - Deploy the verified `dist` build to Firebase Hosting

## Project Architecture

### Core Modules
This is a payment technology toolkit with several distinct modules:

1. **TLV (Tag-Length-Value) Tools** - Primary focus
   - Parse and visualize EMV tags
   - Save/load test cases with persistent storage
   - Custom tag definitions and registry

2. **ISO 8583 Tools**
   - Parse financial messages
   - Modular field registry system

3. **Cryptographic and PIN Utilities**
4. **Workspace Appearance and Persistence**

### Key Directories

#### `/src/components/`
- `bearnie/` - Source-owned Bearnie Astro components; use these for new static UI
- `ui/tlv-viewer/` - Main TLV parsing and display components
- `ui/iso-builder/` - ISO 8583 message tools
- `ui/custom-tags/` - Custom tag management
- `ui/tlv-comparison/` - TLV comparison tools

#### Astro application shell
- `pages/index.astro` - Static route and native Bearnie loading fallback
- `layouts/BaseLayout.astro` - Document metadata, global styles, and pre-hydration theme setup
- `islands/WorkspaceIsland.tsx` - The single interactive React workspace boundary
- `tools/registry.ts` - Lazy-loaded tool catalog

#### `/src/utils/`
- `tlv/` - TLV parsing, formatting, and tag registry
- `iso8583/` - ISO 8583 parsing and field definitions
- `db/` - Dexie.js database for persistent storage
- `crypto/` - Cryptographic and PIN-block utilities

#### `/src/types/`
- Type definitions for TLV, ISO 8583, and custom tags
- Follows EMV specifications for data structures

### Technical Stack
- **Application shell**: Astro 7 with static output
- **Interactive workspace**: One React 19 island with lazy-loaded tool views
- **UI**: Source-owned Bearnie Astro components and semantic Bearnie tokens
- **Compatibility layer**: Existing Radix-backed React primitives under `src/components/ui/`
- **State**: Jotai for state management
- **Storage**: Dexie.js (IndexedDB wrapper)
- **Styling**: Tailwind CSS v4 with theme support

### Data Flow Architecture
- Component-based architecture with modular responsibilities
- Type-safe implementation with comprehensive TypeScript types
- Unidirectional data flow with immutable data structures
- Repository pattern for database operations

## Key Features

### TLV Processing
- Hex input parsing and validation
- Tag identification via registry system
- Support for both primitive and constructed tags
- Custom tag definitions with persistent storage
- Test case management with categories and tags

### Custom Tag UI Components
- **Terminal Capabilities (9F33)** - Bit field editor for terminal capabilities
- **Application Interchange Profile (82)** - Card capability bit field display
- **Terminal Verification Results (95)** - Verification status with issue detection
- **CVM Results (9F34)** - Cardholder verification method results with status
- **Transaction Date (9A)** - Date picker with YYMMDD format and presets
- **Currency Code (5F2A)** - ISO 4217 currency selector with symbols
- **Transaction Type (9C)** - ISO 8583 transaction type categorized selector
- **Amount Authorised (9F02)** - Currency formatter with major/minor units

### TLV Comparison
- Side-by-side comparison of TLV data streams
- Synchronized tag view for easy alignment
- Missing tag detection and highlighting
- Visual difference indicators (match/different/missing)
- Responsive layout with full-width support

### Keyboard Shortcuts
- `Ctrl+S` / `⌘+S` - Save current test
- `Ctrl+O` / `⌘+O` - Load test

### Database Schema
Uses Dexie.js with multiple tables:
- `tlvTests` - Saved TLV test cases
- `isoTests` - Saved ISO 8583 test cases  
- `customTags` - Custom tag definitions
- `tlvComparisons` - Saved TLV comparisons

## Development Patterns

### Component Structure
- Components follow consistent patterns with TypeScript interfaces
- Use Bearnie components for new Astro UI and Bearnie semantic tokens throughout
- Treat `src/components/ui/` as a React-island compatibility layer, not as shadcn-owned generated code
- Props are typed with clear interfaces
- Error boundaries for graceful error handling

### Data Processing
- Input → Validation → Processing → Output pattern
- Consistent error handling across all operations
- Input sanitization before processing
- Immutable data structures to prevent side effects

### File Organization
- Related functionality grouped in directories
- Index files for clean imports
- Types defined separately from implementation
- Utility functions separate from components

## Memory Bank System

The project uses a comprehensive documentation system in `/memory-bank/`:
- `activeContext.md` - Current development focus
- `progress.md` - Implementation status
- `systemPatterns.md` - Architecture patterns
- `techContext.md` - Technical constraints
- `productContext.md` - User experience goals

## Configuration

### Path Aliases
- `@/` - Points to `/src/` directory
- Used throughout the codebase for clean imports

### ESLint Configuration
- TypeScript ESLint with React plugins
- Relaxed rules for `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars`
- React Hooks rules enabled; Astro owns the application build pipeline

### Astro Configuration
- React integration hydrates only `WorkspaceIsland`
- Tailwind CSS is connected through the Astro Vite pipeline
- Static output is the default deployment target
- Path alias `@` resolves to `/src`
- Heavy tool views must stay lazy-loaded through `src/tools/registry.ts`
