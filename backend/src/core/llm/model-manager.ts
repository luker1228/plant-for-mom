import type {
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { ModelInfo, ModelPickerOptions, ModelCapability } from "./types.js";

export class ModelManager {
  private models = new Map<string, ModelInfo>();
  private defaults: Partial<Record<ModelCapability, string>> = {};

  register(info: ModelInfo): void {
    this.models.set(info.id, info);
  }

  setDefault(capability: ModelCapability, modelId: string): void {
    this.defaults[capability] = modelId;
  }

  pickModel(opts: ModelPickerOptions = {}): string {
    if (opts.override) {
      if (!this.models.has(opts.override)) {
        throw new Error(`model not registered: ${opts.override}`);
      }
      return opts.override;
    }
    if (opts.cheap) {
      const id = this.defaults.cheap;
      if (id) return id;
    }
    if (opts.reasoning) {
      const id = this.defaults.reasoning ?? this.defaults.text;
      if (id) return id;
    }
    if (opts.vision) {
      const id = this.defaults.vision;
      if (id) return id;
    }
    const id = this.defaults.text;
    if (!id) throw new Error("no default text model registered");
    return id;
  }

  detectFromMessages(messages: ChatCompletionMessageParam[]): ModelPickerOptions {
    for (const m of messages) {
      if (typeof m.content !== "object" || m.content === null) continue;
      const parts = Array.isArray(m.content) ? m.content : [m.content];
      for (const p of parts as Array<{ type?: string }>) {
        if (p?.type === "image_url") return { vision: true };
      }
    }
    return {};
  }

  resolve(
    messages: ChatCompletionMessageParam[],
    opts: ModelPickerOptions = {},
  ): string {
    const detected = this.detectFromMessages(messages);
    return this.pickModel({ ...detected, ...opts });
  }

  list(): ModelInfo[] {
    return [...this.models.values()];
  }
}

export const modelManager = new ModelManager();