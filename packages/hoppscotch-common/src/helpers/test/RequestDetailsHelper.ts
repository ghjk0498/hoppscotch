import { parseRawKeyValueEntries } from "@hoppscotch/data"

export function formatJSON(jsonString: any): string {
  if (jsonString === null) return ""
  if (typeof jsonString !== "string") return JSON.stringify(jsonString, null, 2)
  if (!jsonString) return ""
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch (_e) {
    return jsonString
  }
}

export function parseFormData(
  formData: string | null
): { key: string; value: string }[] {
  if (!formData) return []
  try {
    return parseRawKeyValueEntries(formData)
  } catch (_e) {
    return []
  }
}
