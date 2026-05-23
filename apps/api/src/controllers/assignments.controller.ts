import type { Request, Response } from 'express';

import { validateAssignmentPayload, isValidObjectId } from '../validators/assignment.validator';
import { listQuestionTypes } from '../services/question-type.service';
import { confirmAssignmentGeneration, createAssignment, deleteAssignment, getAssignmentById, getGeneratedPaperByAssignmentId, listAssignments, regenerateAssignment, updateAssignment } from '../services/assignment.service';
import { getPaperPdfBuffer } from '../services/generation.service';
import { createPaperPdfBuffer } from '../services/pdf.service';

export async function handleListQuestionTypes(_: Request, response: Response) {
	const questionTypes = await listQuestionTypes();
	response.json({ questionTypes });
}

export async function handleListAssignments(_: Request, response: Response) {
	const assignments = await listAssignments();
	response.json({ assignments });
}

export async function handleCreateAssignment(request: Request, response: Response) {
	try {
		// Validate input
		const validation = validateAssignmentPayload(request.body);
		if (!validation.valid) {
			response.status(400).json({ message: validation.error });
			return;
		}

		const questionTypeCatalog = await listQuestionTypes();
		const created = await createAssignment({
			draft: validation.sanitized!.draft,
			questionTypeCatalog,
			subject: validation.sanitized!.subject,
			className: validation.sanitized!.className,
		});
		response.status(201).json({ assignment: created });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to create assignment';
		response.status(500).json({ message });
	}
}

export async function handleUpdateAssignment(request: Request, response: Response) {
	try {
		const assignmentId = Array.isArray(request.params.assignmentId) ? request.params.assignmentId[0] : request.params.assignmentId;
		// Validate ObjectId
		if (!isValidObjectId(assignmentId)) {
			response.status(400).json({ message: 'Invalid assignment ID' });
			return;
		}

		// Validate input
		const validation = validateAssignmentPayload(request.body);
		if (!validation.valid) {
			response.status(400).json({ message: validation.error });
			return;
		}

		const questionTypeCatalog = await listQuestionTypes();
		const updated = await updateAssignment(assignmentId, {
			draft: validation.sanitized!.draft,
			questionTypeCatalog,
			subject: validation.sanitized!.subject,
			className: validation.sanitized!.className,
		});
		response.json({ assignment: updated });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to update assignment';
		response.status(500).json({ message });
	}
}

export async function handleDeleteAssignment(request: Request, response: Response) {
	try {
		const assignmentId = Array.isArray(request.params.assignmentId) ? request.params.assignmentId[0] : request.params.assignmentId;
		// Validate ObjectId
		if (!isValidObjectId(assignmentId)) {
			response.status(400).json({ message: 'Invalid assignment ID' });
			return;
		}

		await deleteAssignment(assignmentId);
		response.status(204).send();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to delete assignment';
		response.status(message === 'Assignment not found' ? 404 : 500).json({ message });
	}
}

export async function handleConfirmAssignment(request: Request, response: Response) {
	try {
		const assignmentId = Array.isArray(request.params.assignmentId) ? request.params.assignmentId[0] : request.params.assignmentId;
		// Validate ObjectId
		if (!isValidObjectId(assignmentId)) {
			response.status(400).json({ message: 'Invalid assignment ID' });
			return;
		}

		const { assignment, generatedPaper } = await confirmAssignmentGeneration(assignmentId);
		response.json({ assignment, generatedPaper });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Assignment generation failed';
		response.status(503).json({ message });
	}
}

export async function handleGetAssignment(request: Request, response: Response) {
	try {
		const assignmentId = Array.isArray(request.params.assignmentId) ? request.params.assignmentId[0] : request.params.assignmentId;
		// Validate ObjectId
		if (!isValidObjectId(assignmentId)) {
			response.status(400).json({ message: 'Invalid assignment ID' });
			return;
		}

		const assignment = await getAssignmentById(assignmentId);
		if (!assignment) {
			response.status(404).json({ message: 'Assignment not found' });
			return;
		}

		response.json({ assignment });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to get assignment';
		response.status(500).json({ message });
	}
}

export async function handleGetGeneratedPaper(request: Request, response: Response) {
	try {
		const assignmentId = Array.isArray(request.params.assignmentId) ? request.params.assignmentId[0] : request.params.assignmentId;
		// Validate ObjectId
		if (!isValidObjectId(assignmentId)) {
			response.status(400).json({ message: 'Invalid assignment ID' });
			return;
		}

		const paper = await getGeneratedPaperByAssignmentId(assignmentId);
		if (!paper) {
			response.status(404).json({ message: 'Generated paper not found' });
			return;
		}

		response.json({ paper });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to get paper';
		response.status(500).json({ message });
	}
}

export async function handleGetGeneratedPaperPdf(request: Request, response: Response) {
	try {
		const assignmentId = Array.isArray(request.params.assignmentId) ? request.params.assignmentId[0] : request.params.assignmentId;
		// Validate ObjectId
		if (!isValidObjectId(assignmentId)) {
			response.status(400).json({ message: 'Invalid assignment ID' });
			return;
		}

		const paper = await getGeneratedPaperByAssignmentId(assignmentId);
		if (!paper) {
			response.status(404).json({ message: 'Generated paper not found' });
			return;
		}

		const buffer = (await getPaperPdfBuffer(paper._id.toString())) ?? (await createPaperPdfBuffer(paper as never));
		response.setHeader('Content-Type', 'application/pdf');
		response.setHeader('Content-Disposition', `attachment; filename="${paper.title.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
		response.send(buffer);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to generate PDF';
		response.status(500).json({ message });
	}
}

export async function handleRegenerateAssignment(request: Request, response: Response) {
	try {
		const assignmentId = Array.isArray(request.params.assignmentId) ? request.params.assignmentId[0] : request.params.assignmentId;
		// Validate ObjectId
		if (!isValidObjectId(assignmentId)) {
			response.status(400).json({ message: 'Invalid assignment ID' });
			return;
		}

		const paper = await regenerateAssignment(assignmentId);
		response.json({ paper });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Assignment regeneration failed';
		response.status(503).json({ message });
	}
}

export {};
