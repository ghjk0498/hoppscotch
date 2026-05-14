import {
  HoppCollection,
  HoppRESTRequest,
  HoppCollectionVariable,
} from "@hoppscotch/data"
import { HoppRESTResponse } from "./HoppRESTResponse"
import { InitialEnvironmentState } from "../RequestRunner"

/**
 * Messages sent from the Main Thread to the Runner Worker
 */
export type RunnerWorkerMessage =
  | {
      type: "START_RUN"
      collection: HoppCollection
      initialEnvironmentState: InitialEnvironmentState
      inheritedVariables: HoppCollectionVariable[]
      iterations: number
      dataset: any[]
      experimentalSandbox: boolean
      keepVariableValues: boolean
      stopOnError: boolean
      persistResponses: boolean
      delay: number
    }
  | {
      type: "STOP_RUN"
    }
  | {
      type: "NETWORK_RESPONSE"
      id: string
      response: HoppRESTResponse
    }

/**
 * Events sent from the Runner Worker to the Main Thread
 */
export type RunnerWorkerEvent =
  | {
      type: "RUN_STARTED"
    }
  | {
      type: "FOLDER_ADDED"
      path: number[]
      folder: HoppCollection
    }
  | {
      type: "REQUEST_ADDED"
      path: number[]
      request: HoppRESTRequest
    }
  | {
      type: "REQUEST_UPDATED"
      path: number[]
      updates: any
    }
  | {
      type: "EXECUTE_NETWORK_REQUEST"
      id: string
      effectiveRequest: HoppRESTRequest
    }
  | {
      type: "RUN_COMPLETE"
    }
  | {
      type: "ERROR"
      error: string
    }
