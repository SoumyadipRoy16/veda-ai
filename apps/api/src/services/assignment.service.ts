import type { AssignmentDraft, QuestionTypeOption } from '@shared/schemas/assignment';

import { AssignmentModel } from '../models/Assignment';
import { GeneratedPaperModel } from '../models/GeneratedPaper';
import { createAssignmentDraft, deleteAssignmentRecord, listAssignments, processAssignmentGeneration, queueAssignmentGeneration, toAssignmentSummary, updateAssignmentDraft } from './generation.service';
import { enqueueAssignmentGeneration } from '../queues/generation.queue';
import { env } from '../config/env';

export async function getQuestionTypes(questionTypes: QuestionTypeOption[]) {
	return questionTypes;
}

export async function createAssignment(input: { draft: AssignmentDraft; questionTypeCatalog: QuestionTypeOption[]; subject: string; className: string }) {
	const created = await createAssignmentDraft(input);
	return toAssignmentSummary(created as never);
}

export async function updateAssignment(assignmentId: string, input: { draft: AssignmentDraft; questionTypeCatalog: QuestionTypeOption[]; subject: string; className: string }) {
	const updated = await updateAssignmentDraft(assignmentId, input);
	return toAssignmentSummary(updated as never);
}

export async function deleteAssignment(assignmentId: string) {
	await deleteAssignmentRecord(assignmentId);
}

export { listAssignments };

export async function confirmAssignmentGeneration(assignmentId: string) {
	const assignment = await queueAssignmentGeneration(assignmentId);
	// If Redis is configured, try to enqueue a background job so a worker can pick it up.
	if (env.REDIS_URL) {
		try {
			await enqueueAssignmentGeneration(assignment._id.toString());
			console.log('Enqueued assignment generation job for', assignment._id.toString());
		} catch (err) {
			console.error('Failed to enqueue assignment generation job', err);
		}
	}
	// If a standalone worker is enabled and Redis is configured, do not process synchronously here.
	if (env.REDIS_URL && env.WORKER_ENABLED) {
		return {
			assignment: toAssignmentSummary(assignment as never),
			generatedPaper: null,
		};
	}
	// Fallback / default: process synchronously (preserves existing behaviour when worker not enabled)
	const generatedPaper = await processAssignmentGeneration(assignmentId);
	return {
		assignment: toAssignmentSummary(assignment as never),
		generatedPaper,
	};
}

export async function getAssignmentById(assignmentId: string) {
	const assignment = await AssignmentModel.findById(assignmentId).lean();
	if (!assignment) {
		return null;
	}

	return {
		id: assignment._id.toString(),
		title: assignment.title,
		subject: assignment.subject,
		className: assignment.className,
		dueDate: assignment.dueDate,
		instructions: assignment.instructions,
		sourceFileName: assignment.sourceFileName,
		questionTypes: assignment.questionTypes,
		status: assignment.status,
		stage: assignment.stage,
		progress: assignment.progress,
		progressMessage: assignment.progressMessage,
		generatedPaperId: assignment.generatedPaperId?.toString(),
	};
}

export async function getGeneratedPaperByAssignmentId(assignmentId: string) {
	return GeneratedPaperModel.findOne({ assignmentId }).lean();
}

export async function regenerateAssignment(assignmentId: string) {
	await AssignmentModel.findByIdAndUpdate(assignmentId, {
		status: 'queued',
		stage: 'confirmation',
		progress: 10,
		progressMessage: 'Regeneration queued',
	});
	return processAssignmentGeneration(assignmentId);
}export {};
