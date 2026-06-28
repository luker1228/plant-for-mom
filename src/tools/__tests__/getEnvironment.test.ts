import { describe, it, expect } from "vitest";
import { getSeason, getEstimatedTemperature, getEstimatedHumidity } from "../getEnvironmentTool.js";

describe("getEnvironmentTool helpers", () => {
  it("getSeason returns correct season", () => {
    expect(getSeason(1)).toBe("冬季");
    expect(getSeason(3)).toBe("春季");
    expect(getSeason(7)).toBe("夏季");
    expect(getSeason(10)).toBe("秋季");
  });

  it("getEstimatedTemperature returns reasonable values", () => {
    expect(getEstimatedTemperature(1)).toBe(5);
    expect(getEstimatedTemperature(7)).toBe(30);
    expect(getEstimatedTemperature(12)).toBe(6);
  });

  it("getEstimatedHumidity returns reasonable values", () => {
    expect(getEstimatedHumidity(1)).toBe(50);
    expect(getEstimatedHumidity(7)).toBe(80);
  });
});