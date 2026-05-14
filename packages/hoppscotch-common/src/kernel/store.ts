import type {
  StorageOptions,
  StoreError,
  StoreEvents,
  StoreEventEmitter,
  ScopedStore,
} from "@hoppscotch/kernel"
import { extendStore } from "@hoppscotch/kernel"
import * as E from "fp-ts/Either"
import { getModule } from "."
import { getKernelMode } from "@hoppscotch/kernel"
import { diag } from "./log"

// Helper to get location info safely in both Main Thread and Workers
const getLocationInfo = () => {
  if (typeof globalThis.window !== "undefined") {
    return {
      search: globalThis.window.location.search,
      host: globalThis.window.location.host,
      href: globalThis.window.location.href,
    }
  }
  // In workers, self.location is available
  if (typeof globalThis.location !== "undefined") {
    return {
      search: globalThis.location.search,
      host: globalThis.location.host,
      href: globalThis.location.href,
    }
  }
  return { search: "", host: "localhost", href: "" }
}

const loc = getLocationInfo()

// on desktop, org webviews share the same app:// origin as the main webview
// (to keep Tauri IPC working). the org context is passed as a query param
// (?org=test-org.hoppscotch.io) instead. we include it in the store path so
// each org gets its own store file on disk, preserving per-org isolation for
// auth tokens, settings, collections, etc.
const orgParam = new URLSearchParams(loc.search).get("org")
const HOST_SCOPED_STORE_PATH = orgParam
  ? `${orgParam.replace(/[^a-zA-Z0-9]/g, "_")}.hoppscotch.store`
  : `${loc.host}.hoppscotch.store`

// process-wide store file shared across orgs. holds machine-level state
// (desktop settings, recent-instances list, update state) that should
// not vary per organization.
const UNIFIED_STORE_PATH = "hoppscotch-unified.store"

diag("store", "--- COMMON store.ts module evaluated ---")
diag("store", "orgParam:", orgParam ?? "(none)")
diag("store", "HOST_SCOPED_STORE_PATH:", HOST_SCOPED_STORE_PATH)
diag("store", "UNIFIED_STORE_PATH:", UNIFIED_STORE_PATH)
diag("store", "loc.host:", loc.host)
diag("store", "loc.href:", loc.href)

// Lazy-loaded Tauri APIs
let invoke:
  | (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>)
  | undefined
let join: ((...paths: string[]) => Promise<string>) | undefined

// Single init promise to avoid multiple imports and race conditions
let initPromise: Promise<void> | undefined

const isInitd = async () => {
  if (getKernelMode() !== "desktop") return

  if (!initPromise) {
    initPromise = Promise.all([
      import("@tauri-apps/api/core").then((module) => {
        invoke = module.invoke
      }),
      import("@tauri-apps/api/path").then((module) => {
        join = module.join
      }),
    ]).then(() => {})
  }

  await initPromise
}

export const getConfigDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getConfigDir is only available in desktop mode")
  return await invoke<string>("get_config_dir")
}

export const getBackupDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getBackupDir is only available in desktop mode")
  return await invoke<string>("get_backup_dir")
}

export const getLatestDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getLatestDir is only available in desktop mode")
  return await invoke<string>("get_latest_dir")
}

export const getStoreDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getStoreDir is only available in desktop mode")
  return await invoke<string>("get_store_dir")
}

export const getInstanceDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke)
    throw new Error("getInstanceDir is only available in desktop mode")
  return await invoke<string>("get_instance_dir")
}

export const getLogsDir = async (): Promise<string> => {
  await isInitd()
  if (!invoke) throw new Error("getLogsDir is only available in desktop mode")
  return await invoke<string>("get_logs_dir")
}

function createScopedStore(staticPath: string) {
  let cachedStorePath: string | undefined

  const getStorePath = async (): Promise<string> => {
    if (cachedStorePath) {
      diag(
        "store",
        `getStorePath(${staticPath}): returning cached:`,
        cachedStorePath
      )
      return cachedStorePath
    }

    if (getKernelMode() === "desktop") {
      await isInitd()
      if (join) {
        try {
          const storeDir = await getStoreDir()
          cachedStorePath = await join(storeDir, staticPath)
          diag(
            "store",
            `getStorePath(${staticPath}): resolved desktop path:`,
            cachedStorePath
          )
          return cachedStorePath
        } catch (error) {
          diag(
            "store",
            `getStorePath(${staticPath}): failed to get store dir:`,
            String(error)
          )
          console.error("Failed to get store directory:", error)
        }
      }
    }

    cachedStorePath = staticPath
    diag(
      "store",
      `getStorePath(${staticPath}): using fallback path:`,
      cachedStorePath
    )
    return cachedStorePath
  }

  const module = () => getModule("store")

  return {
    capabilities: () => module().capabilities,

    init: async () => {
      const storePath = await getStorePath()
      diag("store", `Store.init(${staticPath}) called with path:`, storePath)
      const result = await module().init(storePath)
      diag("store", `Store.init(${staticPath}) completed for path:`, storePath)
      return result
    },

    set: async (
      namespace: string,
      key: string,
      value: unknown,
      options?: StorageOptions
    ): Promise<E.Either<StoreError, void>> => {
      const storePath = await getStorePath()
      diag(
        "store",
        `Store.set(${namespace}, ${key}) on ${staticPath}:`,
        storePath
      )
      return module().set(storePath, namespace, key, value, options)
    },

    get: async <T>(
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, T | undefined>> => {
      const storePath = await getStorePath()
      diag(
        "store",
        `Store.get(${namespace}, ${key}) on ${staticPath}:`,
        storePath
      )
      const result = await module().get<T>(storePath, namespace, key)
      if (E.isRight(result)) {
        const val = result.right
        const shape =
          val === undefined
            ? "undefined"
            : val === null
              ? "null"
              : typeof val === "object"
                ? `object(${Object.keys(val as Record<string, unknown>).length} keys)`
                : typeof val
        diag(
          "store",
          `Store.get(${namespace}, ${key}) on ${staticPath} => Right(${shape})`
        )
      } else {
        diag(
          "store",
          `Store.get(${namespace}, ${key}) on ${staticPath} => Left:`,
          result.left
        )
      }
      return result
    },

    remove: async (
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, boolean>> => {
      const storePath = await getStorePath()
      return module().remove(storePath, namespace, key)
    },

    clear: async (namespace?: string): Promise<E.Either<StoreError, void>> => {
      const storePath = await getStorePath()
      return module().clear(storePath, namespace)
    },

    has: async (
      namespace: string,
      key: string
    ): Promise<E.Either<StoreError, boolean>> => {
      const storePath = await getStorePath()
      return module().has(storePath, namespace, key)
    },

    listNamespaces: async (): Promise<E.Either<StoreError, string[]>> => {
      const storePath = await getStorePath()
      return module().listNamespaces(storePath)
    },

    listKeys: async (
      namespace: string
    ): Promise<E.Either<StoreError, string[]>> => {
      const storePath = await getStorePath()
      return module().listKeys(storePath, namespace)
    },

    watch: async (
      namespace: string,
      key: string
    ): Promise<StoreEventEmitter<StoreEvents>> => {
      const storePath = await getStorePath()
      return module().watch(storePath, namespace, key)
    },

    extend: async (namespace: string): Promise<ScopedStore> => {
      const storePath = await getStorePath()
      return extendStore(module(), storePath, namespace)
    },
  } as const
}

export const Store = createScopedStore(HOST_SCOPED_STORE_PATH)
export const UnifiedStore = createScopedStore(UNIFIED_STORE_PATH)
