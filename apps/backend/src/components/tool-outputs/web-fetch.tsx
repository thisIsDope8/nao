import { Block, Link } from '../../lib/markdown';
import type { WebPageContent } from '../../services/web-search';

export function WebFetchOutput({ output }: { output: WebPageContent }) {
	return (
		<Block>
			<Link href={output.url} text={output.title || output.url} />
			{output.description ? <Block separator=''>{output.description}</Block> : null}
			<Block separator=''>{output.text || 'No readable content found.'}</Block>
		</Block>
	);
}
