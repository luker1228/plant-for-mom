import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { MessageRole } from "../types/message.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types/tool.js";

type GetEnvironmentParams = {
  location?: string;
  plantId?: string;
};

export const getEnvironmentTool: ToolDefinition<GetEnvironmentParams> = {
  name: "getEnvironmentTool",
  description:
    "获取植物所在环境的天气、季节、温度、湿度信息。可基于用户地理位置或植物档案中的位置。",
  schema: {
    type: "object",
    properties: {
      location: { type: "string", description: "位置名称，如上海、北京" },
      plantId: { type: "string", description: "植物档案ID，用于读取已存储的位置" },
    },
  },

  async execute(params, context: ToolContext): Promise<ToolResult> {
    let location = params.location;

    if (!location && params.plantId) {
      const [plant] = await db
        .select()
        .from(schema.plantProfiles)
        .where(eq(schema.plantProfiles.id, params.plantId));
      location = plant?.location ?? undefined;
    }

    if (!location) {
      location = "未知";
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const season = getSeason(month);
    const temperature = getEstimatedTemperature(month);
    const humidity = getEstimatedHumidity(month);

    const envInfo = {
      location,
      season,
      temperature,
      humidity,
      date: now.toISOString().split("T")[0],
      note: "环境数据为基于季节的估算值，实际请以当地气象数据为准。",
    };

    return {
      success: true,
      data: envInfo,
      metadata: {
        role: MessageRole.Tool,
        tool_call_id: "getEnvironmentTool",
        content: `环境信息：位置 ${location}，季节 ${season}，估算温度 ${temperature}°C，估算湿度 ${humidity}%`,
      },
    };
  },
};

export function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "春季";
  if (month >= 6 && month <= 8) return "夏季";
  if (month >= 9 && month <= 11) return "秋季";
  return "冬季";
}

export function getEstimatedTemperature(month: number): number {
  const tempMap: Record<number, number> = {
    1: 5, 2: 7, 3: 12, 4: 18, 5: 23,
    6: 27, 7: 30, 8: 29, 9: 25, 10: 19,
    11: 12, 12: 6,
  };
  return tempMap[month] ?? 20;
}

export function getEstimatedHumidity(month: number): number {
  const humidMap: Record<number, number> = {
    1: 50, 2: 55, 3: 60, 4: 65, 5: 70,
    6: 75, 7: 80, 8: 80, 9: 70, 10: 60,
    11: 55, 12: 50,
  };
  return humidMap[month] ?? 60;
}