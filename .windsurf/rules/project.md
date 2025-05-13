---
trigger: always_on
---

- This application will serve as a unified platform for payment technology professionals to manage, test, and modify EMV tags and ISO 8583 messages, with additional cryptographic and encoding utilities.

┌─────────────────────────────────────────────────────────┐
│ Application │
├───────────┬───────────┬────────────┬───────────┬────────┤
│ Core UI │ Crypto │ Card Data │ ISO 8583 │ EMV │
│ Components│ Utilities │ Processors │ Tools │ Tools │
└───────────┴───────────┴────────────┴───────────┴────────┘

Detailed Architecture

Frontend:

React + TypeScript for type safety
Shadcn/UI for consistent, accessible components
React Router for navigation
State management with Context API or Redux
Jotai for atomic state management of complex forms
Runtime : Bun
