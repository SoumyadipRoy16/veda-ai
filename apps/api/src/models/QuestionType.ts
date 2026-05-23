import { Schema, model, type InferSchemaType } from 'mongoose';

const questionTypeSchema = new Schema(
	{
		key: { type: String, required: true, unique: true, index: true },
		label: { type: String, required: true },
		description: { type: String, default: '' },
		defaultDifficulty: { type: String, required: true },
		defaultMarksPerQuestion: { type: Number, required: true },
		maxQuestions: { type: Number },
		active: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

export type QuestionTypeDocument = InferSchemaType<typeof questionTypeSchema>;

export const QuestionTypeModel = model('QuestionType', questionTypeSchema);