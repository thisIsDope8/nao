import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';

import { env } from './env';

if (env.LANGFUSE_ENABLED && env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY) {
	const sdk = new NodeSDK({
		spanProcessors: [new LangfuseSpanProcessor()],
	});

	sdk.start();
}
