import { describe, it, expect } from "vitest";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { BaseAgent } from "../index.js";
import type { LLMClient } from "../../llm/index.js";
import { MessageRole } from "../../../types/message.js";
import { ToolErrorCode, type ToolDefinition, type ToolRegistry, type ToolResult } from "../../../types/tool.js";

/** 按顺序返回预设响应的假 LLM client */
function makeFakeLLM(responses: ChatCompletion[]): LLMClient {
  let i = 0;
  return {
    async chat(): Promise<ChatCompletion> {
      const r = responses[i++];
      if (!r) throw new Error("no more fake responses");
      return r;
    },
  };
}

/** 造一个普通 assistant 文本回复 */
function textReply(content: string): ChatCompletion {
  return {
    choices: [{ message: { role: MessageRole.Assistant, content } as ChatCompletionMessageParam }],
  } as ChatCompletion;
}

/** 造一个带 tool_calls 的 assistant 回复 */
function toolCallReply(
  calls: Array<{ id: string; name: string; args: string }>,
): ChatCompletion {
  return {
    choices: [
      {
        message: {
          role: MessageRole.Assistant,
          content: null,
          tool_calls: calls.map((c) => ({
            id: c.id,
            type: "function" as const,
            function: { name: c.name, arguments: c.args },
          })),
        } as ChatCompletionMessageParam,
      },
    ],
  } as ChatCompletion;
}

/** 造一个成功工具 */
function makeTool(name: string, impl: (args: unknown) => Promise<ToolResult>): ToolDefinition {
  return {
    name,
    description: `${name} tool`,
    schema: { type: "object", properties: {} },
    execute: impl,
  };
}

describe("BaseAgent", () => {
  describe("run - 正常流程", () => {
    it("LLM 直接回复时返回 content 并跳过工具", async () => {
      const llm = makeFakeLLM([textReply("你好")]);
      const agent = new BaseAgent({
        systemPrompt: "test",
        tools: {},
        llmClient: llm,
      });

      const res = await agent.run(
        { message: "hi" },
        { userId: "u1" },
      );

      expect(res.reply).toBe("你好");
      expect(res.toolCalls).toHaveLength(0);
    });

    it("调用工具后用工具结果继续对话", async () => {
      const myTool = makeTool("echo", async (args) => ({
        success: true,
        data: args,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: "c1",
          content: JSON.stringify(args),
        },
      }));

      const llm = makeFakeLLM([
        toolCallReply([{ id: "c1", name: "echo", args: '{"msg":"hi"}' }]),
        textReply("收到: hi"),
      ]);

      const agent = new BaseAgent({
        systemPrompt: "test",
        tools: { echo: myTool },
        llmClient: llm,
      });

      const res = await agent.run({ message: "用 echo" }, { userId: "u1" });

      expect(res.toolCalls).toHaveLength(1);
      expect(res.toolCalls[0]).toMatchObject({ name: "echo", arguments: { msg: "hi" } });
      expect(res.reply).toBe("收到: hi");
    });
  });

  describe("executeToolCall - 错误分支", () => {
    it("工具不存在 → ToolNotFound", async () => {
      const llm = makeFakeLLM([
        toolCallReply([{ id: "c1", name: "ghostTool", args: "{}" }]),
        textReply("done"),
      ]);
      const agent = new BaseAgent({
        systemPrompt: "test",
        tools: {},
        llmClient: llm,
      });

      const res = await agent.run({ message: "x" }, { userId: "u1" });

      expect(res.toolCalls[0].result).toContain("不存在");
    });

    it("参数 JSON 非法 → InvalidArgs，不调用工具 execute", async () => {
      let executed = 0;
      const tool = makeTool("needsArgs", async () => {
        executed++;
        return {
          success: true,
          data: null,
          metadata: { role: MessageRole.Tool, tool_call_id: "c1", content: "" },
        };
      });

      const llm = makeFakeLLM([
        toolCallReply([{ id: "c1", name: "needsArgs", args: "{not json" }]),
        textReply("ok"),
      ]);

      const agent = new BaseAgent({
        systemPrompt: "test",
        tools: { needsArgs: tool },
        llmClient: llm,
      });

      const res = await agent.run({ message: "x" }, { userId: "u1" });

      expect(executed).toBe(0);
      expect(res.toolCalls[0].result).toContain("参数解析失败");
    });

    it("工具 execute 抛异常 → ExecutionFailed，run 继续执行", async () => {
      const tool = makeTool("boom", async () => {
        throw new Error("boom!");
      });

      const llm = makeFakeLLM([
        toolCallReply([{ id: "c1", name: "boom", args: "{}" }]),
        textReply("handled"),
      ]);

      const agent = new BaseAgent({
        systemPrompt: "test",
        tools: { boom: tool },
        llmClient: llm,
      });

      const res = await agent.run({ message: "x" }, { userId: "u1" });

      expect(res.toolCalls[0].result).toContain("执行异常");
      expect(res.toolCalls[0].result).toContain("boom!");
      expect(res.reply).toBe("handled");
    });
  });

  describe("maxRounds 上限", () => {
    it("持续调用工具会触发 maxRounds 截断", async () => {
      const tool = makeTool("loop", async () => ({
        success: true,
        data: null,
        metadata: { role: MessageRole.Tool, tool_call_id: "c", content: "ok" },
      }));

      // 永远调工具，永远不直接回复
      const llm = makeFakeLLM(
        Array.from({ length: 10 }, () =>
          toolCallReply([{ id: "c", name: "loop", args: "{}" }]),
        ),
      );

      const agent = new BaseAgent({
        systemPrompt: "test",
        tools: { loop: tool },
        llmClient: llm,
        maxRounds: 3,
      });

      const res = await agent.run({ message: "loop" }, { userId: "u1" });

      expect(res.toolCalls).toHaveLength(3);
      expect(res.reply).toBe("已达到工具调用上限，请稍后重试。");
    });
  });

  describe("buildMessages - 图片", () => {
    it("imageUrls 会构造 content 数组", async () => {
      let captured: ChatCompletionMessageParam[] = [];
      const llm: LLMClient = {
        async chat(msgs) {
          captured = msgs;
          return textReply("ok");
        },
      };

      const agent = new BaseAgent({
        systemPrompt: "sys",
        tools: {},
        llmClient: llm,
      });

      await agent.run(
        { message: "看图", imageUrls: ["https://example.com/a.jpg"] },
        { userId: "u1" },
      );

      const userMsg = captured.find((m) => m.role === "user");
      expect(userMsg).toBeDefined();
      // content 数组里包含 image_url
      expect(userMsg?.content).toMatchObject([
        { type: "text", text: "看图" },
        { type: "image_url", image_url: { url: "https://example.com/a.jpg" } },
      ]);
    });
  });

  describe("onToolResult / onComplete hook", () => {
    it("onToolResult 能拿到工具名和结果；onComplete 拿到 reply", async () => {
      const records: string[] = [];
      const completed: string[] = [];

      class TestAgent extends BaseAgent {
        protected onToolResult(name: string): void {
          records.push(name);
        }
        protected async onComplete(reply: string): Promise<void> {
          completed.push(reply);
        }
      }

      const tool = makeTool("hookTool", async (args) => ({
        success: true,
        data: args,
        metadata: { role: MessageRole.Tool, tool_call_id: "c1", content: "ok" },
      }));

      const llm = makeFakeLLM([
        toolCallReply([{ id: "c1", name: "hookTool", args: "{}" }]),
        textReply("done"),
      ]);

      const agent = new TestAgent({
        systemPrompt: "test",
        tools: { hookTool: tool },
        llmClient: llm,
      });

      await agent.run({ message: "go" }, { userId: "u1" });

      expect(records).toEqual(["hookTool"]);
      expect(completed).toEqual(["done"]);
    });
  });

  describe("ToolErrorCode 常量", () => {
    it("值与字符串字面量匹配", () => {
      expect(ToolErrorCode.ToolNotFound).toBe("tool_not_found");
      expect(ToolErrorCode.InvalidArgs).toBe("invalid_args");
      expect(ToolErrorCode.ExecutionFailed).toBe("execution_failed");
    });
  });
});