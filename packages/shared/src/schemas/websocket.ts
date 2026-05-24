export type WebSocketEventName =
	| 'assignment:queued'
	| 'assignment:processing'
	| 'assignment:completed'
	| 'assignment:failed';

export type WebSocketEventTopic = 'generation' | 'assignment';

export interface WebSocketEventPayloadMap {
	'assignment:queued': { assignmentId: string };
	'assignment:processing': { assignmentId: string; progress: number; progressMessage?: string };
	'assignment:completed': { assignmentId: string; paperId: string };
	'assignment:failed': { assignmentId: string; reason: string };
}

export interface WebSocketServerEnvelope<T extends WebSocketEventName> {
	type: T;
	data: WebSocketEventPayloadMap[T];
}
export {};
