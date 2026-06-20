import { getConfiguredProviderIds, toAgentOption } from '@/providers/opencode-provider-utils';

// Modified by fcaloro-beep: tolerate API shape drift across OpenCode releases.

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export async function discoverChatCapabilities(client: any, activeProjectPath?: string) {
  if (!activeProjectPath) {
    return {
      config: undefined,
      providers: [],
      providerAuthMethodsById: {},
      models: [],
      agents: [],
    };
  }

  const [configResponse, providersResponse, providerAuthResponse, agentsResponse] = await Promise.all([
    client.config.get(),
    client.provider.list(),
    client.provider.auth().catch(() => ({ data: {} })),
    client.app.agents().catch(() => ({ data: [] })),
  ]);

  const nextConfig = configResponse?.data;
  const providerPayload = providersResponse?.data || {};
  const providers = asArray<any>(providerPayload.all);
  const connected = asArray<string>(providerPayload.connected);
  const nextModels = uniqueById(providers
    .flatMap((provider: any) =>
      Object.values(provider?.models || {}).map((model: any) => ({
        id: `${provider.id}/${model.id}`,
        label: model.name,
        providerID: provider.id,
        providerLabel: provider.name,
        modelID: model.id,
        supportsReasoning: model.reasoning,
      })),
    )
    .sort((left: any, right: any) => left.label.localeCompare(right.label)));

  const configuredProviderIds = getConfiguredProviderIds(nextConfig, connected, nextModels);
  const configuredModels = nextModels.filter((model: any) => configuredProviderIds.has(model.providerID));
  const nextProviders = uniqueById(providers
    .map((provider: any) => ({
      id: provider.id,
      label: provider.name,
      modelCount: Object.keys(provider?.models || {}).length,
      configured: configuredProviderIds.has(provider.id),
    }))
    .sort((left: any, right: any) => left.label.localeCompare(right.label)));
  const nextAgents = uniqueById(asArray<any>(agentsResponse?.data).map((agent: any) => toAgentOption(agent)));

  return {
    config: nextConfig,
    providers: nextProviders,
    connected,
    providerAuthMethodsById: (providerAuthResponse?.data || {}) as Record<string, any[]>,
    models: nextModels,
    agents: nextAgents,
    configuredModels,
  };
}
