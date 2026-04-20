import * as cheerio from 'cheerio';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const DUCKDUCKGO_SEARCH_URL = 'https://html.duckduckgo.com/html/';
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_FETCH_TEXT_LENGTH = 12_000;
const PROXY_URL = resolveProxyUrl();
const PROXY_AGENT = PROXY_URL ? new ProxyAgent(PROXY_URL) : null;

const REQUEST_HEADERS = {
	accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
	'accept-language': 'en-US,en;q=0.9',
	'user-agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
};

export interface WebSearchSource {
	url: string;
	title: string | null;
	snippet: string | null;
}

export interface WebSearchResult {
	query: string;
	sources: WebSearchSource[];
}

export interface WebPageContent {
	url: string;
	title: string | null;
	description: string | null;
	text: string;
}

export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResult> {
	console.log('checking web search: ', query);
	const response = await fetchWithProxy(DUCKDUCKGO_SEARCH_URL, {
		method: 'POST',
		headers: {
			...REQUEST_HEADERS,
			'content-type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({ q: query }).toString(),
		signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(`Web search failed with status ${response.status}`);
	}

	const html = await response.text();
	const $ = cheerio.load(html);
	const sources: WebSearchSource[] = [];
	const seenUrls = new Set<string>();

	for (const result of $('.result').toArray()) {
		if (sources.length >= maxResults) {
			break;
		}

		const link = $(result).find('a.result__a').first();
		const url = normalizeSearchResultUrl(link.attr('href'));
		if (!url || seenUrls.has(url)) {
			continue;
		}

		seenUrls.add(url);
		sources.push({
			url,
			title: normalizeWhitespace(link.text()) || null,
			snippet: normalizeWhitespace($(result).find('.result__snippet').first().text()) || null,
		});
	}

	return { query, sources };
}

export async function fetchWebPage(url: string): Promise<WebPageContent> {
	const normalizedUrl = normalizeHttpUrl(url);
	const response = await fetchWithProxy(normalizedUrl, {
		headers: REQUEST_HEADERS,
		signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(`Web fetch failed with status ${response.status}`);
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (!isReadableContentType(contentType)) {
		throw new Error(`Unsupported content type: ${contentType || 'unknown'}`);
	}

	const rawContent = await response.text();
	const content = contentType.includes('text/plain')
		? {
				title: null,
				description: null,
				text: truncateText(normalizeWhitespace(rawContent), MAX_FETCH_TEXT_LENGTH),
			}
		: extractHtmlContent(rawContent);

	return {
		url: normalizedUrl,
		...content,
	};
}

function extractHtmlContent(html: string): Omit<WebPageContent, 'url'> {
	const $ = cheerio.load(html);
	$('script, style, noscript, iframe, svg').remove();

	return {
		title: extractTitle($),
		description: extractDescription($),
		text: truncateText(extractText($), MAX_FETCH_TEXT_LENGTH),
	};
}

async function fetchWithProxy(input: Parameters<typeof undiciFetch>[0], init?: Parameters<typeof undiciFetch>[1]) {
	return undiciFetch(input, {
		...init,
		dispatcher: init?.dispatcher ?? PROXY_AGENT ?? undefined,
	});
}

function extractTitle($: cheerio.CheerioAPI): string | null {
	return (
		normalizeWhitespace($('title').first().text()) ||
		normalizeWhitespace($('meta[property="og:title"]').attr('content')) ||
		null
	);
}

function extractDescription($: cheerio.CheerioAPI): string | null {
	return (
		normalizeWhitespace($('meta[name="description"]').attr('content')) ||
		normalizeWhitespace($('meta[property="og:description"]').attr('content')) ||
		null
	);
}

function extractText($: cheerio.CheerioAPI): string {
	const candidates = [$('main').first().text(), $('article').first().text(), $('[role="main"]').first().text(), $('body').text()];

	for (const candidate of candidates) {
		const normalized = normalizeWhitespace(candidate);
		if (normalized) {
			return normalized;
		}
	}

	return '';
}

function normalizeSearchResultUrl(rawUrl: string | undefined): string | null {
	if (!rawUrl) {
		return null;
	}

	try {
		const url = new URL(rawUrl, 'https://duckduckgo.com');
		const redirectTarget = url.searchParams.get('uddg');
		return redirectTarget ? normalizeHttpUrl(decodeURIComponent(redirectTarget)) : normalizeHttpUrl(url.toString());
	} catch {
		return null;
	}
}

function resolveProxyUrl(): string | null {
	return process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? process.env.https_proxy ?? process.env.http_proxy ?? null;
}

function normalizeHttpUrl(rawUrl: string): string {
	const url = new URL(rawUrl);
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error('Only http and https URLs are supported');
	}
	return url.toString();
}

function isReadableContentType(contentType: string): boolean {
	return contentType.includes('text/html') || contentType.includes('application/xhtml+xml') || contentType.includes('text/plain');
}

function normalizeWhitespace(value: string | undefined): string {
	return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function truncateText(value: string, maxLength: number): string {
	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength)}...`;
}
