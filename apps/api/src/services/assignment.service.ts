import type { AssignmentDraft, QuestionTypeOption } from '@shared/schemas/assignment';

import { AssignmentModel } from '../models/Assignment';
import { GeneratedPaperModel } from '../models/GeneratedPaper';
import { createAssignmentDraft, deleteAssignmentRecord, listAssignments, processAssignmentGeneration, queueAssignmentGeneration, toAssignmentSummary, updateAssignmentDraft } from './generation.service';

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
