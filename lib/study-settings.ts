export const STUDY_GENERATION_SETTINGS = {
  maxRetries: 0,
  maxOutputTokens: 900,
  temperature: 0,
} as const;

export function buildGatewayProviderOptions(
  modelSlug: string,
): { gateway: { only: string[] } } | undefined {
  const provider = modelSlug.split('/')[0];
  if (!provider) {
    return undefined;
  }

  return { gateway: { only: [provider] } };
}
