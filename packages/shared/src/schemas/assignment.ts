export type AssignmentStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'failed';
export type AssignmentStage = 'builder' | 'confirmation' | 'generating' | 'ready' | 'error';

export type DifficultyLevel = 'easy' | 'moderate' | 'hard';

export interface QuestionTypeOption {
	type: string;
	label: string;
	description?: string;
	defaultDifficulty: DifficultyLevel;
	defaultMarksPerQuestion: number;
	maxQuestions?: number;
}

export interface UploadedAssetPayload {
	fileName: string;
	mimeType: string;
	dataUrl: string;
	sizeBytes: number;
}

export interface QuestionConfig {
	type: string;
	count: number;
	marksPerQuestion: number;
	difficulty: DifficultyLevel;
}

export interface AssignmentDraft {
	title: string;
	subject: string;
	className: string;
	dueDate: string;
	instructions: string;
	sourceFileName?: string;
	sourceAttachment?: UploadedAssetPayload;
	questionTypes: QuestionConfig[];
}

export interface AssignmentSummary extends AssignmentDraft {
	id: string;
	status: AssignmentStatus;
	createdAt: string;
	progress?: number;
	generatedPaperId?: string;
}

export interface AssignmentGenerationRequest {
	draft: AssignmentDraft;
	questionTypeCatalog: QuestionTypeOption[];
	subject: string;
	className: string;
}

export interface AssignmentGenerationProgress {
	assignmentId: string;
	progress: number;
	stage: AssignmentStage;
	message: string;
}

export interface QuestionTypeSeedDocument extends QuestionTypeOption {
	createdAt?: string;
	updatedAt?: string;
}
export {};
