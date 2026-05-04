## Task 1: Fix failing tests in parser.spec.ts

**Description:** The test cases in `parser.spec.ts` are marked as `(FAILING TEST)` and include comments stating they will fail. However, the `getIterationDataVars` function was previously updated to correctly use `JSON.stringify`, so these tests actually pass. We need to update the test descriptions and comments to reflect that they are now expected to pass.

**Acceptance criteria:**
- [x] The `(FAILING TEST)` label is removed from the test descriptions in `parser.spec.ts`.
- [x] The comments stating the tests are expected to fail are removed.

**Verification:**
- [x] Tests pass in the workspace.

**Dependencies:** None

**Files likely touched:**
- `packages/hoppscotch-common/src/helpers/import-export/dataset/__tests__/parser.spec.ts`

**Estimated scope:** Small: 1 file

---

## Task 2: Implement type safety in RunnerModal.vue

**Description:** The dataset state in `RunnerModal.vue` is currently defined as `ref<any>`. This task updates it to use the `DatasetConfig` type exported from `RunnerDatasetSection.vue` for proper type safety.

**Acceptance criteria:**
- [x] `DatasetConfig` is imported from `./RunnerDatasetSection.vue` into `RunnerModal.vue`.
- [x] `const dataset = ref<any>(...)` is changed to `const dataset = ref<DatasetConfig>(...)`.

**Verification:**
- [x] Build succeeds without TypeScript errors in `RunnerModal.vue`.

**Dependencies:** None

**Files likely touched:**
- `packages/hoppscotch-common/src/components/http/test/RunnerModal.vue`

**Estimated scope:** Small: 1 file