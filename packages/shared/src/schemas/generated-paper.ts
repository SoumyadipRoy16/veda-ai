import type { DifficultyLevel } from './assignment';

export interface GeneratedQuestion {
	id: string;
	text: string;
	marks: number;
	difficulty: DifficultyLevel;
}

export interface GeneratedSection {
	title: string;
	instruction: string;
	questions: GeneratedQuestion[];
}

export interface GeneratedPaper {
	title: string;
	subject: string;
	className: string;
	totalMarks: number;
	totalTimeMinutes: number;
	sections: GeneratedSection[];
}
export {};
