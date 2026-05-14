import { Environment, HoppRESTHeader } from "@hoppscotch/data"
import { SandboxTestResult, TestDescriptor } from "@hoppscotch/js-sandbox"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { flow, pipe } from "fp-ts/function"
import { HoppRESTResponse } from "../types/HoppRESTResponse"
import { HoppTestData, HoppTestResult } from "../types/HoppTestResult"

export function isJSONContentType(contentType: string) {
  return /\bjson\b/i.test(contentType)
}

/**
 * Parses the response body for testing purposes, handling JSON and stripping null bytes.
 */
export const getTestableBody = (
  res: HoppRESTResponse & { type: "success" | "fail" }
) => {
  const contentTypeHeader = res.headers.find(
    (h: HoppRESTHeader) => h.key.toLowerCase() === "content-type"
  )

  const rawBody = new TextDecoder("utf-8")
    .decode(res.body)
    .replaceAll("\x00", "")

  const x = pipe(
    contentTypeHeader && isJSONContentType(contentTypeHeader.value)
      ? O.of(rawBody)
      : O.none,
    O.chain((body) => O.tryCatch(() => JSON.parse(body))),
    O.getOrElse<any | string>(() => rawBody)
  )

  return x
}

export const getAddedEnvVariables = (
  current: Environment["variables"],
  updated: Environment["variables"]
) => updated.filter((x) => current.findIndex((y) => y.key === x.key) === -1)

export const getRemovedEnvVariables = (
  current: Environment["variables"],
  updated: Environment["variables"]
) => current.filter((x) => updated.findIndex((y) => y.key === x.key) === -1)

export const getUpdatedEnvVariables = (
  current: Environment["variables"],
  updated: Environment["variables"]
) =>
  pipe(
    updated,
    A.filterMap(
      flow(
        O.of,
        O.bindTo("env"),
        O.bind("index", ({ env }) =>
          pipe(
            current.findIndex((x) => x.key === env.key),
            O.fromPredicate((x) => x !== -1)
          )
        ),
        O.chain(
          O.fromPredicate(
            ({ env, index }) => env.currentValue !== current[index].currentValue
          )
        ),
        O.map(({ env, index }) => ({
          ...env,
          previousValue: current[index].currentValue,
        }))
      )
    )
  )

/**
 * Translates sandbox test results to Hoppscotch's internal test result format,
 * including calculating environment variable diffs.
 */
export function translateToSandboxTestResults(
  testDesc: SandboxTestResult,
  initialGlobalEnvs: Environment["variables"],
  initialSelectedEnvs: Environment["variables"]
): HoppTestResult {
  const translateChildTests = (child: TestDescriptor): HoppTestData => {
    return {
      description: child.descriptor,
      expectResults: [...child.expectResults],
      tests: child.children.map(translateChildTests),
    }
  }

  return {
    description: "",
    expectResults: [...testDesc.tests.expectResults],
    tests: testDesc.tests.children.map(translateChildTests),
    scriptError: false,
    envDiff: {
      global: {
        additions: getAddedEnvVariables(
          initialGlobalEnvs,
          testDesc.envs.global
        ),
        deletions: getRemovedEnvVariables(
          initialGlobalEnvs,
          testDesc.envs.global
        ),
        updations: getUpdatedEnvVariables(
          initialGlobalEnvs,
          testDesc.envs.global
        ),
      },
      selected: {
        additions: getAddedEnvVariables(
          initialSelectedEnvs,
          testDesc.envs.selected
        ),
        deletions: getRemovedEnvVariables(
          initialSelectedEnvs,
          testDesc.envs.selected
        ),
        updations: getUpdatedEnvVariables(
          initialSelectedEnvs,
          testDesc.envs.selected
        ),
      },
    },
  }
}

/**
 * Combines environment variables with request and collection variables,
 * respecting the precedence order.
 */
export const combineEnvVariables = (variables: {
  environments: {
    selected: Environment["variables"]
    global: Environment["variables"]
    temp?: Environment["variables"]
  }
  requestVariables: Environment["variables"]
  collectionVariables: Environment["variables"]
}) => [
  ...variables.requestVariables,
  ...variables.collectionVariables,
  ...(variables.environments.temp ?? []),
  ...variables.environments.selected,
  ...variables.environments.global,
]

const getTransformedEnvs = (
  env: Environment["variables"][number]
): Environment["variables"][number] => {
  return {
    ...env,
    currentValue: env.currentValue || env.initialValue,
  }
}

/**
 * Filters and transforms environment variables to ensure unique keys and non-empty values.
 */
export const filterNonEmptyEnvironmentVariables = (
  envs: Environment["variables"]
): Environment["variables"] => {
  const envsMap = new Map<string, Environment["variables"][number]>()
  envs.forEach((env) => {
    const transformedEnv = getTransformedEnvs(env)
    if (envsMap.has(transformedEnv.key)) {
      const existingEnv = envsMap.get(transformedEnv.key)
      if (
        existingEnv &&
        "currentValue" in existingEnv &&
        existingEnv.currentValue === "" &&
        transformedEnv.currentValue !== ""
      ) {
        envsMap.set(transformedEnv.key, transformedEnv)
      }
    } else {
      envsMap.set(transformedEnv.key, transformedEnv)
    }
  })
  return Array.from(envsMap.values())
}

/**
 * Checks if there are any changes between initial and final environment states.
 */
export const hasEnvironmentChanges = (
  initialEnvs: {
    global: Environment["variables"]
    selected: Environment["variables"]
  },
  finalEnvs: {
    global: Environment["variables"]
    selected: Environment["variables"]
  }
): boolean => {
  const globalAdditions = getAddedEnvVariables(
    initialEnvs.global,
    finalEnvs.global
  )
  const globalDeletions = getRemovedEnvVariables(
    initialEnvs.global,
    finalEnvs.global
  )
  const globalUpdations = getUpdatedEnvVariables(
    initialEnvs.global,
    finalEnvs.global
  )

  const selectedAdditions = getAddedEnvVariables(
    initialEnvs.selected,
    finalEnvs.selected
  )
  const selectedDeletions = getRemovedEnvVariables(
    initialEnvs.selected,
    finalEnvs.selected
  )
  const selectedUpdations = getUpdatedEnvVariables(
    initialEnvs.selected,
    finalEnvs.selected
  )

  return (
    globalAdditions.length > 0 ||
    globalDeletions.length > 0 ||
    globalUpdations.length > 0 ||
    selectedAdditions.length > 0 ||
    selectedDeletions.length > 0 ||
    selectedUpdations.length > 0
  )
}
