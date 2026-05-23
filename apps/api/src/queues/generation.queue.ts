import { Queue } from 'bullmq';

import { env } from '../config/env';
import { getRedisClient } from '../config/redis';

const redisClient = getRedisClient();

export const generationQueue = env.REDIS_URL && redisClient
	? new Queue('assignment-generation', {
		connection: redisClient,
	})
	: null;

export async function enqueueAssignmentGeneration(assignmentId: string) {
	if (!generationQueue) {
		return false;
	}

	await generationQueue.add('generate', { assignmentId }, { removeOnComplete: true, removeOnFail: false });
	return true;
}export {};
