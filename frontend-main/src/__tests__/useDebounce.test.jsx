import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../hooks/useDebounce";

describe("useDebounce hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("debounces the value after delay", () => {
    let value = "initial";
    const { result, rerender } = renderHook(() => useDebounce(value, 300));

    expect(result.current).toBe("initial");

    value = "updated";
    rerender();

    // Before timeout, still old value
    expect(result.current).toBe("initial");

    // After timeout, new value
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("updated");
  });

  it("cancels previous timer on rapid updates", () => {
    let value = "a";
    const { result, rerender } = renderHook(() => useDebounce(value, 300));

    value = "b";
    rerender();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    value = "c";
    rerender();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should be "c", not "b"
    expect(result.current).toBe("c");
  });
});
