# Payment Technology Toolkit

A unified platform for payment technology professionals to manage, test, and modify EMV tags and ISO 8583 messages, with cryptographic and encoding utilities.

---

## Features

- **TLV (Tag-Length-Value) Parser & Viewer**

  - Parse, visualize, and validate TLV data (EMV tags)
  - Save and load test cases with descriptions and tags
  - Copy results as JSON, view errors, and load examples
  - Keyboard shortcuts for save/load (Ctrl+S/⌘+S, Ctrl+O/⌘+O)

- **ISO 8583 Parser (In Progress)**

  - Parse and inspect ISO 8583 financial messages
  - Modular field registry for easy extension

- **Persistent Storage**

  - Local IndexedDB (Dexie.js) for saving test cases
  - Reusable dialogs and drawers for test management

- **Modern UI/UX**

  - Built with React, TypeScript, Shadcn/UI, and Tailwind CSS
  - Responsive, accessible, and themeable (light/dark mode)

- **Extensible Architecture**
  - Modular utilities for EMV, ISO, cryptography, and card data
  - Easy to add new tools and features

---

## Getting Started

1. **Install dependencies:**
   ```sh
   bun install
   # or
   npm install
   ```
2. **Run the development server:**
   ```sh
   bun run dev
   # or
   npm run dev
   ```
3. **Open your browser:**
   Visit [http://localhost:5173](http://localhost:5173) (or as shown in your terminal)

---

## Project Structure

- `src/components/ui/` – UI components (TLV viewer, dialogs, drawers, FAB, etc.)
- `src/utils/` – Parsing, formatting, and registry utilities for TLV, ISO 8583, etc.
- `src/types/` – TypeScript types for payment data structures
- `src/hooks/` – Custom React hooks (e.g., for keyboard shortcuts)
- `src/utils/db/` – Dexie.js database for persistent storage
- `memory-bank/` – Project documentation and context (Memory Bank system)

---

## Keyboard Shortcuts

- **Save Test:** Ctrl+S / ⌘+S
- **Load Test:** Ctrl+O / ⌘+O

---

## Documentation & Memory Bank

Project context, architecture, and progress are documented in the `memory-bank/` directory. See:

- `activeContext.md` – Current focus, recent changes, next steps
- `progress.md` – What works, what's left, known issues
- `systemPatterns.md`, `techContext.md`, etc.

---

## License

MIT (or specify your license here)
