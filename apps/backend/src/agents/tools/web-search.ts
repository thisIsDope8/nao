import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LlmProvider } from '@nao/shared/types';

import type { WebSearchMode } from '../../types/agent-settings';
import type { ProviderSettings } from '../../types/llm';
import { createCustomWebSearchTools } from './web-search-custom';

type ProviderToolCreator = (settings: ProviderSettings) => unknown;

const WEB_SEARCH_CREATORS: Partial<Record<LlmProvider, ProviderToolCreator>> = {
	openai: (settings) => createOpenAI(settings).tools.webSearch({ searchContextSize: 'medium' }),
	anthropic: (settings) => createAnthropic(settings).tools.webSearch_20250305({ maxUses: 5 }),
	google: (settings) => createGoogleGenerativeAI(settings).tools.googleSearch({}),
};

const WEB_FETCH_CREATORS: Partial<Record<LlmProvider, ProviderToolCreator>> = {
	anthropic: (settings) => createAnthropic(settings).tools.webFetch_20250910({ maxUses: 3 }),
};

export const WEB_SEARCH_PROVIDERS = new Set(Object.keys(WEB_SEARCH_CREATORS) as LlmProvider[]);

export function resolveWebSearchMode(provider: LlmProvider, configuredMode?: WebSearchMode): WebSearchMode {
	// console.log('resolveWebSearchMode: ', provider, configuredMode);
	// if (configuredMode) {
	// 	return configuredMode;
	// }

	return provider === 'openaiCompatible' ? 'custom' : 'provider';
}

export function createWebSearchTools(
	provider: LlmProvider,
	mode: WebSearchMode,
	settings?: ProviderSettings,
): Record<string, unknown> | null {
	if (mode === 'custom') {
		return createCustomWebSearchTools();
	}

	if (!settings) {
		return null;
	}

	const searchCreator = WEB_SEARCH_CREATORS[provider];
	if (!searchCreator) {
		return null;
	}

	const tools: Record<string, unknown> = {
		web_search: searchCreator(settings),
	};

	const fetchCreator = WEB_FETCH_CREATORS[provider];
	if (fetchCreator) {
		tools.web_fetch = fetchCreator(settings);
	}

	return tools;
}
