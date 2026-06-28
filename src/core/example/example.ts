/**
 * 独立示例:演示 ModelManager + LLMClient + BaseAgent 的完整组合。
 *
 * 运行方式:
 *   1. 把 OPENAI_API_KEY / OPENAI_MODEL 写入项目根目录 .env(参考 .env.example)
 *   2. npx tsx src/core/example/example.ts
 *
 * 本示例刻意不引用 src/config.ts(那会强制校验 DB 等 env),
 * 仅依赖 dotenv + OpenAI SDK 自建 client,体现核心层(ModelManager/LLMClient/BaseAgent)的解耦设计。
 */
import "dotenv/config";
import OpenAI from "openai";

import { modelManager } from "../llm/model-manager.js";
import { createOpenAIClient } from "../llm/openai-client.js";
import { BaseAgent, type AgentContext, type AgentRequest } from "../agent/index.js";
import type { ToolDefinition, ToolResult } from "../../types/tool.js";
import { MessageRole } from "../../types/message.js";

/* ------------------------------------------------------------------ */
/* 1. 校验 env + 自建 OpenAI client                                      */
/* ------------------------------------------------------------------ */

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  process.stderr.write("OPENAI_API_KEY not set in .env\n");
  process.exit(1);
}
const textModel = process.env.OPENAI_MODEL ?? "gpt-4o";
const openai = new OpenAI({ apiKey });

/* ------------------------------------------------------------------ */
/* 2. 注册模型(本示例自包含,modelManager 是单例默认为空)                */
/* ------------------------------------------------------------------ */

modelManager.register({ id: textModel, capabilities: ["text", "reasoning", "vision"] });
modelManager.setDefault("text", textModel);
modelManager.setDefault("reasoning", textModel);
modelManager.setDefault("vision", textModel);

console.log("available models:", modelManager.list().map((m) => m.id));

/* ------------------------------------------------------------------ */
/* 3. 用 createOpenAIClient 构造走 ModelManager 路由的 LLMClient          */
/*    也可传入 { model: { override: "xxx" } } 强制走某模型               */
/* ------------------------------------------------------------------ */

const client = createOpenAIClient({ client: openai });

/* ------------------------------------------------------------------ */
/* 4. 一个简单 tool:getCurrentTime                                       */
/* ------------------------------------------------------------------ */

const getTimeTool: ToolDefinition = {
  name: "getCurrentTime",
  description: "获取当前服务器时间(ISO 字符串)。",
  schema: { type: "object", properties: {} },
  async execute(): Promise<ToolResult<string>> {
    return {
      success: true,
      data: new Date().toISOString(),
      metadata: {
        role: MessageRole.Tool,
        tool_call_id: "getCurrentTime",
        content: new Date().toISOString(),
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/* 5. 用 BaseAgent 跑一轮                                               */
/* ------------------------------------------------------------------ */

const agent = new BaseAgent({
  systemPrompt: "你是一个时间助手。需要知道时间时调用 getCurrentTime 工具。",
  tools: { getCurrentTime: getTimeTool },
  llmClient: client,
  maxRounds: 4,
});

async function main(): Promise<void> {
  const request: AgentRequest = { message: "现在几点?用 24 小时制告诉我。" };
  const context: AgentContext = { userId: "example-user" };

  const result = await agent.run(request, context);

  process.stdout.write("\n=== Agent Reply ===\n");
  process.stdout.write(result.reply + "\n");
  process.stdout.write(`\n(tool calls: ${result.toolCalls.length})\n`);
  for (const tc of result.toolCalls) {
    process.stdout.write(
      `  - ${tc.name}(${JSON.stringify(tc.arguments)}) => ${JSON.stringify(tc.result)}\n`,
    );
  }
}

void main();