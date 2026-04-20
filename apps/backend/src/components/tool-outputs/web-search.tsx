import { Block, Link, ListItem, TitledList } from '../../lib/markdown';
import type { WebSearchResult } from '../../services/web-search';

export function WebSearchOutput({ output }: { output: WebSearchResult }) {
	if (output.sources.length === 0) {
		return <Block>No web results found for "{output.query}".</Block>;
	}

	return (
		<Block>
			<Block separator=''>Query: {output.query}</Block>
			<TitledList title={`Sources (${output.sources.length})`}>
				{output.sources.map((source) => (
					<ListItem key={source.url}>
						<Link href={source.url} text={source.title || source.url} />
						{source.snippet ? ` - ${source.snippet}` : ''}
					</ListItem>
				))}
			</TitledList>
		</Block>
	);
}
