import { DEFAULT_QUESTION_TYPES } from '../config/default-question-types';
import { AssignmentModel } from '../models/Assignment';
import { GeneratedPaperModel } from '../models/GeneratedPaper';
import { MediaAssetModel } from '../models/MediaAsset';
import { QuestionTypeModel } from '../models/QuestionType';

export async function seedDatabase() {
	await Promise.all([
		QuestionTypeModel.createCollection(),
		AssignmentModel.createCollection(),
		GeneratedPaperModel.createCollection(),
		MediaAssetModel.createCollection(),
	]);

	const existingCount = await QuestionTypeModel.countDocuments();
	if (existingCount > 0) {
		return;
	}

	await QuestionTypeModel.insertMany(
		DEFAULT_QUESTION_TYPES.map((item) => ({
			key: item.type,
			label: item.label,
			description: item.description ?? '',
			defaultDifficulty: item.defaultDifficulty,
			defaultMarksPerQuestion: item.defaultMarksPerQuestion,
			maxQuestions: item.maxQuestions,
			active: true,
		})),
	);
}