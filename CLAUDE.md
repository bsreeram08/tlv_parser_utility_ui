# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Management
- Use `bun install` or `npm install` for dependencies
- Use `bun` or `npm` for running scripts

### Development Server
- `bun run dev` or `npm run dev` - Start development server (runs on http://localhost:5173)
- `bun run preview` or `npm run preview` - Preview production build

### Build & Quality
- `bun run build` or `npm run build` - Build for production (TypeScript compilation + Vite build)
- `bun run lint` or `npm run lint` - Run ESLint for code quality

## Project Architecture

### Core Modules
This is a payment technology toolkit with several distinct modules:

1. **TLV (Tag-Length-Value) Tools** - Primary focus
   - Parse and visualize EMV tags
   - Save/load test cases with persistent storage
   - Custom tag definitions and registry

2. **ISO 8583 Parser** - In development
   - Parse financial messages
   - Modular field registry system

3. **Cryptographic Utilities** - Planned
4. **Settings Management** - Planned

### Key Directories

#### `/src/components/`
- `ui/tlv-viewer/` - Main TLV parsing and display components
- `ui/iso-builder/` - ISO 8583 message tools
- `ui/custom-tags/` - Custom tag management
- `ui/tlv-comparison/` - TLV comparison tools
- `layouts/` - Application layout components

#### `/src/utils/`
- `tlv/` - TLV parsing, formatting, and tag registry
- `iso8583/` - ISO 8583 parsing and field definitions
- `db/` - Dexie.js database for persistent storage
- `crypto/` - Cryptographic utilities (planned)

#### `/src/types/`
- Type definitions for TLV, ISO 8583, and custom tags
- Follows EMV specifications for data structures

### Technical Stack
- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Shadcn/UI components + Tailwind CSS
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
- Use Shadcn/UI components as base building blocks
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
- React hooks and refresh plugins enabled

### Vite Configuration
- React plugin with Tailwind CSS
- Path aliases configured for `@/src`
- Development server with hot reload