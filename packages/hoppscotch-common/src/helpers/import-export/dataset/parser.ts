import * as E from "fp-ts/Either"
import Papa from "papaparse"

export type DatasetParseError = "invalid_format" | "empty_content"

/**
 * Parses CSV content into an array of objects
 * @param content The CSV content to parse
 * @returns An array of objects where each object represents a row
 */
export function parseCSV(
  content: string
): E.Either<DatasetParseError, Record<string, string>[]> {
  if (!content || content.trim() === "") {
    return E.left("empty_content")
  }

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    return E.left("invalid_format")
  }

  return E.right(result.data)
}

/**
 * Parses JSON content into an array of objects
 * @param content The JSON content to parse
 * @returns An array of objects
 */
export function parseJSON(
  content: string
): E.Either<DatasetParseError, Record<string, any>[]> {
  if (!content || content.trim() === "") {
    return E.left("empty_content")
  }

  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) {
      return E.left("invalid_format")
    }
    return E.right(parsed)
  } catch (_e) {
    return E.left("invalid_format")
  }
}
