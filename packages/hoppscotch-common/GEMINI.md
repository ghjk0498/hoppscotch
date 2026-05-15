# Hoppscotch Common

## Core Logic Map

### 1. Request Execution Flow
- **Entry Point**: `runRESTRequest$` (in `helpers/RequestRunner.ts`)
- **Lifecycle**:
  1. `captureInitialEnvironmentState`: Captures a snapshot of current envs.
  2. `delegatePreRequestScriptRunner`: Runs pre-request scripts in sandbox.
  3. `getEffectiveRESTRequest`: Resolves all `<<placeholders>>` using `hoppscotch-data` utilities.
  4. `createRESTNetworkRequestStream`: Actual network I/O.
  5. `runPostRequestScript`: Runs test scripts and assertions.

### 2. Test Runner (Collection Runner)
- **Entry Point**: `TestRunnerService.runTests` (in `services/test-runner/test-runner.service.ts`)
- **Data Flow**:
  - Iterates through `iterations`.
  - Injects `iterationData` into `initialEnvs.temp`.
  - **Priority Rule (Fixed)**: `Iteration Data` > `Request Variables` > `Selected Environment` > `Collection Variables` > `Global`.
  - Results are progressively added to `tab.value.document.resultCollection`.

### 3. Variable Resolution
- **Helper**: `combineEnvVariables` in `RequestRunner.ts`.
- **Placeholder Syntax**: `<<variable_name>>`.
- **Underlying Engine**: `parseTemplateStringE` in `@hoppscotch/data`.

## Important Files
- `src/helpers/RequestRunner.ts`: Orchestrates the entire request/response lifecycle.
- `src/services/test-runner/test-runner.service.ts`: Logic for running multiple requests in a collection.
- `src/helpers/utils/EffectiveURL.ts`: Applies variables to URL, headers, and body.
