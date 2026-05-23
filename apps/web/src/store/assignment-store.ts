import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AssignmentDraft, AssignmentStage, AssignmentSummary, QuestionConfig, QuestionTypeOption, UploadedAssetPayload } from '@shared/schemas/assignment';
import type { GeneratedPaper } from '@shared/schemas/generated-paper';

type WorkflowStep = 'empty' | 'builder' | 'confirmation' | 'generating' | 'result';

type AssignmentWorkspaceState = {
	step: WorkflowStep;
	questionTypeCatalog: QuestionTypeOption[];
	draft: AssignmentDraft;
	assignmentId: string | null;
	editingAssignmentId: string | null;
	generatedPaper: GeneratedPaper | null;
	progress: number;
	progressMessage: string;
	serverStage: AssignmentStage | null;
	setQuestionTypeCatalog: (catalog: QuestionTypeOption[]) => void;
	openBuilder: () => void;
	returnToBuilder: () => void;
	openEmpty: () => void;
	openConfirmation: () => void;
	openGenerating: () => void;
	openResult: () => void;
	setAssignmentId: (assignmentId: string | null) => void;
	loadAssignmentForEditing: (assignment: AssignmentSummary) => void;
	setGeneratedPaper: (paper: GeneratedPaper | null) => void;
	setGenerationProgress: (progress: number, message: string, stage?: AssignmentStage | null) => void;
	updateDraftField: <K extends keyof AssignmentDraft>(key: K, value: AssignmentDraft[K]) => void;
	updateQuestionType: (index: number, patch: Partial<QuestionConfig>) => void;
	addQuestionType: (questionType?: QuestionConfig) => void;
	removeQuestionType: (index: number) => void;
	seedQuestionTypesFromCatalog: () => void;
	setSourceAttachment: (asset: UploadedAssetPayload | null) => void;
	resetFlow: () => void;
};

const initialDraft: AssignmentDraft = {
	title: '',
	subject: '',
	className: '',
	dueDate: '',
	instructions: '',
	sourceFileName: undefined,
	questionTypes: [],
};

function createQuestionTypeRow(item: QuestionTypeOption): QuestionConfig {
	return {
		type: item.type,
		count: 4,
		marksPerQuestion: item.defaultMarksPerQuestion,
		difficulty: item.defaultDifficulty,
	};
}

function defaultQuestionRows(catalog: QuestionTypeOption[]): QuestionConfig[] {
	return catalog.slice(0, 4).map(createQuestionTypeRow);
}

export const useAssignmentStore = create<AssignmentWorkspaceState>()(
	persist(
		(set, get) => ({
			step: 'empty',
			questionTypeCatalog: [],
			draft: initialDraft,
			assignmentId: null,
			editingAssignmentId: null,
			generatedPaper: null,
			progress: 0,
			progressMessage: 'Ready to begin',
			serverStage: null,
			setQuestionTypeCatalog: (catalog) => set({ questionTypeCatalog: catalog }),
			openBuilder: () => set({ step: 'builder', generatedPaper: null, progress: 0, progressMessage: 'Ready to begin', editingAssignmentId: null, assignmentId: null }),
			returnToBuilder: () => set({ step: 'builder', generatedPaper: null, progress: 0, progressMessage: 'Ready to begin' }),
			openEmpty: () => set({ step: 'empty', assignmentId: null, editingAssignmentId: null, generatedPaper: null, progress: 0, progressMessage: 'Ready to begin' }),
			openConfirmation: () => set({ step: 'confirmation' }),
			openGenerating: () => set({ step: 'generating' }),
			openResult: () => set({ step: 'result' }),
			setAssignmentId: (assignmentId) => set({ assignmentId }),
			loadAssignmentForEditing: (assignment) => set({
				step: 'builder',
				assignmentId: assignment.id,
				editingAssignmentId: assignment.id,
				draft: {
					title: assignment.title,
					subject: assignment.subject,
					className: assignment.className,
					dueDate: assignment.dueDate,
					instructions: assignment.instructions,
					sourceFileName: assignment.sourceFileName,
					questionTypes: assignment.questionTypes,
				},
				generatedPaper: null,
				progress: 0,
				progressMessage: 'Ready to begin',
			}),
			setGeneratedPaper: (paper) => set({ generatedPaper: paper }),
			setGenerationProgress: (progress, message, stage = null) => set({ progress, progressMessage: message, serverStage: stage ?? null }),
			updateDraftField: (key, value) => set((state) => ({ draft: { ...state.draft, [key]: value } })),
			updateQuestionType: (index, patch) => set((state) => ({
				draft: {
					...state.draft,
					questionTypes: state.draft.questionTypes.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item)),
				},
			})),
			addQuestionType: (questionType) => set((state) => ({
				draft: {
					...state.draft,
					questionTypes: [...state.draft.questionTypes, questionType ?? { type: '', count: 1, marksPerQuestion: 1, difficulty: 'moderate' }],
				},
			})),
			removeQuestionType: (index) => set((state) => ({
				draft: {
					...state.draft,
					questionTypes: state.draft.questionTypes.filter((_, currentIndex) => currentIndex !== index),
				},
			})),
			seedQuestionTypesFromCatalog: () => {
				const { questionTypeCatalog, draft } = get();
				if (draft.questionTypes.length === 0 && questionTypeCatalog.length > 0) {
					set((state) => ({
						draft: {
							...state.draft,
							questionTypes: defaultQuestionRows(state.questionTypeCatalog),
						},
					}));
				}
			},
			setSourceAttachment: (asset) => set((state) => ({
				draft: {
					...state.draft,
					sourceFileName: asset?.fileName,
					sourceAttachment: asset ?? undefined,
				},
			})),
			resetFlow: () => set({
				step: 'empty',
				assignmentId: null,
				editingAssignmentId: null,
				generatedPaper: null,
				progress: 0,
				progressMessage: 'Ready to begin',
				serverStage: null,
			}),
		}),
		{
			name: 'veda-ai-assignment-workflow',
			partialize: (state) => ({
				step: state.step,
				questionTypeCatalog: state.questionTypeCatalog,
				draft: state.draft,
			}),
		},
	),
);
