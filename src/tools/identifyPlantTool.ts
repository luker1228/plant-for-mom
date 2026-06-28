import { openai, modelManager } from "../core/llm/index.js";
import { plantIdentificationResultSchema } from "../types/index.js";
import { MessageRole } from "../types/message.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types/tool.js";
import type { PlantIdentificationResult } from "../types/index.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

type IdentifyPlantParams = {
  imageUrls?: string[];
  userDescription?: string;
};

const IDENTIFY_PROMPT = `你是一个植物识别专家。请根据用户提供的图片和描述，识别植物种类。
你需要返回 JSON 格式的识别结果，包含以下字段：
- candidates: 候选植物列表，每个包含 species（学名）、commonName（俗名）、confidence（置信度0-1）、reason（识别依据）
- needUserConfirmation: 是否需要用户确认识别结果（置信度>0.8时为false，否则为true）
- followUpQuestions: 如果置信度不足，向用户提出的补充问题列表

请确保返回的 JSON 严格符合以下结构：
{
  "candidates": [
    { "species": "学名", "commonName": "俗名", "confidence": 0.85, "reason": "识别依据" }
  ],
  "needUserConfirmation": true,
  "followUpQuestions": ["补充问题1", "补充问题2"]
}

请用中文回复。confidence 取值 0 到 1 之间，保留两位小数。`;

export const identifyPlantTool: ToolDefinition<IdentifyPlantParams, PlantIdentificationResult> = {
  name: "identifyPlantTool",
  description: "识别植物种类。传入植物图片URL和/或用户文字描述，返回候选植物列表及置信度。",
  schema: {
    type: "object",
    properties: {
      imageUrls: {
        type: "array",
        items: { type: "string" },
        description: "植物图片URL列表",
      },
      userDescription: { type: "string", description: "用户对植物的文字描述" },
    },
  },

  async execute(params, context: ToolContext): Promise<ToolResult<PlantIdentificationResult>> {
    const imageUrls = params.imageUrls ?? context.imageUrls ?? [];

    if (imageUrls.length === 0 && !params.userDescription) {
      return {
        success: false,
        error: "请提供植物图片或文字描述",
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "identifyPlantTool",
          content: "识别失败：未提供图片或描述",
        },
      };
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: MessageRole.System, content: IDENTIFY_PROMPT },
      {
        role: MessageRole.User,
        content: [
          ...(params.userDescription
            ? [{ type: "text" as const, text: params.userDescription }]
            : []),
          ...imageUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      },
    ];

    const response = await openai.chat.completions.create({
      model: modelManager.pickModel({ vision: true }),
      messages,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";

    try {
      const parsed = plantIdentificationResultSchema.parse(JSON.parse(content));
      const top = parsed.candidates[0];
      const summary = `识别完成：最可能是 ${top.commonName}（${top.species}），置信度 ${top.confidence}`;
      return {
        success: true,
        data: parsed,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "identifyPlantTool",
          content: summary,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `识别结果解析失败: ${err}`,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "identifyPlantTool",
          content: `识别失败，原始返回: ${content.slice(0, 200)}`,
        },
      };
    }
  },
};