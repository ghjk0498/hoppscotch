# Hoppscotch JS Sandbox

## Core Knowledge Map

### 1. Execution Environments
- **Legacy**: Runs in a Web Worker via `Function` constructor.
- **Experimental**: Runs in a secure QuickJS isolate via `faraday-cage`.

### 2. Scripting API (The `pw` and `pm` objects)
- **Base Inputs**: `src/cage-modules/utils/base-inputs.ts`
- **Variable Access**: `src/utils/shared.ts` (`getSharedEnvMethods`)
- **Data Flow**:
  - Scripting context receives `TestResult["envs"]`.
  - Values are serialized to strings when crossing the boundary back to the host.
  - Supports complex types (arrays, objects) *during* script execution, but these are JSON-stringified on exit.

### 3. Pre-Request vs Test Scripts
- **Pre-Request**: Can mutate the `request` object (URL, headers, body).
- **Test Scripts**: Runs after response, handles assertions.
