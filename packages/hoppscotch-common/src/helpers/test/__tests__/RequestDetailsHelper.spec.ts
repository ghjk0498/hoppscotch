import { describe, expect, it } from "vitest"
import { formatJSON, parseFormData } from "../RequestDetailsHelper"

describe("RequestDetailsHelper", () => {
  describe("formatJSON", () => {
    it("should format a valid JSON string", () => {
      const input = '{"a":1,"b":2}'
      const output = formatJSON(input)
      expect(output).toBe('{\n  "a": 1,\n  "b": 2\n}')
    })

    it("should return the same string if it is not a valid JSON", () => {
      const input = "invalid json"
      const output = formatJSON(input)
      expect(output).toBe(input)
    })

    it("should stringify if input is an object", () => {
      const input = { a: 1 }
      const output = formatJSON(input)
      expect(output).toBe('{\n  "a": 1\n}')
    })

    it("should return empty string for null or empty input", () => {
      expect(formatJSON(null)).toBe("")
      expect(formatJSON("")).toBe("")
    })
  })

  describe("parseFormData", () => {
    it("should parse valid form data", () => {
      const input = "a: 1\nb: 2"
      const output = parseFormData(input)
      expect(output).toEqual([
        { key: "a", value: "1", active: true },
        { key: "b", value: "2", active: true },
      ])
    })

    it("should return empty array for null or empty input", () => {
      expect(parseFormData(null)).toEqual([])
      expect(parseFormData("")).toEqual([])
    })
  })
})
