import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletion,
} from "openai/resources/chat/completions";
import { log, withLogContext } from "../lib/logger.js";
import { MessageRole } from "../types/message.js";
import { ToolErrorCode } from "../types/tool.js";
import type { ToolDefinition, ToolResult, ToolRegistry } from "../types/tool.js";

export interface AgentRequest {
  message: string;
  imageUrls?: string[];
  history?: ChatCompletionMessageParam[];
}

export interface AgentContext {
  userId: string;
  [key: string]: unknown;
}

export interface ToolCallRecord {
  name: string;
  arguments: unknown;
  result: unknown;
}

export interface AgentRunResult {
  reply: string;
  toolCalls: ToolCallRecord[];
}

export interface LLMClient {
  chat(
    messages: ChatCompletionMessageParam[],
    tools?: ChatCompletionTool[],
  ): Promise<ChatCompletion>;
}

export interface BaseAgentConfig {
  systemPrompt: string;
  tools: ToolRegistry;
  llmClient: LLMClient;
  maxRounds?: number;
}

export class BaseAgent {
  protected readonly systemPrompt: string;
  protected readonly tools: ToolRegistry;
  protected readonly llmClient: LLMClient;
  protected readonly maxRounds: number;

  constructor(config: BaseAgentConfig) {
    this.systemPrompt = config.systemPrompt;
    this.tools = config.tools;
    this.llmClient = config.llmClient;
    this.maxRounds = config.maxRounds ?? 8;
  }

  async run(request: AgentRequest, context: AgentContext): Promise<AgentRunResult> {
    const messages = this.buildMessages(request);
    const toolCalls: ToolCallRecord[] = [];

    for (let round = 0; round < this.maxRounds; round++) {
      const response = await this.llmClient.chat(messages, this.getTools());
      const assistantMessage = response.choices[0].message;
      messages.push(assistantMessage as ChatCompletionMessageParam);

      if (!assistantMessage.tool_calls?.length) {
        const reply = assistantMessage.content ?? "";
        log.info("agent run done", { reply: reply.slice(0, 60), toolCalls: toolCalls.length });
        await this.onComplete(reply, toolCalls, request, context);
        return { reply, toolCalls };
      }

      for (const call of assistantMessage.tool_calls) {
        const { result, record } = await this.executeToolCall(call, context);
        toolCalls.push(record);
        messages.push(result.metadata);
      }
    }

    log.warn("max rounds reached", { toolCalls: toolCalls.length });
    const reply = "已达到工具调用上限，请稍后重试。";
    await this.onComplete(reply, toolCalls, request, context);
    return { reply, toolCalls };
  }

  protected buildMessages(request: AgentRequest): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [
      { role: MessageRole.System, content: this.systemPrompt },
      ...(request.history ?? []),
    ];

    if (request.imageUrls?.length) {
      messages.push({
        role: MessageRole.User,
        content: [
          { type: "text", text: request.message },
          ...request.imageUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      });
    } else {
      messages.push({ role: MessageRole.User, content: request.message });
    }

    return messages;
  }

  protected getTools(): ChatCompletionTool[] {
    return Object.values(this.tools).map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema as Record<string, unknown>,
      },
    }));
  }

  protected async executeToolCall(
    call: {
      id: string;
      function: { name: string; arguments: string };
    },
    context: AgentContext,
  ): Promise<{ result: ToolResult; record: ToolCallRecord }> {
    const toolName = call.function.name;
    const tool = this.tools[toolName];

    if (!tool) {
      log.warn("tool not found", { toolName });
      const result: ToolResult = {
        success: false,
        code: ToolErrorCode.ToolNotFound,
        error: `工具 ${toolName} 不存在`,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: call.id,
          content: `工具 ${toolName} 不存在`,
        },
      };
      return {
        result,
        record: { name: toolName, arguments: {}, result: result.error },
      };
    }

    let args: unknown;
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch (error) {
      log.warn("invalid tool args", { toolName, raw: call.function.arguments });
      const result: ToolResult = {
        success: false,
        code: ToolErrorCode.InvalidArgs,
        error: `工具 ${toolName} 参数解析失败: ${(error as Error).message}`,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: call.id,
          content: `工具 ${toolName} 参数解析失败`,
        },
      };
      return {
        result,
        record: { name: toolName, arguments: {}, result: result.error },
      };
    }

    let result: ToolResult;
    const start = Date.now();
    try {
      result = await withLogContext({ tool: toolName }, () =>
        tool.execute(args as never, context as never),
      );
    } catch (error) {
      log.error("tool execute threw", { toolName, err: error, durationMs: Date.now() - start });
      result = {
        success: false,
        code: ToolErrorCode.ExecutionFailed,
        error: `工具 ${toolName} 执行异常: ${(error as Error).message}`,
        metadata: {
          role: MessageRole.Tool,
          tool_call_id: call.id,
          content: `工具 ${toolName} 执行异常`,
        },
      };
    }

    if (result.success) {
      log.info("tool ok", { toolName, durationMs: Date.now() - start });
    } else {
      log.warn("tool failed", { toolName, code: result.code, durationMs: Date.now() - start });
    }

    this.onToolResult(toolName, args, result, context);

    return {
      result,
      record: {
        name: toolName,
        arguments: args,
        result: result.success ? result.data : result.error,
      },
    };
  }

  protected onToolResult(
    _toolName: string,
    _args: unknown,
    _result: ToolResult,
    _context: AgentContext,
  ): void {}

  protected async onComplete(
    _reply: string,
    _toolCalls: ToolCallRecord[],
    _request: AgentRequest,
    _context: AgentContext,
  ): Promise<void> {}
}