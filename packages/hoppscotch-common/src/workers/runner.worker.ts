import {
  HoppCollection,
  HoppRESTRequest,
  HoppCollectionVariable,
  HoppRESTHeaders,
} from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import {
  RunnerWorkerMessage,
  RunnerWorkerEvent,
} from "../helpers/types/HoppRunnerWorker"
import { hasActualScript, combineScriptsWithIIFE } from "../helpers/scripting"
import { getEffectiveRESTRequest } from "../helpers/utils/EffectiveURL"
import { runPreRequestScript, runTestScript } from "@hoppscotch/js-sandbox/web"
import {
  combineEnvVariables,
  filterNonEmptyEnvironmentVariables,
  getTestableBody,
  translateToSandboxTestResults,
} from "../helpers/runner/worker-utils"
import { HoppRESTResponse } from "../helpers/types/HoppRESTResponse"

/**
 * The Runner Worker handles the orchestration of collection runs,
 * script execution, and variable resolution in a background thread.
 */

let stopRequested = false
const pendingNetworkRequests = new Map<
  string,
  (res: HoppRESTResponse) => void
>()
let currentOptions: Extract<RunnerWorkerMessage, { type: "START_RUN" }> | null =
  null

self.onmessage = async (event: MessageEvent<RunnerWorkerMessage>) => {
  const message = event.data

  switch (message.type) {
    case "START_RUN":
      stopRequested = false
      currentOptions = message
      await handleStartRun(message)
      break
    case "STOP_RUN":
      stopRequested = true
      break
    case "NETWORK_RESPONSE":
      const resolve = pendingNetworkRequests.get(message.id)
      if (resolve) {
        resolve(message.response)
        pendingNetworkRequests.delete(message.id)
      }
      break
  }
}

async function handleStartRun(
  message: Extract<RunnerWorkerMessage, { type: "START_RUN" }>
) {
  try {
    const {
      collection,
      iterations,
      dataset,
      initialEnvironmentState,
      inheritedVariables,
    } = message
    self.postMessage({ type: "RUN_STARTED" } as RunnerWorkerEvent)

    // Work on a copy of the environments
    const currentEnvs = cloneDeep(initialEnvironmentState.initialEnvs)

    for (let i = 0; i < iterations; i++) {
      if (stopRequested) break

      const iterationData =
        dataset.length > 0 ? dataset[i % dataset.length] : undefined
      if (iterationData) {
        const tempVars = Object.entries(iterationData).map(([key, value]) => ({
          key,
          value: String(value),
          initialValue: String(value),
          currentValue: String(value),
          secret: false,
        }))
        // Ensure temp exists
        currentEnvs.temp = [...(currentEnvs.temp || []), ...tempVars]
      }

      const parentPath = iterations > 1 ? [i] : []

      if (iterations > 1) {
        self.postMessage({
          type: "FOLDER_ADDED",
          path: parentPath,
          folder: {
            v: collection.v,
            id: `${collection.id}-iter-${i}`,
            name: `Iteration ${i + 1}`,
            folders: [],
            requests: [],
            auth: { authType: "inherit", authActive: true },
            headers: [],
            variables: [],
          } as any,
        } as RunnerWorkerEvent)
      }

      await runTestCollection(
        collection,
        parentPath,
        currentEnvs,
        inheritedVariables,
        [], // ancestorPreRequestScripts
        [], // ancestorTestScripts
        undefined, // parentAuth
        [], // parentHeaders
        initialEnvironmentState
      )
    }

    self.postMessage({ type: "RUN_COMPLETE" } as RunnerWorkerEvent)
  } catch (error) {
    if (error instanceof Error && error.message === "Test execution stopped") {
      // Expected stop
    } else {
      self.postMessage({
        type: "ERROR",
        error: error instanceof Error ? error.message : String(error),
      } as RunnerWorkerEvent)
    }
  }
}

async function runTestCollection(
  collection: HoppCollection,
  path: number[],
  currentEnvs: any,
  parentVariables: HoppCollectionVariable[],
  parentPreRequestScripts: string[],
  parentTestScripts: string[],
  parentAuth: HoppRESTRequest["auth"] | undefined,
  parentHeaders: HoppRESTHeaders,
  initialEnvironmentState: any
) {
  if (stopRequested) throw new Error("Test execution stopped")

  const inheritedAuth =
    collection.auth?.authType === "inherit" && collection.auth.authActive
      ? parentAuth || { authType: "none", authActive: false }
      : collection.auth || { authType: "none", authActive: false }

  const inheritedHeaders: HoppRESTHeaders = [
    ...(parentHeaders || []),
    ...collection.headers,
  ]

  const inheritedVariables = [
    ...(parentVariables || []),
    ...(collection.variables || []),
  ]

  const inheritedPreRequestScripts = [
    ...parentPreRequestScripts,
    ...(hasActualScript(collection.preRequestScript)
      ? [collection.preRequestScript]
      : []),
  ]
  const inheritedTestScripts = [
    ...parentTestScripts,
    ...(hasActualScript(collection.testScript) ? [collection.testScript] : []),
  ]

  // Process sub-folders recursively
  for (let i = 0; i < collection.folders.length; i++) {
    const folder = collection.folders[i]
    const currentPath = [...path, i]

    self.postMessage({
      type: "FOLDER_ADDED",
      path: currentPath,
      folder: { ...cloneDeep(folder), folders: [], requests: [] } as any,
    } as RunnerWorkerEvent)

    await runTestCollection(
      folder,
      currentPath,
      currentEnvs,
      inheritedVariables,
      inheritedPreRequestScripts,
      inheritedTestScripts,
      inheritedAuth,
      inheritedHeaders,
      initialEnvironmentState
    )
  }

  // Process requests in current collection/folder
  for (let i = 0; i < collection.requests.length; i++) {
    if (stopRequested) throw new Error("Test execution stopped")

    const request = collection.requests[i]
    const currentPath = [...path, i]

    // Inherit auth and headers
    const finalRequest = {
      ...request,
      auth:
        request.auth.authType === "inherit" && request.auth.authActive
          ? inheritedAuth
          : request.auth,
      headers: [...inheritedHeaders, ...request.headers],
    } as HoppRESTRequest

    self.postMessage({
      type: "REQUEST_ADDED",
      path: currentPath,
      request: cloneDeep(finalRequest),
    } as RunnerWorkerEvent)

    await runTestRequest(
      finalRequest,
      currentPath,
      currentEnvs,
      inheritedVariables,
      inheritedPreRequestScripts,
      inheritedTestScripts,
      initialEnvironmentState
    )

    // Optional delay between requests
    if (currentOptions?.delay && currentOptions.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, currentOptions!.delay))
    }
  }
}

async function runTestRequest(
  request: HoppRESTRequest,
  path: number[],
  currentEnvs: any,
  inheritedVariables: HoppCollectionVariable[],
  inheritedPreRequestScripts: string[],
  inheritedTestScripts: string[],
  initialEnvironmentState: any
) {
  self.postMessage({
    type: "REQUEST_UPDATED",
    path,
    updates: { isLoading: true, error: undefined },
  } as RunnerWorkerEvent)

  // 1. Run Pre-request scripts
  const preRequestResult = await delegatePreRequestScriptRunner(
    request,
    currentEnvs,
    inheritedPreRequestScripts
  )

  if (E.isLeft(preRequestResult)) {
    self.postMessage({
      type: "REQUEST_UPDATED",
      path,
      updates: {
        error: preRequestResult.left,
        isLoading: false,
        response: {
          type: "network_fail",
          error: preRequestResult.left,
          req: request,
        },
        testResults: { scriptError: true, expectResults: [], tests: [] },
      },
    } as RunnerWorkerEvent)
    if (currentOptions?.stopOnError) throw new Error("Script execution failed")
    return
  }

  const { updatedEnvs, updatedRequest } = preRequestResult.right
  // Update local environment reference
  currentEnvs.global = updatedEnvs.global
  currentEnvs.selected = updatedEnvs.selected

  // 2. Resolve variables and get Effective Request
  const finalRequestVariables = pipe(
    updatedRequest.requestVariables,
    A.filter(({ active }) => active),
    A.map(({ key, value }) => ({
      key,
      initialValue: value,
      currentValue: value,
      secret: false,
    }))
  )

  const effectiveRequest = await getEffectiveRESTRequest(updatedRequest, {
    id: "env-id",
    v: 2,
    name: "Env",
    variables: filterNonEmptyEnvironmentVariables([
      ...(currentEnvs.temp || []),
      ...combineEnvVariables({
        environments: {
          ...updatedEnvs,
          temp: [],
        },
        requestVariables: finalRequestVariables as any,
        collectionVariables: inheritedVariables,
      }),
    ]),
  })

  // 3. Delegate Network Request to Main Thread
  const response = await delegateNetworkRequest(effectiveRequest)

  if (response.type === "network_fail" || response.type === "network_fail") {
    self.postMessage({
      type: "REQUEST_UPDATED",
      path,
      updates: {
        error: "Request execution failed",
        isLoading: false,
        response,
        testResults: { scriptError: false, expectResults: [], tests: [] },
      },
    } as RunnerWorkerEvent)
    if (currentOptions?.stopOnError) throw new Error("Network request failed")
    return
  }

  // 4. Run Post-request (Test) scripts
  const postRequestScriptResult = await runPostRequestScript(
    currentEnvs,
    response.req,
    {
      status: response.statusCode,
      body: getTestableBody(response),
      headers: response.headers,
      statusText: response.statusText,
      responseTime: response.meta.responseDuration,
    },
    inheritedTestScripts
  )

  if (E.isRight(postRequestScriptResult)) {
    const combinedResult = {
      ...postRequestScriptResult.right,
      consoleEntries: [
        ...(preRequestResult.right.consoleEntries ?? []),
        ...(postRequestScriptResult.right.consoleEntries ?? []),
      ],
    }

    const sandboxTestResult = translateToSandboxTestResults(
      combinedResult as any,
      initialEnvironmentState.initialGlobalEnvs,
      initialEnvironmentState.initialSelectedEnvs
    )

    const { passed, failed } = getTestResultInfo(sandboxTestResult)

    // Update environments for subsequent requests in the same run
    currentEnvs.global = postRequestScriptResult.right.envs.global
    currentEnvs.selected = postRequestScriptResult.right.envs.selected

    self.postMessage({
      type: "REQUEST_UPDATED",
      path,
      updates: {
        ...cloneDeep(updatedRequest),
        ...cloneDeep(response.req),
        testResults: sandboxTestResult,
        response: currentOptions?.persistResponses ? response : null,
        isLoading: false,
        passedTests: passed,
        failedTests: failed,
        responseTime: response.meta.responseDuration,
      },
    } as RunnerWorkerEvent)
  } else {
    // Post-request script error
    self.postMessage({
      type: "REQUEST_UPDATED",
      path,
      updates: {
        error: "Post-request script failed",
        isLoading: false,
        response,
        testResults: { scriptError: true, expectResults: [], tests: [] },
      },
    } as RunnerWorkerEvent)
    if (currentOptions?.stopOnError)
      throw new Error("Post-request script failed")
  }
}

function getTestResultInfo(testResult: any) {
  let passed = 0
  let failed = 0
  if (testResult.expectResults) {
    for (const result of testResult.expectResults) {
      if (result.status === "pass") passed++
      else if (result.status === "fail") failed++
    }
  }
  if (testResult.tests) {
    for (const nestedTest of testResult.tests) {
      const nestedResult = getTestResultInfo(nestedTest)
      passed += nestedResult.passed
      failed += nestedResult.failed
    }
  }
  return { passed, failed }
}

async function delegatePreRequestScriptRunner(
  request: HoppRESTRequest,
  envs: any,
  inheritedPreRequestScripts: string[]
): Promise<E.Either<string, any>> {
  const { preRequestScript } = request
  const target = currentOptions?.experimentalSandbox ? "experimental" : "legacy"
  const combinedScript = combineScriptsWithIIFE(
    [...inheritedPreRequestScripts, preRequestScript],
    target
  )

  if (combinedScript.length === 0) {
    return E.right({
      updatedEnvs: envs,
      updatedRequest: request,
      consoleEntries: [],
    })
  }

  return runPreRequestScript(combinedScript, {
    envs,
    request,
    experimentalScriptingSandbox: currentOptions?.experimentalSandbox,
  } as any)
}

async function runPostRequestScript(
  envs: any,
  request: HoppRESTRequest,
  response: any,
  inheritedTestScripts: string[]
): Promise<E.Either<string, any>> {
  const { testScript } = request
  const target = currentOptions?.experimentalSandbox ? "experimental" : "legacy"
  const combinedScript = combineScriptsWithIIFE(
    [testScript, ...inheritedTestScripts.slice().reverse()],
    target
  )

  if (combinedScript.length === 0) {
    return E.right({
      tests: { descriptor: "root", expectResults: [], children: [] },
      envs,
      consoleEntries: [],
    })
  }

  return runTestScript(combinedScript, {
    envs,
    request,
    response,
    experimentalScriptingSandbox: currentOptions?.experimentalSandbox,
  } as any)
}

async function delegateNetworkRequest(
  effectiveRequest: any
): Promise<HoppRESTResponse> {
  const id = Math.random().toString(36).substring(7)
  return new Promise((resolve) => {
    pendingNetworkRequests.set(id, resolve)
    self.postMessage({
      type: "EXECUTE_NETWORK_REQUEST",
      id,
      effectiveRequest,
    } as RunnerWorkerEvent)
  })
}
