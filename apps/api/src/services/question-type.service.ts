import type { DifficultyLevel, QuestionTypeOption } from '@shared/schemas/assignment';

import { cacheService } from './cache.service';
import { QuestionTypeModel } from '../models/QuestionType';

const CACHE_KEY = 'question-types:list';

export async function listQuestionTypes(): Promise<QuestionTypeOption[]> {
	const cached = cacheService.get<QuestionTypeOption[]>(CACHE_KEY);
	if (cached) {
		return cached;
	}

	const questionTypes = await QuestionTypeModel.find({ active: true }).sort({ createdAt: 1 }).lean();
	const mapped = questionTypes.map((item) => ({
		type: item.key,
		label: item.label,
		description: item.description,
		defaultDifficulty: item.defaultDifficulty as DifficultyLevel,
		defaultMarksPerQuestion: item.defaultMarksPerQuestion,
		maxQuestions: item.maxQuestions ?? undefined,
	}));
	cacheService.set(CACHE_KEY, mapped, 5 * 60_000);
	return mapped;
}

export function invalidateQuestionTypeCache() {
	cacheService.delete(CACHE_KEY);
}