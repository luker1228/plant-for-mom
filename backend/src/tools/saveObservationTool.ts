import { db, schema } from "../db/index.js";
import { MessageRole } from "../types/message.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types/tool.js";

type SaveObservationParams = {
  plantId: string;
  date: string;
  imageUrls?: string[];
  symptoms?: string[];
  userNote?: string;
  soilMoisture?: string;
  temperature?: number;
  humidity?: number;
  lightHours?: number;
};

export const saveObservationTool: ToolDefinition<SaveObservationParams> = {
  name: "saveObservationTool",
  description:
    "保存植物观察记录。当用户描述植物状态或上传状态图片时，保存当前观察信息。",
  schema: {
    type: "object",
    properties: {
      plantId: { type: "string", description: "植物档案ID" },
      date: { type: "string", description: "观察日期 ISO 格式" },
      imageUrls: {
        type: "array",
        items: { type: "string" },
        description: "状态图片URL列表",
      },
      symptoms: {
        type: "array",
        items: { type: "string" },
        description: "症状描述列表，如叶子发黄、叶尖干枯",
      },
      userNote: { type: "string", description: "用户额外描述" },
      soilMoisture: { type: "string", description: "土壤湿度描述" },
      temperature: { type: "number", description: "环境温度（摄氏度）" },
      humidity: { type: "number", description: "环境湿度百分比" },
      lightHours: { type: "number", description: "每日光照时长（小时）" },
    },
    required: ["plantId", "date"],
  },

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const [row] = await db
      .insert(schema.plantObservations)
      .values({
        plantId: params.plantId,
        userId: context.userId,
        date: new Date(params.date),
        imageUrls: params.imageUrls,
        symptoms: params.symptoms,
        userNote: params.userNote,
        soilMoisture: params.soilMoisture,
        temperature: params.temperature,
        humidity: params.humidity,
        lightHours: params.lightHours,
      })
      .returning();

    return {
      success: true,
      data: row,
      metadata: {
        role: MessageRole.Tool,
        tool_call_id: "saveObservationTool",
        content: `观察记录已保存，ID: ${row.id}，日期: ${row.date.toISOString().split("T")[0]}`,
      },
    };
  },
};