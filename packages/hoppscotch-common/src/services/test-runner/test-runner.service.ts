import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { cloneDeep } from "lodash-es"
import { Ref, watch } from "vue"
import { filter } from "rxjs/operators"
import RunnerWorker from "../../workers/runner.worker?worker&inline"
import {
  RunnerWorkerEvent,
  RunnerWorkerMessage,
} from "../../helpers/types/HoppRunnerWorker"
import { createRESTNetworkRequestStream } from "~/helpers/network"
import { useSetting } from "~/composables/settings"
import { captureInitialEnvironmentState } from "~/helpers/RequestRunner"
import {
  HoppTestRunnerDocument,
  TestRunnerConfig,
} from "~/helpers/rest/document"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"
import { HoppTab } from "../tab"

export type TestRunnerOptions = {
  stopRef: Ref<boolean>
} & TestRunnerConfig

export type TestRunnerRequest = HoppRESTRequest & {
  type: "test-response"
  response?: HoppRESTResponse | null
  testResults?: HoppTestResult | null
  isLoading?: boolean
  error?: string
  renderResults?: boolean
  passedTests: number
  failedTests: number
}

export class TestRunnerService extends Service {
  public static readonly ID = "TEST_RUNNER_SERVICE"

  public async runTests(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions
  ) {
    tab.value.document.status = "running"
    tab.value.document.resultCollection = {
      v: collection.v,
      id: collection.id,
      name: collection.name,
      auth: collection.auth,
      headers: collection.headers,
      folders: [],
      requests: [],
      variables: [],
      description: collection.description ?? null,
      preRequestScript: collection.preRequestScript ?? "",
      testScript: collection.testScript ?? "",
    }

    // Reset meta
    tab.value.document.testRunnerMeta = {
      totalRequests: this.countRequests(collection) * (options.iterations || 1),
      completedRequests: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalTime: 0,
    }

    const experimentalSandbox = useSetting(
      "EXPERIMENTAL_SCRIPTING_SANDBOX"
    ).value
    const initialEnvironmentState = captureInitialEnvironmentState()
    const inheritedVariables =
      tab.value.document.inheritedProperties?.variables ?? []

    const worker = new RunnerWorker()

    // UI Update Batching
    let pendingUpdates: RunnerWorkerEvent[] = []
    let rafId: number | null = null

    const flushUpdates = () => {
      if (!tab.value.document.resultCollection) return

      pendingUpdates.forEach((update) => {
        if (update.type === "FOLDER_ADDED") {
          this.addFolderToPath(
            tab.value.document.resultCollection!,
            update.path,
            update.folder
          )
        } else if (update.type === "REQUEST_ADDED") {
          this.addRequestToPath(
            tab.value.document.resultCollection!,
            update.path,
            update.request as TestRunnerRequest
          )
        } else if (update.type === "REQUEST_UPDATED") {
          this.updateRequestAtPath(
            tab.value.document.resultCollection!,
            update.path,
            update.updates
          )

          const { passedTests, failedTests, responseTime } = update.updates
          if (passedTests !== undefined) {
            tab.value.document.testRunnerMeta.totalTests +=
              passedTests + failedTests
            tab.value.document.testRunnerMeta.passedTests += passedTests
            tab.value.document.testRunnerMeta.failedTests += failedTests
            tab.value.document.testRunnerMeta.totalTime += responseTime || 0
            tab.value.document.testRunnerMeta.completedRequests += 1
          }
        }
      })
      pendingUpdates = []
      rafId = null
    }

    const queueUpdate = (update: RunnerWorkerEvent) => {
      pendingUpdates.push(update)
      if (!rafId) rafId = requestAnimationFrame(flushUpdates)
    }

    const stopWatcher = watch(
      () => options.stopRef.value,
      (stop) => {
        if (stop) worker.postMessage({ type: "STOP_RUN" })
      }
    )

    return new Promise<void>((resolve, reject) => {
      worker.onmessage = async (event: MessageEvent<RunnerWorkerEvent>) => {
        const data = event.data

        switch (data.type) {
          case "RUN_STARTED":
            break
          case "FOLDER_ADDED":
          case "REQUEST_ADDED":
          case "REQUEST_UPDATED":
            queueUpdate(data)
            break
          case "EXECUTE_NETWORK_REQUEST": {
            const [stream] = createRESTNetworkRequestStream(
              data.effectiveRequest as any
            )
            const response = await stream
              .pipe(
                filter(
                  (res) =>
                    res.type === "success" ||
                    res.type === "fail" ||
                    res.type === "network_fail"
                )
              )
              .toPromise()
            worker.postMessage({
              type: "NETWORK_RESPONSE",
              id: data.id,
              response: response!,
            })
            break
          }
          case "RUN_COMPLETE":
            tab.value.document.status = "stopped"
            worker.terminate()
            stopWatcher()
            if (rafId) cancelAnimationFrame(rafId)
            flushUpdates()
            resolve()
            break
          case "ERROR":
            tab.value.document.status = "error"
            worker.terminate()
            stopWatcher()
            if (rafId) cancelAnimationFrame(rafId)
            reject(new Error(data.error))
            break
        }
      }

      worker.postMessage(
        cloneDeep({
          type: "START_RUN",
          collection,
          initialEnvironmentState,
          inheritedVariables: inheritedVariables as any,
          iterations: options.iterations || 1,
          dataset: options.dataset?.data || [],
          experimentalSandbox,
          keepVariableValues: options.keepVariableValues,
          stopOnError: options.stopOnError,
          persistResponses: options.persistResponses,
          delay: options.delay || 0,
        } as RunnerWorkerMessage)
      )
    })
  }

  private addFolderToPath(
    collection: HoppCollection,
    path: number[],
    folder: HoppCollection
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Add the folder at the specified index
    if (path.length > 0) {
      current.folders[path[path.length - 1]] = folder
    }
  }

  private addRequestToPath(
    collection: HoppCollection,
    path: number[],
    request: TestRunnerRequest
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Add the request at the specified index
    if (path.length > 0) {
      current.requests[path[path.length - 1]] = request
    }
  }

  private updateRequestAtPath(
    collection: HoppCollection,
    path: number[],
    updates: Partial<TestRunnerRequest>
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Update the request at the specified index
    if (path.length > 0) {
      const index = path[path.length - 1]
      current.requests[index] = {
        ...current.requests[index],
        ...updates,
      } as TestRunnerRequest
    }
  }

  private countRequests(collection: HoppCollection): number {
    let count = collection.requests.length
    for (const folder of collection.folders) {
      count += this.countRequests(folder)
    }
    return count
  }
}
