import Redis from 'ioredis';

import { env } from './env';

let redisClient: Redis | null = null;

export function getRedisClient() {
	if (!env.REDIS_URL) {
		return null;
	}

	if (!redisClient) {
		redisClient = new Redis(env.REDIS_URL, {
			lazyConnect: true,
			maxRetriesPerRequest: 1,
			enableAutoPipelining: true,
		});
	}

	return redisClient;
}

export async function connectRedis() {
	const client = getRedisClient();
	if (!client) {
		return null;
	}

	if (client.status === 'wait' || client.status === 'end') {
		await client.connect();
	}

	return client;
}

export async function disconnectRedis() {
	if (redisClient) {
		await redisClient.quit();
		redisClient = null;
	}
}
