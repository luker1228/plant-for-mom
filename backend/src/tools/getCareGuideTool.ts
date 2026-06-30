import { eq } from "drizzle-orm";
import { openai, modelManager } from "../core/llm/index.js";
import { db, schema } from "../db/index.js";
import { careGuideSchema } from "../types/index.js";
import type { CareGuide } from "../types/index.js";
import { MessageRole } from "../types/message.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types/tool.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

type GetCareGuideParams = {
  plantId: string;
  environmentContext?: string;
};

const CARE_GUIDE_PROMPT = `你是一个植物养护专家。请根据植物信息和环境上下文，生成结构化的养护指南。
必须返回 JSON 格式，严格符合以下结构：

{
  "plantName": "植物名称",
  "light": { "requirement": "光照需求", "advice": "光照建议" },
  "watering": { "frequency": "浇水频率", "method": "浇水方法", "warning": "注意事项" },
  "soil": { "requirement": "土壤需求", "advice": "土壤建议" },
  "fertilizing": { "frequency": "施肥频率", "advice": "施肥建议" },
  "pruning": { "advice": "修剪建议" },
  "repotting": { "advice": "换盆建议" },
  "commonProblems": ["常见问题1", "常见问题2"],
  "nextCareTasks": []
}

nextCareTasks 留空数组即可，任务由 createCareTaskTool 单独创建。
请用中文回复，内容要具体、可执行、面向普通植物养护爱好者。`;

export const getCareGuideTool: ToolDefinition<GetCareGuideParams, CareGuide> = {
  name: "getCareGuideTool",
  description: "根据植物档案和环境信息生成结构化养护指南，包含光照、浇水、土壤、施肥、修剪、换盆等建议。",
  schema: {
    type: "object",
    properties: {
      plantId: { type: "string", description: "植物档案ID" },
      environmentContext: { type: "string", description: "环境上下文信息，如季节、温湿度等" },
    },
    required: ["plantId"],
  },

  async execute(params, context: ToolContext): Promise<ToolResult<CareGuide>> {
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
          tool_call_id: "getCareGuideTool",
          content: "生成养护指南失败：植物档案不存在",
        },
      };
    }

    const plantInfo = `植物名称: ${plant.name}
学名: ${plant.species ?? "未知"}
俗名: ${plant.commonName ?? "未知"}
位置: ${plant.location ?? "未知"}
光照条件: ${plant.lightCondition ?? "未知"}
土壤类型: ${plant.soilType ?? "未知"}
生长阶段: ${plant.growthStage ?? "未知"}
环境信息: ${params.environmentContext ?? "未提供"}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: MessageRole.System, content: CARE_GUIDE_PROMPT },
      { role: MessageRole.User, content: plantInfo },
    ];

    const response = await openai.chat.completions.create({
      model: modelManager.pickModel({ reasoning: true }),
      messages,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";

    try {
      const guide = careGuideSchema.parse(JSON.parse(content));

      await db.insert(schema.careGuides).values({
        plantId: plant.id,
        content: guide,
        version: 1,
      });

      return {
        success: true,
        data: guide,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "getCareGuideTool",
          content: `养护指南已生成并保存，涵盖光照、浇水、土壤、施肥、修剪、换盆等 ${guide.commonProblems.length} 个常见问题`,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `养护指南解析失败: ${err}`,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "getCareGuideTool",
          content: `生成养护指南失败，原始返回: ${content.slice(0, 200)}`,
        },
      };
    }
  },
};