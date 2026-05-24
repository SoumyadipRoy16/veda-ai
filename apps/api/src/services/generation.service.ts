import type { AssignmentGenerationRequest, AssignmentStatus, AssignmentSummary, QuestionConfig, QuestionTypeOption, UploadedAssetPayload } from '@shared/schemas/assignment';
import type { GeneratedPaper } from '@shared/schemas/generated-paper';

import { AssignmentModel } from '../models/Assignment';
import { GeneratedPaperModel } from '../models/GeneratedPaper';
import { MediaAssetModel } from '../models/MediaAsset';
import { broadcastSocketEvent } from '../config/socket';
import { createPaperPdfBuffer } from './pdf.service';
import { cacheService } from './cache.service';
import { generatePaperWithGemini } from '../adapters/gemini.adapter';

const PAPER_CACHE_PREFIX = 'generated-paper:';

function ensurePersistableAnswerKey(paper: GeneratedPaper): GeneratedPaper {
	const questions = paper.sections.flatMap((section) => section.questions);
	const questionsById = new Map(questions.map((question) => [question.id, question]));
	const answerKey = paper.answerKey?.length ? paper.answerKey : questions;

	return {
		...paper,
		answerKey: answerKey.map((entry, index) => {
			const question = questionsById.get(entry.id) ?? questions[index];
			return {
				id: entry.id || question?.id || `a-${index + 1}`,
				text: entry.text?.trim() || question?.text || `Question ${index + 1}`,
				marks: entry.marks ?? question?.marks ?? 1,
				difficulty: entry.difficulty ?? question?.difficulty ?? 'moderate',
				answer: entry.answer ?? question?.answer,
			};
		}),
	};
}

export function toAssignmentSummary(document: { _id: string; title: string; subject: string; className: string; dueDate: string; instructions: string; sourceFileName?: string; questionTypes: unknown[]; status: AssignmentStatus; createdAt: Date; progress?: number; generatedPaperId?: string }) : AssignmentSummary {
	return {
		id: document._id,
		title: document.title,
		subject: document.subject,
		className: document.className,
		dueDate: document.dueDate,
		instructions: document.instructions,
		sourceFileName: document.sourceFileName,
		questionTypes: document.questionTypes as AssignmentSummary['questionTypes'],
		status: document.status,
		createdAt: document.createdAt.toISOString(),
		progress: document.progress,
		generatedPaperId: document.generatedPaperId,
	};
}

export async function createAssignmentDraft(input: Omit<AssignmentGenerationRequest, 'questionTypeCatalog'> & { questionTypeCatalog: QuestionTypeOption[] }) {
	let sourceAssetId: string | undefined;
	if (input.draft.sourceAttachment) {
		const uploadedAsset = await persistUploadedAsset(input.draft.sourceAttachment);
		sourceAssetId = uploadedAsset._id.toString();
	}

	const created = await AssignmentModel.create({
		title: input.draft.title,
		subject: input.subject,
		className: input.className,
		dueDate: input.draft.dueDate,
		instructions: input.draft.instructions,
		sourceFileName: input.draft.sourceFileName,
		sourceAssetId,
		questionTypes: input.draft.questionTypes,
		status: 'draft',
		stage: 'builder',
		progress: 0,
		progressMessage: 'Draft saved',
		questionTypeSnapshot: input.questionTypeCatalog,
	});

	return created;
}

export async function updateAssignmentDraft(assignmentId: string, input: Omit<AssignmentGenerationRequest, 'questionTypeCatalog'> & { questionTypeCatalog: QuestionTypeOption[] }) {
	let sourceAssetId: string | undefined;
	if (input.draft.sourceAttachment) {
		const uploadedAsset = await persistUploadedAsset(input.draft.sourceAttachment);
		sourceAssetId = uploadedAsset._id.toString();
	}

	const updated = await AssignmentModel.findByIdAndUpdate(
		assignmentId,
		{
			title: input.draft.title,
			subject: input.subject,
			className: input.className,
			dueDate: input.draft.dueDate,
			instructions: input.draft.instructions,
			sourceFileName: input.draft.sourceFileName,
			sourceAssetId,
			questionTypes: input.draft.questionTypes,
			status: 'draft',
			stage: 'builder',
			progress: 0,
			progressMessage: 'Draft updated',
			questionTypeSnapshot: input.questionTypeCatalog,
		},
		{ new: true },
	);

	if (!updated) {
		throw new Error('Assignment not found');
	}

	return updated;
}

export async function listAssignments() {
	const assignments = await AssignmentModel.find().sort({ createdAt: -1 }).lean();
	return assignments.map((assignment) => toAssignmentSummary({
		...assignment,
		_id: assignment._id.toString(),
		sourceFileName: assignment.sourceFileName ?? undefined,
		generatedPaperId: assignment.generatedPaperId?.toString(),
		createdAt: assignment.createdAt,
	}));
}

export async function deleteAssignmentRecord(assignmentId: string) {
	const assignment = await AssignmentModel.findById(assignmentId);
	if (!assignment) {
		throw new Error('Assignment not found');
	}

	if (assignment.generatedPaperId) {
		cacheService.delete(`${PAPER_CACHE_PREFIX}${assignment.generatedPaperId.toString()}`);
	}

	await GeneratedPaperModel.deleteMany({ assignmentId });

	if (assignment.sourceAssetId) {
		await MediaAssetModel.deleteOne({ _id: assignment.sourceAssetId });
	}

	await AssignmentModel.deleteOne({ _id: assignmentId });
}

async function persistUploadedAsset(asset: UploadedAssetPayload) {
	const payload = asset.dataUrl.includes(',') ? asset.dataUrl.split(',')[1] : asset.dataUrl;
	const buffer = Buffer.from(payload, 'base64');
	return MediaAssetModel.create({
		fileName: asset.fileName,
		mimeType: asset.mimeType,
		sizeBytes: asset.sizeBytes,
		storageType: 'buffer',
		data: buffer,
		checksum: `${asset.fileName}:${asset.sizeBytes}:${buffer.length}`,
		context: 'assignment-upload',
	});
}

export async function queueAssignmentGeneration(assignmentId: string) {
	const assignment = await AssignmentModel.findByIdAndUpdate(
		assignmentId,
		{
			status: 'queued',
			stage: 'confirmation',
			progress: 10,
			progressMessage: 'Queued for generation',
			generationRequestedAt: new Date(),
		},
		{ new: true },
	);

	if (!assignment) {
		throw new Error('Assignment not found');
	}

	broadcastSocketEvent('assignment:queued', { assignmentId: assignment._id.toString() });
	return assignment;
}

export async function processAssignmentGeneration(assignmentId: string) {
	const assignment = await AssignmentModel.findById(assignmentId);
	if (!assignment) {
		throw new Error('Assignment not found');
	}

	try {
		await AssignmentModel.findByIdAndUpdate(assignmentId, { status: 'processing', stage: 'generating', progress: 20, progressMessage: 'Preparing prompt' });
		broadcastSocketEvent('assignment:processing', { assignmentId, progress: 20, progressMessage: 'Preparing prompt' });

		const questionTypeCatalog = Array.isArray(assignment.questionTypeSnapshot) ? (assignment.questionTypeSnapshot as QuestionTypeOption[]) : [];
		const request: AssignmentGenerationRequest = {
			draft: {
				title: assignment.title,
				subject: assignment.subject,
				className: assignment.className,
				dueDate: assignment.dueDate,
				instructions: assignment.instructions,
				sourceFileName: assignment.sourceFileName ?? undefined,
				questionTypes: assignment.questionTypes.map((item) => ({
					type: item.type,
					count: item.count,
					marksPerQuestion: item.marksPerQuestion,
					difficulty: item.difficulty as QuestionConfig['difficulty'],
				})) as QuestionConfig[],
			},
			questionTypeCatalog,
			subject: assignment.subject,
			className: assignment.className,
		};

		await AssignmentModel.findByIdAndUpdate(assignmentId, { progress: 40, progressMessage: 'Generating assignment content' });
		broadcastSocketEvent('assignment:processing', { assignmentId, progress: 40, progressMessage: 'Generating assignment content' });

		const generatedPaper = await generatePaperWithGemini(request);
		const normalizedPaper = ensurePersistableAnswerKey(generatedPaper);

		await AssignmentModel.findByIdAndUpdate(assignmentId, { progress: 75, progressMessage: 'Formatting output' });
		broadcastSocketEvent('assignment:processing', { assignmentId, progress: 75, progressMessage: 'Formatting output' });

		const paperDocument = await GeneratedPaperModel.create({
			assignmentId,
			title: normalizedPaper.title,
			subject: normalizedPaper.subject,
			className: normalizedPaper.className,
			totalMarks: normalizedPaper.totalMarks,
			totalTimeMinutes: normalizedPaper.totalTimeMinutes,
			sections: normalizedPaper.sections,
			answerKey: normalizedPaper.answerKey ?? [],
			notes: normalizedPaper.notes ?? [],
		});

		const pdfBuffer = await createPaperPdfBuffer(normalizedPaper as GeneratedPaper);
		cacheService.set(`${PAPER_CACHE_PREFIX}${paperDocument._id.toString()}`, pdfBuffer, 15 * 60_000);

		await AssignmentModel.findByIdAndUpdate(assignmentId, {
			status: 'completed',
			stage: 'ready',
			progress: 100,
			progressMessage: 'Assignment ready',
			generatedPaperId: paperDocument._id,
		});

		broadcastSocketEvent('assignment:completed', { assignmentId, paperId: paperDocument._id.toString() });
		return paperDocument;
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'Assignment generation failed';
		await AssignmentModel.findByIdAndUpdate(assignmentId, {
			status: 'failed',
			stage: 'error',
			progress: 0,
			progressMessage: reason,
			lastError: reason,
		});
		broadcastSocketEvent('assignment:failed', { assignmentId, reason });
		throw error;
	}
}

export async function getPaperPdfBuffer(paperId: string) {
	return cacheService.get<Buffer>(`${PAPER_CACHE_PREFIX}${paperId}`);
}

export function clearPaperPdfBuffer(paperId: string) {
	cacheService.delete(`${PAPER_CACHE_PREFIX}${paperId}`);
}

export {};
