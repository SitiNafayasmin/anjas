const modelAliases = new Map<string, string>([
  ['coding-free', 'openrouter/free'],
  ['coding-fast', 'groq/compound-mini'],
  ['coding-cheap', 'z-ai/glm-4.5-flash'],
  ['coding-smart', 'kimi/k2'],
]);

export function resolveModelAlias(model: string | undefined): string | undefined {
  if (!model) {
    return model;
  }

  return modelAliases.get(model) ?? model;
}

export function isPublicModelAlias(model: string | undefined): boolean {
  if (!model) {
    return false;
  }

  return modelAliases.has(model);
}

export function listModelAliases() {
  return Array.from(modelAliases.keys()).map((id) => ({
    id,
    object: 'model',
    owned_by: '9router-saas',
  }));
}
