'use client';

import { Loader2, Sparkles, TimerReset } from 'lucide-react';

type Props = {
	progress: number;
	message: string;
	variant: 'desktop' | 'mobile';
};

const steps = [
	{ label: 'Draft saved', threshold: 10 },
	{ label: 'Preparing prompt', threshold: 30 },
	{ label: 'Cooking with Gemini', threshold: 55 },
	{ label: 'Formatting output', threshold: 80 },
	{ label: 'Ready', threshold: 100 },
];

export function GenerationProgress({ progress, message, variant }: Props) {
	return (
		<div className={`generation-progress generation-progress-${variant}`}>
			<div className="generation-card">
				<div className="generation-hero">
					<div className="generation-orb">
						<Loader2 className="generation-spinner" size={20} />
					</div>
					<div>
						<h2>{message}</h2>
						<p>We are structuring sections, balancing difficulty, and finalizing the paper.</p>
					</div>
				</div>

				<div className="generation-progress-bar" aria-hidden="true">
					<span style={{ width: `${Math.min(100, progress)}%` }} />
				</div>

				<div className="generation-status-list">
					{steps.map((step) => (
						<div className={`generation-status-item ${progress >= step.threshold ? 'is-complete' : ''}`} key={step.label}>
							<Sparkles size={14} />
							<span>{step.label}</span>
						</div>
					))}
				</div>

				<div className="generation-meta">
					<TimerReset size={14} />
					<span>{progress}% complete</span>
				</div>
			</div>
		</div>
	);
}
