import { Router } from 'express';

import {
	handleConfirmAssignment,
	handleCreateAssignment,
	handleDeleteAssignment,
	handleGetAssignment,
	handleGetGeneratedPaper,
	handleGetGeneratedPaperPdf,
	handleListQuestionTypes,
	handleListAssignments,
	handleRegenerateAssignment,
	handleUpdateAssignment,
} from '../controllers/assignments.controller';

export const assignmentsRouter = Router();

assignmentsRouter.get('/question-types', handleListQuestionTypes);
assignmentsRouter.get('/', handleListAssignments);
assignmentsRouter.post('/', handleCreateAssignment);
assignmentsRouter.put('/:assignmentId', handleUpdateAssignment);
assignmentsRouter.delete('/:assignmentId', handleDeleteAssignment);
assignmentsRouter.post('/:assignmentId/confirm', handleConfirmAssignment);
assignmentsRouter.get('/:assignmentId', handleGetAssignment);
assignmentsRouter.get('/:assignmentId/paper', handleGetGeneratedPaper);
assignmentsRouter.get('/:assignmentId/pdf', handleGetGeneratedPaperPdf);
assignmentsRouter.post('/:assignmentId/regenerate', handleRegenerateAssignment);export {};
