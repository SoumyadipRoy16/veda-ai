import type { AssignmentDraft, AssignmentSummary, QuestionTypeOption, UploadedAssetPayload } from '@shared/schemas/assignment';
import type { GeneratedPaper } from '@shared/schemas/generated-paper';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api';

function buildUrl(path: string) {
	return new URL(path.replace(/^\//, ''), `${apiBaseUrl.replace(/\/$/, '')}/`).toString();
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(buildUrl(path), {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(init?.headers ?? {}),
		},
	});

	if (!response.ok) {
		throw new Error(await response.text());
	}

	return (await response.json()) as T;
}

export async function fetchQuestionTypes() {
	const response = await requestJson<{ questionTypes: QuestionTypeOption[] }>('/assignments/question-types');
	return response.questionTypes;
}

export async function fetchAssignments() {
	const response = await requestJson<{ assignments: AssignmentSummary[] }>('/assignments');
	return response.assignments;
}

export async function createAssignmentDraft(payload: {
	draft: AssignmentDraft;
	subject: string;
	className: string;
}) {
	return requestJson<{ assignment: AssignmentSummary }>('/assignments', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export async function updateAssignmentDraft(assignmentId: string, payload: {
	draft: AssignmentDraft;
	subject: string;
	className: string;
}) {
	return requestJson<{ assignment: AssignmentSummary }>(`/assignments/${assignmentId}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	});
}

export async function deleteAssignment(assignmentId: string) {
	const response = await fetch(buildUrl(`/assignments/${assignmentId}`), { method: 'DELETE' });
	if (!response.ok) {
		throw new Error(await response.text());
	}
}

export async function confirmAssignmentGeneration(assignmentId: string) {
	return requestJson<{ assignment: AssignmentSummary; generatedPaper: GeneratedPaper }>(`/assignments/${assignmentId}/confirm`, {
		method: 'POST',
	});
}

export async function getAssignment(assignmentId: string) {
	return requestJson<{ assignment: AssignmentSummary & { generatedPaperId?: string; progress?: number; progressMessage?: string; stage?: string } }>(`/assignments/${assignmentId}`);
}

export async function getGeneratedPaper(assignmentId: string) {
	return requestJson<{ paper: GeneratedPaper }>(`/assignments/${assignmentId}/paper`);
}

export async function regenerateAssignment(assignmentId: string) {
	return requestJson<{ paper: GeneratedPaper }>(`/assignments/${assignmentId}/regenerate`, {
		method: 'POST',
	});
}

export function getAssignmentPdfUrl(assignmentId: string) {
	return buildUrl(`/assignments/${assignmentId}/pdf`);
}

export function serializeAttachment(asset: UploadedAssetPayload | null) {
	return asset
		? {
			fileName: asset.fileName,
			mimeType: asset.mimeType,
			dataUrl: asset.dataUrl,
			sizeBytes: asset.sizeBytes,
		}
		: null;
}
