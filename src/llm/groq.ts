import Groq from "groq-sdk";
import type { LLMMessage, LLMProvider, SendTextOptions } from "./types";

const DEFAULT_MODEL = "qwen/qwen3.8-27b";

export class GroqProvider implements LLMProvider {
  name = "groq" as const;

  private client: Groq;

  constructor(apiKey = process.env.GROQ_API_KEY) {
    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY");
    }

    this.client = new Groq({ apiKey });
  }

  async sendText(
    prompt: string,
    options: SendTextOptions = {}
  ): Promise<string> {
    const messages: LLMMessage[] = [
      ...(options.systemPrompt
        ? [{ role: "system" as const, content: options.systemPrompt }]
        : []),
      { role: "user", content: prompt },
    ];

    return this.sendMessages(messages, options);
  }

  async sendMessages(
    messages: LLMMessage[],
    options: SendTextOptions = {}
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? DEFAULT_MODEL,
      temperature: options.temperature ?? 0.1,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    });

    return response.choices[0]?.message?.content ?? "";
  }
}