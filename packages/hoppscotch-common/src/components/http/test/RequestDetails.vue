<template>
  <div class="flex flex-col">
    <div class="flex flex-col p-4 border-b border-divider">
      <div class="flex items-center space-x-2">
        <span class="font-bold text-accent">{{ displayRequest.method }}</span>
        <span class="break-all text-secondaryDark">{{
          displayRequest.endpoint
        }}</span>
      </div>
    </div>

    <div v-if="displayRequest.params.length > 0" class="flex flex-col">
      <div
        class="flex items-center px-4 py-2 font-semibold border-b border-divider text-secondaryDark"
      >
        {{ t("tab.parameters") }}
      </div>
      <div class="p-4">
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th class="py-2 font-semibold text-left text-secondaryDark">
                {{ t("documentation.key") }}
              </th>
              <th class="py-2 font-semibold text-left text-secondaryDark">
                {{ t("documentation.value") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in displayRequest.params"
              :key="index"
              class="border-t border-divider"
            >
              <td class="py-2 pr-4 break-all">{{ item.key }}</td>
              <td class="py-2 text-secondaryLight break-all">
                {{ item.value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="displayRequest.headers.length > 0" class="flex flex-col">
      <div
        class="flex items-center px-4 py-2 font-semibold border-b border-divider text-secondaryDark"
      >
        {{ t("response.headers") }}
      </div>
      <LensesHeadersRenderer
        :model-value="displayRequest.headers"
        :is-editable="false"
      />
    </div>

    <div v-if="hasBody" class="flex flex-col">
      <div
        class="flex items-center px-4 py-2 font-semibold border-b border-divider text-secondaryDark"
      >
        {{ t("documentation.body.title") }}
      </div>
      <div class="p-4">
        <div
          v-if="displayRequest.body.contentType"
          class="flex items-center mb-2"
        >
          <span class="font-medium text-secondaryDark w-32"
            >{{ t("documentation.body.content_type") }}:</span
          >
          <span class="px-2 py-1 text-xs rounded bg-divider text-secondaryDark">
            {{ displayRequest.body.contentType }}
          </span>
        </div>

        <div v-if="displayRequest.body.contentType === 'application/json'">
          <pre
            class="p-3 my-2 overflow-auto text-xs font-mono rounded bg-primaryLight max-h-64 text-secondaryLight"
            >{{ formatJSON(displayRequest.body.body) }}</pre
          >
        </div>
        <div
          v-else-if="
            displayRequest.body.contentType ===
            'application/x-www-form-urlencoded'
          "
        >
          <table class="w-full border-collapse mt-2 text-xs">
            <thead>
              <tr>
                <th class="py-2 font-semibold text-left text-secondaryDark">
                  {{ t("documentation.key") }}
                </th>
                <th class="py-2 font-semibold text-left text-secondaryDark">
                  {{ t("documentation.value") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in parseFormData(displayRequest.body.body)"
                :key="index"
                class="border-t border-divider"
              >
                <td class="py-2 pr-4 break-all">{{ item.key }}</td>
                <td class="py-2 text-secondaryLight break-all">
                  {{ item.value }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-else-if="displayRequest.body.contentType === 'multipart/form-data'"
        >
          <table class="w-full border-collapse mt-2 text-xs">
            <thead>
              <tr>
                <th class="py-2 font-semibold text-left text-secondaryDark">
                  {{ t("documentation.key") }}
                </th>
                <th class="py-2 font-semibold text-left text-secondaryDark">
                  {{ t("documentation.value") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in displayRequest.body.body"
                :key="index"
                class="border-t border-divider"
              >
                <td class="py-2 pr-4 break-all">{{ item.key }}</td>
                <td class="py-2 text-secondaryLight break-all">
                  {{
                    item.isFile
                      ? `File: ${item.value.length} file(s)`
                      : item.value
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else>
          <pre
            class="p-3 my-2 overflow-auto font-mono rounded bg-primaryLight max-h-64 text-secondaryLight text-xs"
            >{{ displayRequest.body.body }}</pre
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppRESTRequest } from "@hoppscotch/data"
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import LensesHeadersRenderer from "~/components/lenses/HeadersRenderer.vue"
import { formatJSON, parseFormData } from "~/helpers/test/RequestDetailsHelper"

const t = useI18n()

const props = defineProps<{
  request: HoppRESTRequest
}>()

const displayRequest = computed(() => {
  const req = props.request as any

  // URL 및 파라미터 처리
  const endpoint = req.effectiveFinalURL || req.endpoint
  let params = []
  if (req.effectiveFinalParams) {
    params = req.effectiveFinalParams.map((p: any) => ({
      key: p.key,
      value: p.value,
    }))
  } else {
    params = parseQueryParams(endpoint)
  }

  // 헤더 처리
  const headers = req.effectiveFinalHeaders || req.headers

  // 바디 처리
  let body = req.body.body
  if (req.effectiveFinalBody && typeof req.effectiveFinalBody === "string") {
    body = req.effectiveFinalBody
  }

  return {
    method: req.method,
    endpoint,
    headers,
    params,
    body: {
      contentType: req.body.contentType,
      body,
    },
  }
})

function parseQueryParams(endpoint: string): { key: string; value: string }[] {
  try {
    const url = new URL(endpoint)
    const params: { key: string; value: string }[] = []
    url.searchParams.forEach((value, key) => {
      params.push({ key, value })
    })
    return params
  } catch (_e) {
    const queryString = endpoint.split("?")[1]
    if (!queryString) return []

    const params: { key: string; value: string }[] = []
    const pairs = queryString.split("&")
    for (const pair of pairs) {
      const [key, value] = pair.split("=")
      if (key) {
        params.push({
          key: decodeURIComponent(key),
          value: value ? decodeURIComponent(value) : "",
        })
      }
    }
    return params
  }
}

const hasBody = computed(() => {
  return (
    displayRequest.value.body.contentType !== null &&
    displayRequest.value.body.contentType !== "none" &&
    (Array.isArray(displayRequest.value.body.body)
      ? displayRequest.value.body.body.length > 0
      : displayRequest.value.body.body !== null)
  )
})
</script>
