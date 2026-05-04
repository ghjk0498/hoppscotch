/**
 * Utilities for parsing dataset files (CSV/JSON)
 */
import { Environment } from "@hoppscotch/data"
import Papa from "papaparse"

export const MAX_DATASET_SIZE_MB = 5

/**
 * Validates if the dataset file size is within limits.
 * @param fileSize File size in bytes
 * @returns true if valid
 */
export const isDatasetSizeValid = (fileSize: number): boolean => {
  return fileSize <= MAX_DATASET_SIZE_MB * 1024 * 1024
}

/**
 * Transforms iteration data into environment variables.
 * @param iterationData The iteration data to transform
 * @returns The transformed environment variables
 */
export const getIterationDataVars = (
  iterationData: Record<string, any>
): Environment["variables"] => {
  return Object.keys(iterationData).map((key) => {
    const value = iterationData[key]
    const serializedValue =
      typeof value === "string" ? value : JSON.stringify(value)

    return {
      key,
      value: serializedValue,
      secret: false,
      initialValue: serializedValue,
      currentValue: serializedValue,
    }
  })
}

/**
 * Parse CSV data into an array of objects
 * @param data Raw CSV string
 * @returns Array of objects where keys are column headers
 */
export function parseCSV(data: string): Array<Record<string, string>> {
  const parsed = Papa.parse<Record<string, string>>(data, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    trimHeaders: true,
  })

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error("CSV file is empty or invalid")
  }

  // Remove any possible null/undefined rows (PapaParse can return empty objects for blank lines)
  const result = parsed.data.filter((row) => row && Object.keys(row).length > 0)

  // Check if headers exist
  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    throw new Error("CSV headers are missing")
  }

  return result
}

/**
 * Parse JSON data into an array of objects
 * @param data Raw JSON string
 * @returns Array of objects
 */
export function parseJSON(data: string): Array<Record<string, any>> {
  const parsed = JSON.parse(data)

  if (!Array.isArray(parsed)) {
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("JSON must be an object or array of objects")
    }
    return [parsed]
  }

  // Validate all items are objects
  if (
    !parsed.every(
      (item) =>
        typeof item === "object" && item !== null && !Array.isArray(item)
    )
  ) {
    throw new Error("JSON array must contain only objects")
  }

  return parsed
}

/**
 * Validate dataset structure
 * @param data Dataset array
 * @returns true if valid
 */
export function validateDataset(data: Array<Record<string, any>>): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false
  }

  // Check if all items are objects
  return data.every((item) => typeof item === "object" && item !== null)
}
