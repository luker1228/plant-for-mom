import { db, schema } from "../db/index.js";
import { MessageRole } from "../types/message.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types/tool.js";

type CreateCareTaskParams = {
  plantId: string;
  type: "watering" | "fertilizing" | "pruning" | "repotting" | "observation";
  title?: string;
  dueDate?: string;
  reason?: string;
};

export const createCareTaskTool: ToolDefinition<CreateCareTaskParams> = {
  name: "createCareTaskTool",
  description:
    "为指定植物创建一条养护任务，如浇水、施肥、修剪、换盆或观察。",
  schema: {
    type: "object",
    properties: {
      plantId: { type: "string", description: "植物档案ID" },
      type: {
        type: "string",
        enum: ["watering", "fertilizing", "pruning", "repotting", "observation"],
        description: "任务类型",
      },
      title: { type: "string", description: "任务标题" },
      dueDate: { type: "string", description: "截止日期 ISO 格式" },
      reason: { type: "string", description: "创建原因" },
    },
    required: ["plantId", "type"],
  },

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const [row] = await db
      .insert(schema.careTasks)
      .values({
        plantId: params.plantId,
        userId: context.userId,
        type: params.type,
        title: params.title,
        dueDate: params.dueDate ? new Date(params.dueDate) : null,
        reason: params.reason,
      })
      .returning();

    return {
      success: true,
      data: row,
      metadata: {
        role: MessageRole.Tool,
        tool_call_id: "createCareTaskTool",
        content: `养护任务已创建：${row.title ?? row.type}，截止日期: ${row.dueDate?.toISOString().split("T")[0] ?? "未设置"}，ID: ${row.id}`,
      },
    };
  },
};