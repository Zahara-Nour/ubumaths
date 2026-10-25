/**
 * Vitrine : la série de `/demo/questions`
 * =======================================
 *
 * Quatre questions de collège écrites ici (pas de base : la page vit sans compte),
 * et les intervalles de la première révision d'une carte neuve, calculés par le
 * vrai FSRS (chantier demo-debug, PR 6g).
 */
import { createDefaultFSRS } from '$lib/srs/fsrs';
import type { QuestionInstance } from '$lib/questions/types';
import type { GradeCode } from '$lib/types/grades';
import type { ClassroomItem } from '$lib/types/test';
import { resolvedMarkdown } from '$lib/ubumark';

// Types
interface DemoQuestion {
	id: string;
	statement: string;
	answer: string;
	correction: string;
	grade: GradeCode;
	theme: string;
	domain: string;
}

// Constantes
// Durée de chaque question dans la forme « En classe » (s)
export const CLASSROOM_DELAY_SECONDS = 10;
// Temps global de la course aux nombres (s)
export const COURSE_TIME_LIMIT_SECONDS = 120;

const DEMO_QUESTIONS: DemoQuestion[] = [
	{
		id: 'demo-questions-produit',
		statement: 'Calcule : $7 \\times 8 = \\placeholder[0]{}$',
		answer: '56',
		correction: '$7 \\times 8 = 56$.',
		grade: '6',
		theme: 'Nombres et calculs',
		domain: 'Calcul mental'
	},
	{
		id: 'demo-questions-pourcentage',
		statement: 'Calcule $25\\,\\%$ de $80$ : $\\placeholder[0]{}$',
		answer: '20',
		correction: '$25\\,\\%$, c’est le quart : $80 \\div 4 = 20$.',
		grade: '5',
		theme: 'Proportionnalité',
		domain: 'Pourcentages'
	},
	{
		id: 'demo-questions-fraction',
		statement: 'Calcule $\\dfrac{3}{4}$ de $12$ : $\\placeholder[0]{}$',
		answer: '9',
		correction: '$12 \\div 4 = 3$, puis $3 \\times 3 = 9$.',
		grade: '6',
		theme: 'Nombres et calculs',
		domain: 'Fractions'
	},
	{
		id: 'demo-questions-equation',
		statement: 'Résous $2x + 3 = 11$ : $x = \\placeholder[0]{}$',
		answer: '4',
		correction: '$2x = 11 - 3 = 8$, donc $x = 8 \\div 2 = 4$.',
		grade: '4',
		theme: 'Algèbre',
		domain: 'Équations'
	}
];

// Functions
function toInstance(question: DemoQuestion): QuestionInstance {
	return {
		templateId: question.id,
		statement: resolvedMarkdown(question.statement),
		blanks: [
			{ expectedAnswer: question.answer, expectedAnswerLatex: question.answer, type: 'math' }
		],
		correction: { steps: [resolvedMarkdown(question.correction)] },
		grades: [question.grade],
		theme: question.theme,
		domain: question.domain,
		level: 1,
		generatedAt: '2026-10-25T00:00:00.000Z'
	};
}

/** Les 4 questions, neuves à chaque appel (une forme ne voit pas les réponses d'une autre) */
export function demoInstances(): QuestionInstance[] {
	return DEMO_QUESTIONS.map(toInstance);
}

/** Les 4 questions au format des formes « En classe » et « Entraînement » */
export function demoClassroomItems(): ClassroomItem[] {
	return demoInstances().map((instance) => ({
		instance,
		delaySeconds: CLASSROOM_DELAY_SECONDS,
		categoryKey: instance.templateId
	}));
}

/** Jours avant la prochaine révision d'une carte neuve, pour Encore, Difficile, Bien, Facile */
export function firstReviewIntervals(): [number, number, number, number] {
	const fsrs = createDefaultFSRS();
	const card = fsrs.initCard('demo', 'template', 'demo');
	const [again, hard, good, easy] = ([1, 2, 3, 4] as const).map((grade) =>
		fsrs.calculateInterval(fsrs.reviewCard(card, grade).stability)
	);
	return [again, hard, good, easy];
}
