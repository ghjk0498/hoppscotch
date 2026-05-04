import { describe, it, expect } from "vitest"
import { parseCSV, parseJSON } from "./parser"
import * as E from "fp-ts/Either"

describe("Dataset Parser", () => {
  describe("parseCSV", () => {
    it("should parse simple CSV content", () => {
      const csv = "id,name\n1,foo\n2,bar"
      const result = parseCSV(csv)
      expect(result).toEqual(
        E.right([
          { id: "1", name: "foo" },
          { id: "2", name: "bar" },
        ])
      )
    })

    it("should handle empty CSV", () => {
      const csv = ""
      const result = parseCSV(csv)
      expect(E.isLeft(result)).toBe(true)
    })

    it("should handle CSV with only headers", () => {
      const csv = "id,name"
      const result = parseCSV(csv)
      expect(result).toEqual(E.right([]))
    })

    it("should handle CSV with quoted fields", () => {
      const csv = 'id,name\n1,"foo, bar"'
      const result = parseCSV(csv)
      expect(result).toEqual(E.right([{ id: "1", name: "foo, bar" }]))
    })
  })

  describe("parseJSON", () => {
    it("should parse simple JSON array", () => {
      const json = '[{"id": 1, "name": "foo"}, {"id": 2, "name": "bar"}]'
      const result = parseJSON(json)
      expect(result).toEqual(
        E.right([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      )
    })

    it("should return error for non-array JSON", () => {
      const json = '{"id": 1}'
      const result = parseJSON(json)
      expect(E.isLeft(result)).toBe(true)
    })

    it("should return error for invalid JSON", () => {
      const json = '[{"id": 1'
      const result = parseJSON(json)
      expect(E.isLeft(result)).toBe(true)
    })
  })
})
