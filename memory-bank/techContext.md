# Technical Context

## Technology Stack

### Frontend
- **Framework:** React 19 with TypeScript
- **UI Components:** Shadcn/UI (based on Radix UI primitives)
- **State Management:** 
  - Context API for global application state
  - Jotai for atomic state management of complex forms
- **Styling:** Tailwind CSS with custom utilities
- **Runtime:** Bun
- **Build Tool:** Vite
- **Form Handling:** React Hook Form with Zod validation

### Key Dependencies
- **Cryptography:** crypto-js for standard cryptographic operations
- **Data Manipulation:** buffer for binary data handling
- **Numerical Precision:** jsbi for precise integer arithmetic
- **UI Components:**
  - Radix UI primitives for accessible components
  - Tailwind CSS for styling
  - Lucide React for icons
  - React Day Picker for date inputs
  - Recharts for data visualization
  - Sonner for toast notifications

## Development Setup
- TypeScript for type safety
- ESLint for code quality
- Vite for fast development server and building
- Path aliases for clean imports

## Technical Constraints
- All cryptographic operations must use well-established, reviewed libraries
- Browser security limitations for certain cryptographic operations
- Memory limitations when handling large message sets
- Cross-browser compatibility requirements
- Accessibility compliance for all UI components

## Dependencies
- Node.js/Bun environment
- Modern browser with ES6+ support
- Secure context for certain cryptographic operations

## Tool Usage Patterns

### Development Workflow
1. Local development with Vite dev server
2. TypeScript compilation with strict type checking
3. ESLint for code quality enforcement
4. Component-driven development with isolated testing

### Deployment Considerations
- Static site deployment possible (no server-side requirements)
- Environment variables for API configurations
- Potential for PWA functionality
- Version management for backward compatibility
