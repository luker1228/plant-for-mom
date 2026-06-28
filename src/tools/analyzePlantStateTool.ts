import { eq } from "drizzle-orm";
import { openai, VISION_MODEL } from "../lib/openai.js";
import { db, schema } from "../db/index.js";
import { plantStateAnalysisSchema } from "../types/index.js";
import type { PlantStateAnalysis } from "../types/index.js";
import { MessageRole } from "../types/message.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types/tool.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

type AnalyzePlantStateParams = {
  plantId: string;
  imageUrls?: string[];
  userDescription?: string;
};

const ANALYSIS_PROMPT = `你是一个植物病理和养护诊断专家。请根据植物档案、观察记录、图片和用户描述，诊断植物当前状态。
必须返回 JSON 格式，严格符合以下结构：

{
  "riskLevel": "low",
  "symptoms": ["症状1", "症状2"],
  "possibleCauses": [
    {
      "cause": "可能原因",
      "probability": "high",
      "evidence": ["证据1", "证据2"]
    }
  ],
  "actions": [
    {
      "type": "watering",
      "instruction": "执行说明",
      "dueInDays": 3
    }
  ],
  "followUpQuestions": ["后续问题1"]
}

字段说明：
- riskLevel: "low" | "medium" | "high"，风险等级
- probability: "low" | "medium" | "high"，原因可能性
- actions.type: "watering" | "stop_watering" | "move_location" | "fertilizing" | "pruning" | "repotting" | "observe"
- dueInDays: 建议在多少天内执行

请用中文回复，诊断结果要具体、有依据、建议可执行。`;

export const analyzePlantStateTool: ToolDefinition<AnalyzePlantStateParams, PlantStateAnalysis> = {
  name: "analyzePlantStateTool",
  description: "分析植物当前状态并给出诊断。结合植物档案、近期观察记录、图片和用户描述判断问题原因，推荐处理建议。",
  schema: {
    type: "object",
    properties: {
      plantId: { type: "string", description: "植物档案ID" },
      imageUrls: {
        type: "array",
        items: { type: "string" },
        description: "植物状态图片URL列表",
      },
      userDescription: { type: "string", description: "用户对植物状态的文字描述" },
    },
    required: ["plantId"],
  },

  async execute(params, context: ToolContext): Promise<ToolResult<PlantStateAnalysis>> {
    const [plant] = await db
      .select()
      .from(schema.plantProfiles)
      .where(eq(schema.plantProfiles.id, params.plantId));

    if (!plant) {
      return {
        success: false,
        error: "植物档案不存在",
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "analyzePlantStateTool",
          content: "状态分析失败：植物档案不存在",
        },
      };
    }

    const recentObservations: typeof schema.plantObservations.$inferSelect[] = await db
      .select()
      .from(schema.plantObservations)
      .where(eq(schema.plantObservations.plantId, params.plantId))
      .limit(5);

    const imageUrls = params.imageUrls ?? context.imageUrls ?? [];
    const plantInfo = `植物名称: ${plant.name}
学名: ${plant.species ?? "未知"}
位置: ${plant.location ?? "未知"}
光照: ${plant.lightCondition ?? "未知"}
土壤: ${plant.soilType ?? "未知"}

近期观察记录 (${recentObservations.length} 条):
${recentObservations
  .map(
    (o) =>
      `- ${o.date.toISOString().split("T")[0]}: ${o.symptoms?.join(", ") ?? "无症状描述"} | ${o.userNote ?? "无备注"}`,
  )
  .join("\n") ?? "无历史记录"}

用户描述: ${params.userDescription ?? "无"}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: MessageRole.System, content: ANALYSIS_PROMPT },
      {
        role: MessageRole.User,
        content: [
          { type: "text", text: plantInfo },
          ...imageUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      },
    ];

    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";

    try {
      const analysis = plantStateAnalysisSchema.parse(JSON.parse(content));
      const topCause = analysis.possibleCauses[0];
      return {
        success: true,
        data: analysis,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "analyzePlantStateTool",
          content: `状态分析完成：风险等级 ${analysis.riskLevel}，最可能原因：${topCause?.cause ?? "未知"}，建议执行 ${analysis.actions.length} 项操作`,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `状态分析解析失败: ${err}`,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "analyzePlantStateTool",
          content: `状态分析失败，原始返回: ${content.slice(0, 200)}`,
        },
      };
    }
  },
};