export function injectPrismaModels(existingSchema: string, newModelsRaw: string): string {
  const models = extractModelBlocks(newModelsRaw);
  if (models.length === 0) {
    throw new Error('No valid model blocks found in AI response.');
  }

  const block =
    '// @stacksnap added\n' +
    models.join('\n\n') +
    '\n// @stacksnap end';

  if (!existingSchema.trim()) {
    return block + '\n';
  }

  const lastBrace = existingSchema.lastIndexOf('}');
  if (lastBrace === -1) {
    return existingSchema.trimEnd() + '\n\n' + block + '\n';
  }

  const before = existingSchema.slice(0, lastBrace + 1);
  const after = existingSchema.slice(lastBrace + 1);
  return before + '\n\n' + block + '\n' + after;
}

export function extractModelBlocks(raw: string): string[] {
  const regex = /model\s+\w+\s*\{[\s\S]*?\}/g;
  const matches = raw.match(regex);
  if (matches && matches.length > 0) {
    return matches;
  }
  throw new Error('Could not extract any Prisma model blocks from AI output.');
}
