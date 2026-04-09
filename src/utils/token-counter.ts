export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English text/code
  return Math.ceil(text.length / 4);
}
