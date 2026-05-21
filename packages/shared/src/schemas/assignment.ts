export type AssignmentStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'failed';

export type DifficultyLevel = 'easy' | 'moderate' | 'hard';

export interface QuestionConfig {
	type: string;
	count: number;
	marksPerQuestion: number;
	difficulty: DifficultyLevel;
}

export interface AssignmentDraft {
	title: string;
	dueDate: string;
	instructions: string;
	sourceFileName?: string;
	questionTypes: QuestionConfig[];
}

export interface AssignmentSummary extends AssignmentDraft {
	id: string;
	status: AssignmentStatus;
	createdAt: string;
}
export {};
