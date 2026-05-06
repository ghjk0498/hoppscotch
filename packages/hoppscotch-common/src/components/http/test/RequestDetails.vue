<template>
  <div class="flex flex-col flex-1 overflow-auto">
    <div
      class="sticky top-0 z-10 flex flex-col flex-shrink-0 p-4 space-y-4 bg-primary"
    >
      <div class="flex items-center space-x-2 font-semibold">
        <span :style="{ color: methodColor }">
          {{ request.method }}
        </span>
        <span class="truncate text-secondaryDark">
          {{ request.endpoint }}
        </span>
      </div>
    </div>

    <HoppSmartTabs
      v-model="selectedTab"
      styles="sticky overflow-x-auto flex-shrink-0 z-10 bg-primary top-lowerPrimaryStickyFold"
    >
      <HoppSmartTab
        v-if="request.params.length > 0"
        id="params"
        :label="t('tab.parameters')"
        :info="`${request.params.length}`"
      >
        <LensesHeadersRenderer
          :model-value="request.params"
          :is-editable="false"
        />
      </HoppSmartTab>

      <HoppSmartTab
        v-if="request.headers.length > 0"
        id="headers"
        :label="t('tab.headers')"
        :info="`${request.headers.length}`"
      >
        <LensesHeadersRenderer
          :model-value="request.headers"
          :is-editable="false"
        />
      </HoppSmartTab>

      <HoppSmartTab v-if="hasBody" id="body" :label="t('tab.body')">
        <div class="p-4">
          <pre
            class="bg-primaryLight p-4 rounded overflow-auto max-h-96 text-sm"
          ><code>{{ bodyContent }}</code></pre>
        </div>
      </HoppSmartTab>

      <HoppSmartTab id="auth" :label="t('tab.authorization')">
        <div class="p-4 space-y-2">
          <div class="flex items-center space-x-2">
            <span class="text-secondaryDark">{{ t("auth.type") }}:</span>
            <span class="font-mono bg-primaryLight px-2 py-1 rounded text-sm">
              {{ request.auth.authType }}
            </span>
          </div>
        </div>
      </HoppSmartTab>
    </HoppSmartTabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { TestRunnerRequest } from "~/services/test-runner/test-runner.service"

const t = useI18n()

const props = defineProps<{
  request: TestRunnerRequest
}>()

const selectedTab = ref("params")

const methodColor = computed(() =>
  getMethodLabelColorClassOf(props.request.method)
)

const hasBody = computed(() => {
  return (
    props.request.body.contentType !== null &&
    (props.request.body.body !== null ||
      (props.request.body.contentType === "multipart/form-data" &&
        props.request.body.body !== null))
  )
})

const bodyContent = computed(() => {
  if (props.request.body.contentType === "application/json") {
    try {
      return JSON.stringify(
        JSON.parse(props.request.body.body as string),
        null,
        2
      )
    } catch {
      return props.request.body.body
    }
  }
  if (typeof props.request.body.body === "string") {
    return props.request.body.body
  }
  return JSON.stringify(props.request.body.body, null, 2)
})

// Initialize selected tab based on availability
if (props.request.params.length > 0) {
  selectedTab.value = "params"
} else if (props.request.headers.length > 0) {
  selectedTab.value = "headers"
} else if (hasBody.value) {
  selectedTab.value = "body"
} else {
  selectedTab.value = "auth"
}
</script>
