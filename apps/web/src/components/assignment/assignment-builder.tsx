'use client';

import { ArrowLeft, ArrowRight, CalendarPlus2, CloudUpload, Mic, Plus } from 'lucide-react';
import { useMemo } from 'react';

import type { UploadedAssetPayload } from '@shared/schemas/assignment';
import { calculateTotals } from '@shared/workflow/assignment-generation';
import { sanitizeFilename } from '@shared/utils/sanitize';

import { useAssignmentStore } from '../../store/assignment-store';
import { useNotificationStore } from '../../store/notification-store';
import { useSanitization } from '../../lib/useSanitization';
import { AssignmentQuestionRow } from './assignment-question-row';

type Props = {
	variant: 'desktop' | 'mobile';
	onPrevious: () => void;
	onOpenConfirmation: () => void;
};

function toAssetPayload(file: File, dataUrl: string): UploadedAssetPayload {
	return {
		fileName: sanitizeFilename(file.name),
		mimeType: file.type || 'application/octet-stream',
		dataUrl,
		sizeBytes: file.size,
	};
}

async function readFileAsDataUrl(file: File) {
	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error('Unable to read file'));
		reader.readAsDataURL(file);
	});
}

export function AssignmentBuilder({ variant, onPrevious, onOpenConfirmation }: Props) {
	const { draft, questionTypeCatalog, updateDraftField, updateQuestionType, addQuestionType, removeQuestionType, setSourceAttachment } = useAssignmentStore();
	const { addToast } = useNotificationStore();
	const { sanitizeAndValidateFile } = useSanitization();
	const totals = useMemo(() => calculateTotals(draft), [draft]);

	async function handleFileChange(file: File | null) {
		if (!file) {
			setSourceAttachment(null);
			return;
		}

		// Validate file
		const validation = sanitizeAndValidateFile(file);
		if (!validation.valid) {
			addToast(validation.error || 'Invalid file', 'error');
			return;
		}

		const dataUrl = await readFileAsDataUrl(file);
		setSourceAttachment(toAssetPayload(file, dataUrl));
		addToast(`File "${validation.filename}" uploaded successfully`, 'success');
	}

	return (
		<div className={`assignment-builder assignment-builder-${variant}`}>
			<div className="builder-header">
				<span className="status-dot" />
				<div>
					<h1>Create Assignment</h1>
					<p>Set up a new assignment for your students.</p>
				</div>
			</div>

			<div className="builder-progress-line" aria-hidden="true">
				<span />
			</div>

			<section className="builder-card">
				<div className="builder-card-header">
					<h2>Assignment Details</h2>
					<p>Basic information about your assignment</p>
				</div>

				<div className="builder-meta-grid">
					<label className="builder-field">
						<span>Assignment Title</span>
						<input value={draft.title} onChange={(event) => updateDraftField('title', event.target.value)} placeholder="Enter assignment title" />
					</label>
					<label className="builder-field">
						<span>Subject</span>
						<input value={draft.subject} onChange={(event) => updateDraftField('subject', event.target.value)} placeholder="Enter subject" />
					</label>
					<label className="builder-field">
						<span>Class</span>
						<input value={draft.className} onChange={(event) => updateDraftField('className', event.target.value)} placeholder="Enter class" />
					</label>
				</div>

				<div className="upload-card">
					<label className="upload-dropzone">
						<input
							type="file"
							accept="image/*,.pdf,.doc,.docx"
							onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
						/>
						<CloudUpload className="upload-icon" size={32} />
						<strong>Choose a file or drag & drop it here</strong>
						<span>JPEG, PNG, upto 10MB</span>
						<span className="upload-browse">Browse Files</span>
					</label>
					<p className="upload-note">Upload images of your preferred document/image</p>
				
				{draft.sourceAttachment ? (
					<div className="upload-preview">
						<div className="preview-thumbnail">
							<img src={draft.sourceAttachment.dataUrl} alt="Uploaded reference" className="preview-image" />
						</div>
						<div className="preview-details">
							<p className="preview-filename">✓ {draft.sourceAttachment.fileName}</p>
							<p className="preview-size">({(draft.sourceAttachment.sizeBytes / 1024).toFixed(1)} KB)</p>
							<button
								type="button"
								className="preview-remove"
								onClick={() => setSourceAttachment(null)}
								aria-label="Remove uploaded file"
							>
								Remove
							</button>
						</div>
					</div>
				) : null}
			</div>

			<label className="builder-field due-date-field">
				<span>Due Date</span>
				<div className="date-input-wrap">
					<input type="date" value={draft.dueDate} onChange={(event) => updateDraftField('dueDate', event.target.value)} />
					<CalendarPlus2 size={22} />
				</div>
			</label>

			<div className="question-table-header" aria-hidden="true">
				<span>Question Type</span>
				<span>No. of Questions</span>
				<span>Marks</span>
			</div>

			<div className="question-list">
				{draft.questionTypes.map((row, index) => (
					<AssignmentQuestionRow
						key={`${row.type}-${index}`}
						index={index}
						row={row}
						questionTypes={questionTypeCatalog}
						onTypeChange={(value) => {
							const selected = questionTypeCatalog.find((item) => item.type === value);
							updateQuestionType(index, {
								type: value,
								marksPerQuestion: selected?.defaultMarksPerQuestion ?? row.marksPerQuestion,
								difficulty: selected?.defaultDifficulty ?? row.difficulty,
							});
						}}
						onCountChange={(value) => updateQuestionType(index, { count: value })}
						onMarksChange={(value) => updateQuestionType(index, { marksPerQuestion: value })}
						onRemove={() => removeQuestionType(index)}
					/>
				))}
			</div>

			<button className="add-question-button" type="button" onClick={() => addQuestionType(questionTypeCatalog[0] ? {
				type: questionTypeCatalog[0].type,
				count: 1,
				marksPerQuestion: questionTypeCatalog[0].defaultMarksPerQuestion,
				difficulty: questionTypeCatalog[0].defaultDifficulty,
			} : undefined)}>
				<span className="add-question-icon"><Plus size={20} /></span>
				<span>Add Question Type</span>
			</button>

			<div className="totals-panel">
				<p><span>Total Questions :</span><strong>{totals.totalQuestions}</strong></p>
				<p><span>Total Marks :</span><strong>{totals.totalMarks}</strong></p>
			</div>

			<label className="builder-field additional-info-field">
				<span>Additional Information (For better output)</span>
				<div className="textarea-wrap">
					<textarea value={draft.instructions} onChange={(event) => updateDraftField('instructions', event.target.value)} placeholder="e.g Generate a question paper for 3 hour exam duration..." />
					<button type="button" className="voice-button" aria-label="Voice input display only">
						<Mic size={14} />
					</button>
				</div>
			</label>
		</section>

			<div className="builder-actions">
				<button type="button" className="builder-secondary-button" onClick={onPrevious}>
					<ArrowLeft size={16} />
					<span>Previous</span>
				</button>
				<button type="button" className="builder-primary-button" onClick={onOpenConfirmation}>
					<span>Next</span>
					<ArrowRight size={16} />
				</button>
			</div>
		</div>
	);
}
