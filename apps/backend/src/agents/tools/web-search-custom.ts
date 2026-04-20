import { z } from 'zod';

import { renderToModelOutput, WebFetchOutput, WebSearchOutput } from '../../components/tool-outputs';
import { fetchWebPage, searchWeb } from '../../services/web-search';
import { createTool } from '../../utils/tools';

const webSearchInputSchema = z.object({
	query: z.string().trim().min(2).max(200),
});

const webFetchInputSchema = z.object({
	url: z.string().trim().url(),
});

const webSearchOutputSchema = z.object({
	_version: z.literal('1'),
	action: z.object({
		type: z.literal('search'),
		query: z.string(),
	}),
	sources: z.array(
		z.object({
			url: z.string().url(),
			title: z.string().nullable(),
			snippet: z.string().nullable(),
		}),
	),
});

const webFetchOutputSchema = z.object({
	_version: z.literal('1'),
	url: z.string().url(),
	content: z.object({
		title: z.string().nullable(),
		description: z.string().nullable(),
		text: z.string(),
	}),
});

const webSearch = createTool<z.infer<typeof webSearchInputSchema>, z.infer<typeof webSearchOutputSchema>>({
	description: 'Search the public web and return the most relevant pages.',
	inputSchema: webSearchInputSchema,
	outputSchema: webSearchOutputSchema,
	execute: async ({ query }) => {
		const result = await searchWeb(query);

		return {
			_version: '1' as const,
			action: {
				type: 'search' as const,
				query: result.query,
			},
			sources: result.sources,
		};
	},
	toModelOutput: ({ output }) =>
		renderToModelOutput(
			WebSearchOutput({
				output: {
					query: output.action.query,
					sources: output.sources,
				},
			}),
			output,
		),
});

const webFetch = createTool<z.infer<typeof webFetchInputSchema>, z.infer<typeof webFetchOutputSchema>>({
	description: 'Fetch a public web page and extract readable text content.',
	inputSchema: webFetchInputSchema,
	outputSchema: webFetchOutputSchema,
	execute: async ({ url }) => {
		const page = await fetchWebPage(url);

		return {
			_version: '1' as const,
			url: page.url,
			content: {
				title: page.title,
				description: page.description,
				text: page.text,
			},
		};
	},
	toModelOutput: ({ output }) =>
		renderToModelOutput(
			WebFetchOutput({
				output: {
					url: output.url,
					title: output.content.title,
					description: output.content.description,
					text: output.content.text,
				},
			}),
			output,
		),
});

export function createCustomWebSearchTools(): Record<string, unknown> {
	return {
		web_search: webSearch,
		web_fetch: webFetch,
	};
}
