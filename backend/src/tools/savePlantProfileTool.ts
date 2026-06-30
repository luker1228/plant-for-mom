import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { MessageRole } from "../types/message.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types/tool.js";

type SavePlantProfileParams = {
  name: string;
  species?: string;
  commonName?: string;
  location?: string;
  potType?: string;
  soilType?: string;
  lightCondition?: string;
  growthStage?: string;
  avatarUrl?: string;
  notes?: string;
};

export const savePlantProfileTool: ToolDefinition<SavePlantProfileParams> = {
  name: "savePlantProfileTool",
  description:
    "保存植物档案。当用户确认了识别结果或需要创建/更新植物档案时调用此工具。",
  schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "用户给植物起的名字" },
      species: { type: "string", description: "学名" },
      commonName: { type: "string", description: "俗名" },
      location: { type: "string", description: "放置位置，如阳台、客厅、窗台" },
      potType: { type: "string", description: "花盆类型" },
      soilType: { type: "string", description: "土壤类型" },
      lightCondition: { type: "string", description: "光照条件" },
      growthStage: { type: "string", description: "生长阶段" },
      avatarUrl: { type: "string", description: "植物图片URL" },
      notes: { type: "string", description: "备注" },
    },
    required: ["name"],
  },

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const [row] = await db
      .insert(schema.plantProfiles)
      .values({
        userId: context.userId,
        name: params.name,
        species: params.species,
        commonName: params.commonName,
        location: params.location,
        potType: params.potType,
        soilType: params.soilType,
        lightCondition: params.lightCondition,
        growthStage: params.growthStage,
        lifecycleStatus: "profile_created",
        avatarUrl: params.avatarUrl,
        notes: params.notes,
      })
      .returning();

    return {
      success: true,
      data: row,
      metadata: {
        role: MessageRole.Tool,
        tool_call_id: "savePlantProfileTool",
        content: `植物档案已创建：${row.name}（ID: ${row.id}），状态：profile_created`,
      },
    };
  },
};