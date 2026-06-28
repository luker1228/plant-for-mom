import { BaseAgent } from "./BaseAgent.js";
import type {
  AgentContext,
  AgentRequest,
  AgentRunResult,
  LLMClient,
  ToolCallRecord,
} from "./BaseAgent.js";
import { log, withLogContext } from "../lib/logger.js";
import { SYSTEM_PROMPT } from "../lib/prompts.js";
import { db, schema } from "../db/index.js";
import { identifyPlantTool } from "../tools/identifyPlantTool.js";
import { getCareGuideTool } from "../tools/getCareGuideTool.js";
import { analyzePlantStateTool } from "../tools/analyzePlantStateTool.js";
import { savePlantProfileTool } from "../tools/savePlantProfileTool.js";
import { saveObservationTool } from "../tools/saveObservationTool.js";
import { createCareTaskTool } from "../tools/createCareTaskTool.js";
import { getEnvironmentTool } from "../tools/getEnvironmentTool.js";
import type { ToolDefinition, ToolResult } from "../types/tool.js";

export interface PlantAgentContext extends AgentContext {
  plantId?: string;
  imageUrls?: string[];
}

export interface PlantAgentRequest {
  userId: string;
  message: string;
  plantId?: string;
  imageUrls?: string[];
  history?: AgentRequest["history"];
}

export interface PlantAgentResponse {
  reply: string;
  toolCalls: ToolCallRecord[];
  plantId?: string;
}

export class PlantAgent extends BaseAgent {
  private resolvedPlantId?: string;

  constructor(llmClient: LLMClient) {
    super({
      systemPrompt: SYSTEM_PROMPT,
      tools: PlantAgent.buildToolRegistry(),
      llmClient,
      maxRounds: 8,
    });
  }

  private static buildToolRegistry(): Record<string, ToolDefinition> {
    return {
      [identifyPlantTool.name]: identifyPlantTool as ToolDefinition,
      [getCareGuideTool.name]: getCareGuideTool as ToolDefinition,
      [analyzePlantStateTool.name]: analyzePlantStateTool as ToolDefinition,
      [savePlantProfileTool.name]: savePlantProfileTool as ToolDefinition,
      [saveObservationTool.name]: saveObservationTool as ToolDefinition,
      [createCareTaskTool.name]: createCareTaskTool as ToolDefinition,
      [getEnvironmentTool.name]: getEnvironmentTool as ToolDefinition,
    };
  }

  async chat(request: PlantAgentRequest): Promise<PlantAgentResponse> {
    const context: PlantAgentContext = {
      userId: request.userId,
      plantId: request.plantId,
      imageUrls: request.imageUrls,
    };

    this.resolvedPlantId = request.plantId;

    const result = await withLogContext(
      { agent: "plant", userId: request.userId, plantId: request.plantId },
      () =>
        this.run(
          {
            message: request.message,
            imageUrls: request.imageUrls,
            history: request.history,
          },
          context,
        ),
    );

    log.info("agent chat done", {
      rounds: result.toolCalls.length,
      plantId: this.resolvedPlantId,
    });

    return {
      reply: result.reply,
      toolCalls: result.toolCalls,
      plantId: this.resolvedPlantId ?? context.plantId,
    };
  }

  protected onToolResult(
    toolName: string,
    _args: unknown,
    result: ToolResult,
    context: PlantAgentContext,
  ): void {
    if (toolName === "savePlantProfileTool" && result.success && result.data) {
      const data = result.data as { id?: string };
      if (data.id) {
        this.resolvedPlantId = data.id;
        context.plantId = data.id;
      }
    }
  }

  protected async onComplete(
    reply: string,
    toolCalls: ToolCallRecord[],
    request: AgentRequest,
    context: PlantAgentContext,
  ): Promise<void> {
    await db.insert(schema.conversations).values({
      userId: context.userId,
      plantId: this.resolvedPlantId ?? context.plantId,
      userMessage: request.message,
      agentMessage: reply,
      toolCalls,
    });
  }
}