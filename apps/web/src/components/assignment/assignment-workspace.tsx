'use client';

import { ArrowLeft, Filter, MoreVertical, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { AssignmentSummary, AssignmentStage } from '@shared/schemas/assignment';
import type { WebSocketEventPayloadMap } from '@shared/schemas/websocket';

import { useAssignmentStore } from '../../store/assignment-store';
import { useNotificationStore } from '../../store/notification-store';
import { confirmAssignmentGeneration, createAssignmentDraft, deleteAssignment, fetchAssignments, fetchQuestionTypes, getAssignmentPdfUrl, getGeneratedPaper, regenerateAssignment, updateAssignmentDraft, getAssignment } from '../../lib/api';
import { createWorkflowSocket } from '../../lib/websocket';
import { AssignmentBuilder } from './assignment-builder';
import { AssignmentConfirmation } from './assignment-confirmation';
import { GenerationProgress } from './generation-progress';
import { GeneratedPaperView } from '../output/generated-paper';
import { ConfirmationModal } from '../ui/confirmation-modal';

type Props = {
	variant: 'desktop' | 'mobile';
};

export function AssignmentWorkspace({ variant }: Props) {
	const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
	const [assignmentLoadError, setAssignmentLoadError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; assignment: AssignmentSummary | null; isLoading: boolean }>({
		isOpen: false,
		assignment: null,
		isLoading: false,
	});
	const {
		step,
		questionTypeCatalog,
		generatedPaper,
		progress,
		progressMessage,
		assignmentId,
		editingAssignmentId,
		setQuestionTypeCatalog,
		seedQuestionTypesFromCatalog,
		openBuilder,
		returnToBuilder,
		openEmpty,
		openConfirmation,
		openGenerating,
		openResult,
		setAssignmentId,
		setAssignmentCount,
		setGeneratedPaper,
		setGenerationProgress,
		draft,
	} = useAssignmentStore();
	const { addToast } = useNotificationStore();

	const visibleAssignments = useMemo(() => {
		const normalizedSearch = searchTerm.trim().toLowerCase();
		return assignments.filter((assignment) => (
			assignment.status === 'completed'
			&& (normalizedSearch.length === 0 || assignment.title.toLowerCase().includes(normalizedSearch))
		));
	}, [assignments, searchTerm]);

	async function refreshAssignments() {
		try {
			const records = await fetchAssignments();
			setAssignments(records);
			// Keep sidebar badge in sync with completed assignments count
			setAssignmentCount(records.filter((assignment) => assignment.status === 'completed').length);
			setAssignmentLoadError(null);
		} catch {
			setAssignmentLoadError('Unable to load assignments from MongoDB right now.');
		}
	}

	useEffect(() => {
		let mounted = true;
		void fetchQuestionTypes()
			.then((catalog) => {
				if (!mounted) {
					return;
				}
				setQuestionTypeCatalog(catalog);
				seedQuestionTypesFromCatalog();
			})
			.catch(() => {
				console.error('Unable to load question types from the API.');
			});

		return () => {
			mounted = false;
		};
	}, [seedQuestionTypesFromCatalog, setQuestionTypeCatalog]);

	useEffect(() => {
		void refreshAssignments();
	}, []);

	useEffect(() => {
		if (step === 'empty') {
			void refreshAssignments();
		}
	}, [step]);

	useEffect(() => {
		if (!assignmentId) {
			return;
		}

		const socket = createWorkflowSocket((event) => {
			if (event.data.assignmentId !== assignmentId) {
				return;
			}

			if (event.type === 'assignment:processing') {
				const payload = event.data as WebSocketEventPayloadMap['assignment:processing'];
				// Use server-provided progressMessage when available; otherwise derive a concise message.
				const friendlyMessage = (payload as any).progressMessage ?? (payload.progress >= 80 ? 'Formatting assignment' : 'Generating content');
				setGenerationProgress(payload.progress, friendlyMessage, 'generating');
			}

			if (event.type === 'assignment:completed') {
				setGenerationProgress(100, 'Assignment ready', 'ready');
				void refreshAssignments();
				// Fetch the generated paper from the API and open the result view
				(async () => {
					try {
						const resp = await getGeneratedPaper(assignmentId);
						setGeneratedPaper(resp.paper);
						openResult();
					} catch (err) {
						console.error('Unable to fetch generated paper after completion event', err);
						openResult();
					}
				})();
			}
		});

		return () => socket.close();
	}, [assignmentId, openResult, setGenerationProgress]);

	useEffect(() => {
		// Listen for global assignment updates (dispatched by top-level socket) and refresh list
		const handler = (event: Event) => {
			void refreshAssignments();
		};

		window.addEventListener('assignment:updated', handler as EventListener);
		return () => window.removeEventListener('assignment:updated', handler as EventListener);
	}, []);

	async function handleGenerate() {
		if (!draft.title.trim() || !draft.subject.trim() || !draft.className.trim() || !draft.dueDate.trim() || !draft.instructions.trim() || draft.questionTypes.length === 0) {
			addToast('Fill in the assignment details and add at least one question type before creating the assignment.', 'warning');
			return;
		}

		openGenerating();
		setGenerationProgress(18, 'Preparing your prompt', 'confirmation');
		try {
			const saved = editingAssignmentId
				? await updateAssignmentDraft(editingAssignmentId, { draft, subject: draft.subject, className: draft.className })
				: await createAssignmentDraft({ draft, subject: draft.subject, className: draft.className });
			setAssignmentId(saved.assignment.id);
			void refreshAssignments();
			setGenerationProgress(35, 'Cooking the assignment', 'generating');
			const response = await confirmAssignmentGeneration(saved.assignment.id);
			// If the API returned a generated paper (synchronous processing), show it immediately.
			if (response.generatedPaper) {
				setGeneratedPaper(response.generatedPaper);
				void refreshAssignments();
				setGenerationProgress(100, 'Assignment ready', 'ready');
				openResult();
			} else {
				// Queued for background processing — keep showing the generating view and wait for websocket events.
				addToast('Assignment queued for background generation. Waiting for worker to finish...', 'info');
				// Start a polling fallback to update progress in case websocket messages are missed.
				let stopped = false;
				const poll = async () => {
					if (stopped) return;
					try {
						const latest = await getAssignment(saved.assignment.id);
						const assign = latest.assignment;
						if (assign.progress != null) {
							setGenerationProgress(assign.progress, (assign.progressMessage as string) ?? 'Processing', (assign.stage as AssignmentStage) ?? 'generating');
						}
						if (assign.status === 'completed') {
							stopped = true;
							if (assign.generatedPaperId) {
								try {
									const resp = await getGeneratedPaper(saved.assignment.id);
									setGeneratedPaper(resp.paper);
								} catch {}
							}
							setGenerationProgress(100, 'Assignment ready', 'ready');
							openResult();
							return;
						}
						if (assign.status === 'failed') {
							stopped = true;
							addToast('Assignment generation failed. See assignment list for details.', 'error');
							openBuilder();
							return;
						}
					} catch (err) {
						// ignore transient errors and retry
					}
					setTimeout(poll, 2000);
				};
				void poll();
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to create assignment';
			addToast(message, 'error');
			setAssignmentId(null);
			openBuilder();
		}
	}

	async function handleRegenerate() {
		if (!assignmentId) {
			return;
		}
		openGenerating();
		setGenerationProgress(20, 'Reheating the prompt', 'generating');
		try {
			const response = await regenerateAssignment(assignmentId);
			setGeneratedPaper(response.paper);
			void refreshAssignments();
			setGenerationProgress(100, 'Assignment ready', 'ready');
			openResult();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to regenerate assignment';
			addToast(message, 'error');
			openResult();
		}
	}

	async function handleDelete(assignment: AssignmentSummary) {
		setActiveMenuId(null);
		setDeleteConfirmation({ isOpen: true, assignment, isLoading: false });
	}

	async function confirmDelete() {
		if (!deleteConfirmation.assignment) return;
		
		setDeleteConfirmation((prev) => ({ ...prev, isLoading: true }));
		try {
			await deleteAssignment(deleteConfirmation.assignment.id);
			if (deleteConfirmation.assignment.id === assignmentId) {
				openEmpty();
			}
			await refreshAssignments();
			addToast(`"${deleteConfirmation.assignment.title}" deleted successfully`, 'success');
			setDeleteConfirmation({ isOpen: false, assignment: null, isLoading: false });
		} catch (error) {
			addToast(error instanceof Error ? error.message : 'Unable to delete assignment', 'error');
			setDeleteConfirmation((prev) => ({ ...prev, isLoading: false }));
		}
	}

	async function handleViewAssignment(assignment: AssignmentSummary) {
		setActiveMenuId(null);
		try {
			const response = await getGeneratedPaper(assignment.id);
			setAssignmentId(assignment.id);
			setGeneratedPaper(response.paper);
			openResult();
		} catch {
			addToast('The formatted assignment is not ready to view yet.', 'info');
		}
	}

	function formatDate(value: string) {
		const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
		if (dateOnlyMatch) {
			return `${dateOnlyMatch[3]}-${dateOnlyMatch[2]}-${dateOnlyMatch[1]}`;
		}

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		}).format(date).replaceAll('/', '-');
	}

	return (
		<>
			{step === 'empty' ? (
				assignments.length > 0 ? (
					<div className={`assignments-dashboard-shell assignments-dashboard-shell-${variant}`} onClick={() => setActiveMenuId(null)}>
						{variant === 'mobile' ? (
							<div className="assignments-mobile-heading">
								<button type="button" onClick={openEmpty} aria-label="Back to assignments">
									<ArrowLeft size={18} />
								</button>
								<h1>Assignments</h1>
							</div>
						) : null}
						<div className="assignments-dashboard-topline">
							<div className="assignments-dashboard-title">
								<div className="status-dot" />
								<div>
									<h2>Assignments</h2>
									<p>Manage and create assignments for your classes.</p>
								</div>
							</div>
						</div>

						<div className="assignments-toolbar">
							<button type="button" className="assignments-filter-button">
								<Filter size={14} />
								<span>Filter By</span>
							</button>
							<label className="assignments-search">
								<Search size={16} />
								<input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search Assignment" aria-label="Search assignment" />
							</label>
						</div>

						{assignmentLoadError ? <p className="assignments-error">{assignmentLoadError}</p> : null}

						<div className={`assignments-card-grid assignments-card-grid-${variant}`}>
							{visibleAssignments.map((assignment) => (
								<article className="assignment-card-shell" key={assignment.id}>
									<div className="assignment-card-head">
										<h3>{assignment.title}</h3>
										<button
											type="button"
											className="assignment-card-menu"
											aria-label={`Options for ${assignment.title}`}
											aria-expanded={activeMenuId === assignment.id}
											onClick={(event) => {
												event.stopPropagation();
												setActiveMenuId((current) => (current === assignment.id ? null : assignment.id));
											}}
										>
											<MoreVertical size={16} />
										</button>
										{activeMenuId === assignment.id ? (
											<div className="assignment-card-actions" onClick={(event) => event.stopPropagation()}>
												<button type="button" onClick={() => void handleViewAssignment(assignment)}>View Assignment</button>
												<button type="button" className="assignment-action-delete" onClick={() => void handleDelete(assignment)}>Delete</button>
											</div>
										) : null}
									</div>
									<div className="assignment-card-meta-row">
										<span><strong>Assigned on :</strong> {formatDate(assignment.createdAt)}</span>
										<span><strong>Due :</strong> {formatDate(assignment.dueDate)}</span>
									</div>
								</article>
							))}
						</div>

						{visibleAssignments.length === 0 ? <p className="assignments-empty-list">No completed assignments found.</p> : null}

						{variant === 'desktop' ? (
							<button type="button" className="assignments-create-floating" onClick={openBuilder}>
								<Plus size={16} />
								<span>Create Assignment</span>
							</button>
						) : null}
					</div>
				) : (
					<div className={`workspace-empty workspace-empty-${variant}`}>
						<div className="workspace-empty-illustration-wrap">
							<img className="workspace-empty-illustration" src="/no-assignments.png" alt="No assignments yet" />
						</div>
						<h2>No assignments yet</h2>
						<p>Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading.</p>
						<button type="button" className="workspace-empty-button" onClick={openBuilder}>
							<Plus size={16} />
							<span>Create Your First Assignment</span>
						</button>
					</div>
				)
			) : null}

			{step === 'builder' ? <AssignmentBuilder variant={variant} onPrevious={openEmpty} onOpenConfirmation={openConfirmation} /> : null}
			{step === 'confirmation' ? <AssignmentConfirmation onBack={returnToBuilder} onGenerate={handleGenerate} /> : null}
			{step === 'generating' ? <GenerationProgress variant={variant} progress={progress} message={progressMessage} /> : null}
			{step === 'result' && generatedPaper ? (
				<GeneratedPaperView variant={variant} paper={generatedPaper} onRegenerate={handleRegenerate} onDownload={() => window.open(getAssignmentPdfUrl(assignmentId ?? ''), '_blank', 'noopener,noreferrer')} />
			) : null}

		<ConfirmationModal
			isOpen={deleteConfirmation.isOpen}
			title="Delete Assignment"
			message={deleteConfirmation.assignment ? `Are you sure you want to delete "${deleteConfirmation.assignment.title}"? This action cannot be undone.` : ''}
			confirmText="Delete"
			cancelText="Cancel"
			isDangerous
			onConfirm={confirmDelete}
			onCancel={() => setDeleteConfirmation({ isOpen: false, assignment: null, isLoading: false })}
			isLoading={deleteConfirmation.isLoading}
		/>
		</>
	);
}
