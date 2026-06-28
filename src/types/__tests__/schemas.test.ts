import { describe, it, expect } from "vitest";
import {
  plantProfileSchema,
  plantIdentificationResultSchema,
  careGuideSchema,
  plantStateAnalysisSchema,
  plantLifecycleStatusSchema,
} from "../index.js";

describe("PlantProfile schema", () => {
  const valid = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    userId: "user-1",
    name: "我的绿萝",
    lifecycleStatus: "profile_created",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  it("accepts a valid plant profile", () => {
    const result = plantProfileSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = plantProfileSchema.safeParse({ ...valid, name: undefined });
    expect(result.success).toBe(false);
  });

  it("defaults lifecycleStatus to unknown_plant", () => {
    const { lifecycleStatus, ...rest } = valid;
    const result = plantProfileSchema.safeParse(rest);
    expect(result.success).toBe(true);
    expect(result.success && result.data.lifecycleStatus).toBe("unknown_plant");
  });
});

describe("PlantIdentificationResult schema", () => {
  const valid = {
    candidates: [
      {
        species: "Epipremnum aureum",
        commonName: "绿萝",
        confidence: 0.92,
        reason: "叶片形态匹配",
      },
    ],
    needUserConfirmation: false,
  };

  it("accepts valid result", () => {
    expect(plantIdentificationResultSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects confidence > 1", () => {
    const result = plantIdentificationResultSchema.safeParse({
      ...valid,
      candidates: [{ ...valid.candidates[0], confidence: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty candidates", () => {
    const result = plantIdentificationResultSchema.safeParse({
      ...valid,
      candidates: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("CareGuide schema", () => {
  const valid = {
    plantName: "绿萝",
    light: { requirement: "中等光照", advice: "散射光" },
    watering: { frequency: "每周一次", method: "浇透", warning: "勿积水" },
    soil: { requirement: "疏松透气", advice: "泥炭土+珍珠岩" },
    fertilizing: { frequency: "每月一次", advice: "稀释液肥" },
    commonProblems: ["叶尖发黄", "根部腐烂"],
    nextCareTasks: [],
  };

  it("accepts valid care guide", () => {
    expect(careGuideSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional pruning & repotting", () => {
    const withOptional = {
      ...valid,
      pruning: { advice: "定期修剪枯叶" },
      repotting: { advice: "每年换盆一次" },
    };
    expect(careGuideSchema.safeParse(withOptional).success).toBe(true);
  });
});

describe("PlantStateAnalysis schema", () => {
  const valid = {
    riskLevel: "medium",
    symptoms: ["叶子发黄"],
    possibleCauses: [
      {
        cause: "浇水过多",
        probability: "high",
        evidence: ["土壤潮湿", "叶片下垂"],
      },
    ],
    actions: [
      {
        type: "stop_watering",
        instruction: "暂停浇水一周",
        dueInDays: 1,
      },
    ],
    followUpQuestions: ["一周后拍照对比"],
  };

  it("accepts valid analysis", () => {
    expect(plantStateAnalysisSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid riskLevel", () => {
    expect(
      plantStateAnalysisSchema.safeParse({ ...valid, riskLevel: "critical" }).success,
    ).toBe(false);
  });

  it("rejects invalid action type", () => {
    expect(
      plantStateAnalysisSchema.safeParse({
        ...valid,
        actions: [{ type: "unknown_action", instruction: "test" }],
      }).success,
    ).toBe(false);
  });
});

describe("PlantLifecycleStatus", () => {
  it("accepts all valid statuses", () => {
    const statuses = [
      "unknown_plant",
      "identified",
      "profile_created",
      "care_plan_created",
      "observing",
      "need_action",
      "follow_up_scheduled",
    ];
    for (const s of statuses) {
      expect(plantLifecycleStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(plantLifecycleStatusSchema.safeParse("invalid").success).toBe(false);
  });
});