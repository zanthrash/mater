export interface AnthropicUsage {
  input_tokens: number
  output_tokens: number
}

export type WithUsage<T> = { result: T; usage: AnthropicUsage }
