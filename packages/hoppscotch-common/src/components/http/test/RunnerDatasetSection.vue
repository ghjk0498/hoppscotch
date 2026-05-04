<template>
  <div class="space-y-4">
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-secondaryDark">
          {{ t("collection_runner.data_feed") }}
        </label>
      </div>

      <div v-if="!modelValue.enabled" class="space-y-2">
        <div class="flex gap-2">
          <label
            class="flex items-center justify-center px-4 py-2 text-sm border rounded cursor-pointer border-divider hover:bg-primaryLight transition"
          >
            <input
              ref="csvFileInput"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleFileUpload($event, 'csv')"
            />
            <span>{{ t("collection_runner.select_csv") }}</span>
          </label>

          <label
            class="flex items-center justify-center px-4 py-2 text-sm border rounded cursor-pointer border-divider hover:bg-primaryLight transition"
          >
            <input
              ref="jsonFileInput"
              type="file"
              accept=".json"
              class="hidden"
              @change="handleFileUpload($event, 'json')"
            />
            <span>{{ t("collection_runner.select_json") }}</span>
          </label>
        </div>
      </div>

      <div
        v-else
        class="p-3 border rounded bg-primaryLight border-divider space-y-2"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium text-secondaryDark">{{
              modelValue.fileName
            }}</span>
            <span class="text-secondaryLight">•</span>
            <span class="text-secondaryLight">{{
              modelValue.source?.toUpperCase()
            }}</span>
            <span class="text-secondaryLight">•</span>
            <span class="text-accent"
              >{{ datasetRowCount }}
              {{
                datasetRowCount === 1
                  ? t("collection_runner.row")
                  : t("collection_runner.rows")
              }}</span
            >
          </div>
          <div class="flex items-center gap-2">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('collection_runner.preview_data')"
              :icon="IconEye"
              class="!py-1 !px-2"
              outline
              @click="showPreviewModal = true"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.remove')"
              :icon="IconTrash"
              class="!py-1 !px-2"
              outline
              @click="clearDataset"
            />
          </div>
        </div>
        <p class="text-xs text-accent">
          {{
            t("collection_runner.iterations_from_data", {
              count: datasetRowCount,
            })
          }}
        </p>
      </div>
    </div>

    <!-- Data Preview Modal -->
    <HoppSmartModal
      v-if="showPreviewModal"
      dialog
      :title="t('collection_runner.data_preview')"
      @close="showPreviewModal = false"
    >
      <template #body>
        <div class="flex flex-col gap-4 p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium text-secondaryDark">{{
                modelValue.fileName
              }}</span>
              <span class="text-secondaryLight">•</span>
              <span class="text-secondaryLight">{{
                modelValue.source?.toUpperCase()
              }}</span>
              <span class="text-secondaryLight">•</span>
              <span class="text-accent"
                >{{ datasetRowCount }}
                {{
                  datasetRowCount === 1
                    ? t("collection_runner.row")
                    : t("collection_runner.rows")
                }}</span
              >
            </div>
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.download_file')"
              :icon="IconDownload"
              outline
              @click="downloadDataset"
            />
          </div>

          <div class="border rounded bg-primaryLight border-divider">
            <div class="overflow-auto max-h-96 p-4">
              <div
                v-if="datasetRowCount > 20"
                class="mb-4 p-2 bg-primary border-l-4 border-accent text-xs text-secondaryDark"
              >
                {{ t("collection_runner.showing_first_x_rows", { count: 20 }) }}
              </div>
              <pre
                class="text-xs"
              ><code>{{ JSON.stringify(previewData, null, 2) }}</code></pre>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <HoppButtonSecondary
          :label="t('action.close')"
          outline
          filled
          @click="showPreviewModal = false"
        />
      </template>
    </HoppSmartModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import {
  isDatasetSizeValid,
  MAX_DATASET_SIZE_MB,
  parseCSV,
  parseJSON,
  validateDataset,
} from "~/helpers/import-export/dataset/parser"
import IconDownload from "~icons/lucide/download"
import IconEye from "~icons/lucide/eye"
import IconTrash from "~icons/lucide/trash-2"

export type DatasetConfig = {
  enabled: boolean
  data: Array<Record<string, any>>
  source: "json" | "csv" | null
  fileName: string
  rawContent: string
}

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  modelValue: DatasetConfig
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: DatasetConfig): void
  (e: "dataset-loaded", rowCount: number): void
}>()

const showPreviewModal = ref(false)
const datasetRowCount = computed(() => props.modelValue.data.length)

const previewData = computed(() => {
  return props.modelValue.data.slice(0, 20)
})

const handleFileUpload = async (event: Event, type: "json" | "csv") => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!isDatasetSizeValid(file.size)) {
    toast.error(
      t("collection_runner.dataset_too_large", { size: MAX_DATASET_SIZE_MB })
    )
    ;(event.target as HTMLInputElement).value = ""
    return
  }

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string
      let parsedData: Array<Record<string, any>> = []

      if (type === "csv") {
        parsedData = parseCSV(content)
      } else if (type === "json") {
        parsedData = parseJSON(content)
      }

      if (validateDataset(parsedData)) {
        emit("update:modelValue", {
          enabled: true,
          data: parsedData,
          source: type,
          fileName: file.name,
          rawContent: content,
        })

        emit("dataset-loaded", parsedData.length)
        toast.success(t("collection_runner.dataset_loaded"))
      } else {
        throw new Error("Invalid dataset structure")
      }
    } catch (error: any) {
      toast.error(error.message || t(`collection_runner.invalid_${type}`))
      clearDataset()
    }
    ;(event.target as HTMLInputElement).value = ""
  }
  reader.readAsText(file)
}

const clearDataset = () => {
  emit("update:modelValue", {
    enabled: false,
    data: [],
    source: null,
    fileName: "",
    rawContent: "",
  })
}

const downloadDataset = () => {
  const { enabled, source, rawContent, fileName } = props.modelValue
  if (!enabled || !source || !rawContent) return

  const blob = new Blob([rawContent], {
    type: source === "csv" ? "text/csv" : "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>
