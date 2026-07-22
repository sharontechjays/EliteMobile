import { ok, fail } from "./Result";

describe("Result helpers", () => {
  it("ok() wraps data in a success result", () => {
    const result = ok(42);
    expect(result).toEqual({ success: true, data: 42 });
  });

  it("fail() wraps an error in a failure result", () => {
    const result = fail({ type: "READ_FAILED" });
    expect(result).toEqual({ success: false, error: { type: "READ_FAILED" } });
  });
});
