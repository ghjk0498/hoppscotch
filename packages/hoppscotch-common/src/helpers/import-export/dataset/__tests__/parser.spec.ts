import { describe, it, expect } from "vitest"
import { getIterationDataVars } from "../parser"

describe("getIterationDataVars", () => {
  it("should correctly serialize simple string values", () => {
    const iterationData = { key1: "value1" }
    const result = getIterationDataVars(iterationData)
    
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe("key1")
    expect(result[0].value).toBe("value1")
  })

  it("should correctly serialize numeric values", () => {
    const iterationData = { key1: 123 }
    const result = getIterationDataVars(iterationData)
    
    expect(result[0].value).toBe("123")
  })

  it("should correctly serialize boolean values", () => {
    const iterationData = { key1: true }
    const result = getIterationDataVars(iterationData)
    
    expect(result[0].value).toBe("true")
  })

  it("should correctly serialize objects using JSON.stringify (FAILING TEST)", () => {
    const iterationData = { key1: { sub: "val" } }
    const result = getIterationDataVars(iterationData)
    
    // This is expected to fail with the current implementation (it will be "[object Object]")
    expect(result[0].value).toBe('{"sub":"val"}')
  })

  it("should correctly serialize arrays using JSON.stringify (FAILING TEST)", () => {
    const iterationData = { key1: [1, 2, 3] }
    const result = getIterationDataVars(iterationData)
    
    // This is expected to fail with the current implementation (it will be "1,2,3")
    expect(result[0].value).toBe('[1,2,3]')
  })
})
