import { describe, expect, test } from "bun:test";
import { OpenAICompatibleProvider } from "./openai-compatible";

class TestOpenAICompatibleProvider extends OpenAICompatibleProvider {
  readonly name = "test";
  readonly displayName = "Test";
  readonly defaultUrl = "https://example.com";
  readonly capabilities = {
    parameters: {},
    requiresMaxTokens: false,
    supportsSystemRole: true,
    supportsStreaming: true,
    apiKeyRequired: false,
    modelListStyle: "openai" as const,
  };

  public inspect(content: unknown, reasoning: unknown) {
    return this.splitMirroredReasoning(content, reasoning);
  }
}

describe("OpenAICompatibleProvider reasoning mirroring", () => {
  const provider = new TestOpenAICompatibleProvider();

  test("drops content when it exactly mirrors reasoning", () => {
    expect(provider.inspect("planning", "planning")).toEqual({
      content: "",
      reasoning: "planning",
    });
  });

  test("drops content when it only differs by surrounding whitespace", () => {
    expect(provider.inspect("  planning\n", "planning")).toEqual({
      content: "",
      reasoning: "planning",
    });
  });

  test("preserves normal visible content when it differs from reasoning", () => {
    expect(provider.inspect("Answer", "planning")).toEqual({
      content: "Answer",
      reasoning: "planning",
    });
  });
});

// Shapes per github.com/openai/openai-node ChatCompletionAssistantMessageParam +
// ChatCompletionToolMessageParam:
//   assistant: { role:"assistant", content?, tool_calls?:[{id,type:"function",function:{name,arguments:string}}] }
//   tool:      { role:"tool", tool_call_id, content:string|Array<TextPart> }
describe("OpenAICompatibleProvider tool calling wire shape", () => {
  const provider = new TestOpenAICompatibleProvider();

  test("assistant tool_use parts become tool_calls with stringified arguments", () => {
    const body = (provider as any).buildBody(
      {
        model: "gpt-4o",
        messages: [
          { role: "user", content: "weather please" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Looking it up." },
              { type: "tool_use", id: "call_abc", name: "get_weather", input: { city: "SF" } },
            ],
          },
          {
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: "call_abc", content: "72F" },
            ],
          },
        ],
        parameters: {},
      },
      false,
    );

    expect(body.messages[1]).toEqual({
      role: "assistant",
      content: "Looking it up.",
      tool_calls: [
        {
          id: "call_abc",
          type: "function",
          function: { name: "get_weather", arguments: JSON.stringify({ city: "SF" }) },
        },
      ],
    });
    expect(body.messages[2]).toEqual({
      role: "tool",
      tool_call_id: "call_abc",
      content: "72F",
    });
  });

  test("assistant with only tool_use parts sets content to null", () => {
    const body = (provider as any).buildBody(
      {
        model: "gpt-4o",
        messages: [
          { role: "user", content: "x" },
          {
            role: "assistant",
            content: [
              { type: "tool_use", id: "call_1", name: "ping", input: {} },
            ],
          },
        ],
        parameters: {},
      },
      false,
    );

    expect(body.messages[1]).toEqual({
      role: "assistant",
      content: null,
      tool_calls: [
        { id: "call_1", type: "function", function: { name: "ping", arguments: "{}" } },
      ],
    });
  });

  test("parallel tool_calls in one assistant message", () => {
    const body = (provider as any).buildBody(
      {
        model: "gpt-4o",
        messages: [
          { role: "user", content: "x" },
          {
            role: "assistant",
            content: [
              { type: "tool_use", id: "call_1", name: "a", input: { i: 1 } },
              { type: "tool_use", id: "call_2", name: "b", input: { i: 2 } },
            ],
          },
        ],
        parameters: {},
      },
      false,
    );

    expect(body.messages[1].tool_calls).toEqual([
      { id: "call_1", type: "function", function: { name: "a", arguments: '{"i":1}' } },
      { id: "call_2", type: "function", function: { name: "b", arguments: '{"i":2}' } },
    ]);
  });

  test("multiple tool_results split into separate role:tool messages", () => {
    const body = (provider as any).buildBody(
      {
        model: "gpt-4o",
        messages: [
          { role: "user", content: "x" },
          {
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: "call_1", content: "A" },
              { type: "tool_result", tool_use_id: "call_2", content: "B" },
            ],
          },
        ],
        parameters: {},
      },
      false,
    );

    expect(body.messages.slice(1)).toEqual([
      { role: "tool", tool_call_id: "call_1", content: "A" },
      { role: "tool", tool_call_id: "call_2", content: "B" },
    ]);
  });

  test("string-content messages still work alongside structured ones", () => {
    const body = (provider as any).buildBody(
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: "be nice" },
          { role: "user", content: "hi" },
        ],
        parameters: {},
      },
      false,
    );
    expect(body.messages).toEqual([
      { role: "system", content: "be nice" },
      { role: "user", content: "hi" },
    ]);
  });
});
