# Hoppscotch Data

## Core Knowledge Map

### 1. Variable Parsing (The `<< >>` System)
- **File**: `src/environment/index.ts`
- **Regex**: `const REGEX_ENV_VAR = /<<([^>]*)>>/g`
- **Logic**:
  - `parseTemplateStringE`: Recursively resolves placeholders up to 10 levels deep (`ENV_MAX_EXPAND_LIMIT`).
  - `parseBodyEnvVariablesE`: Specifically for request bodies.

### 2. Entity Schemas (Verzod)
- Uses `verzod` for versioned data schemas.
- **Collection**: `src/collection/index.ts` (Current Version: 12).
- **Environment**: `src/environment/index.ts` (Current Version: 2).

### 3. Collection Hierarchy
- Requests and Folders are nested.
- Inherited properties (Auth, Headers) are computed by traversing the tree up to the root.
