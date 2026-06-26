import { propagateAttributes } from '@langfuse/tracing';
import type { TelemetrySettings } from 'ai';

import { env } from '../env';

export interface LangfuseTraceContext {
	userId?: string;
	sessionId?: string;
	tags?: string[];
	metadata?: Record<string, string>;
}

export function isLangfuseEnabled(): boolean {
	return env.LANGFUSE_ENABLED;
}

export function aiTelemetrySettings(
	functionId: string,
	metadata?: Record<string, string | number | boolean>,
): TelemetrySettings | undefined {
	if (!isLangfuseEnabled()) {
		return undefined;
	}

	return {
		isEnabled: true,
		functionId,
		metadata,
	};
}

/** Spread into AI SDK calls to enable Langfuse telemetry when configured. */
export function langfuseTelemetry(
	functionId: string,
	metadata?: Record<string, string | number | boolean>,
): { experimental_telemetry?: TelemetrySettings } {
	const settings = aiTelemetrySettings(functionId, metadata);
	return settings ? { experimental_telemetry: settings } : {};
}

export async function withLangfuseTrace<T>(
	context: LangfuseTraceContext,
	fn: () => Promise<T> | T,
): Promise<T> {
	if (!isLangfuseEnabled()) {
		return fn();
	}

	return propagateAttributes(
		{
			userId: context.userId,
			sessionId: context.sessionId,
			tags: context.tags,
			metadata: context.metadata,
		},
		fn,
	);
}
