/**
 * Le plan du chapitre vu par l'élève
 *
 * Deux règles portées par ce module valent un test, parce qu'elles ne se
 * voient pas à l'écran quand elles sont fausses :
 *
 * - une section SANS contenu ne doit pas être rendue — sinon le titre d'une
 *   section (« Contrôle vendredi ») fuite alors que son contenu attend sa
 *   publication ;
 * - les questions de quiz d'une section forment UN quiz, pas cinq blocs.
 */
import { describe, it, expect } from 'vitest';
import {
	buildChapterPlan,
	UNASSIGNED_SECTION_ID,
	type BuildPlanInput,
	type StudentWorksheet
} from '../chapter-plan';

/**
 * Une fiche réduite aux deux champs dont le RANGEMENT dépend.
 *
 * `buildChapterPlan` ne fait que transporter l'objet jusqu'au composant : le
 * reste du type (titre, classe, échéance) ne joue aucun rôle ici, et le fixer
 * en entier rendrait ces cas illisibles pour rien.
 */
function fiche(worksheetId: string, assignmentId: string): StudentWorksheet {
	return { worksheet_id: worksheetId, assignment_id: assignmentId } as StudentWorksheet;
}

function section(id: string, title: string, displayOrder: number) {
	return {
		id,
		chapterId: 'chap',
		title,
		displayOrder,
		createdAt: '2026-09-14T00:00:00Z',
		updatedAt: '2026-09-14T00:00:00Z'
	};
}

function document(id: string, sectionId: string | null, sectionOrder: number) {
	return {
		id,
		chapterId: 'chap',
		title: `Document ${id}`,
		description: null,
		sourceType: 'google_drive' as const,
		storagePath: null,
		fileName: null,
		mimeType: null,
		fileSize: null,
		googleFileId: null,
		googleDriveUrl: 'https://example.invalid/doc',
		thumbnailUrl: null,
		displayOrder: 0,
		sectionId,
		sectionOrder,
		createdAt: '2026-09-14T00:00:00Z',
		updatedAt: '2026-09-14T00:00:00Z',
		publishedAt: '2026-09-14T00:00:00Z'
	};
}

function question(id: string, sectionId: string | null, sectionOrder: number) {
	return {
		id,
		chapterId: 'chap',
		questionTemplateId: `modele-${id}`,
		pointsOverride: null,
		displayOrder: 0,
		sectionId,
		sectionOrder,
		createdAt: '2026-09-14T00:00:00Z',
		publishedAt: '2026-09-14T00:00:00Z',
		bestResult: null,
		attemptsCount: 0
	};
}

function entree(partiel: Partial<BuildPlanInput> = {}): BuildPlanInput {
	return {
		sections: [],
		documents: [],
		exercises: [],
		checklistItems: [],
		quizQuestions: [],
		worksheets: [],
		exerciseTitles: {},
		worksheetPlacements: {},
		...partiel
	};
}

describe('buildChapterPlan', () => {
	it('rend les sections dans l’ordre du professeur', () => {
		const plan = buildChapterPlan(
			entree({
				sections: [section('b', 'Le cours', 2), section('a', 'Préparation', 1)],
				documents: [document('d1', 'a', 0), document('d2', 'b', 0)]
			})
		);

		expect(plan.map((s) => s.title)).toEqual(['Préparation', 'Le cours']);
	});

	/**
	 * LA règle de confidentialité du module. « Bilan » affiché vide en tête de
	 * chapitre annonce un contenu qui n'existe pas ; pire, un titre comme
	 * « Contrôle vendredi » est visible dès que le chapitre l'est, alors que
	 * son contenu attend `published_at`.
	 */
	it('ne rend PAS une section sans contenu', () => {
		const plan = buildChapterPlan(
			entree({
				sections: [section('a', 'Préparation', 1), section('vide', 'Bilan', 2)],
				documents: [document('d1', 'a', 0)]
			})
		);

		expect(plan.map((s) => s.title)).toEqual(['Préparation']);
	});

	it('mélange les types dans une section, dans l’ordre de rangement', () => {
		const plan = buildChapterPlan(
			entree({
				sections: [section('a', 'Le cours', 1)],
				documents: [document('d1', 'a', 1)],
				exercises: [
					{
						id: 'lien-ex',
						chapterId: 'chap',
						exerciseId: 'ex1',
						displayOrder: 0,
						sectionId: 'a',
						sectionOrder: 0,
						createdAt: '2026-09-14T00:00:00Z',
						publishedAt: '2026-09-14T00:00:00Z'
					}
				],
				exerciseTitles: { ex1: { title: 'Discriminant' } }
			})
		);

		expect(plan[0].items.map((i) => i.kind)).toEqual(['exercise', 'document']);
	});

	it('range les fiches d’après leur placement', () => {
		const plan = buildChapterPlan(
			entree({
				sections: [section('a', 'Les exercices', 1)],
				worksheets: [fiche('w1', 'aff1')],
				worksheetPlacements: { w1: { sectionId: 'a', sectionOrder: 0 } }
			})
		);

		expect(plan[0].items).toEqual([{ kind: 'worksheet', worksheet: fiche('w1', 'aff1') }]);
	});

	// Une fiche distribuée mais jamais rangée ne doit pas disparaître : elle
	// tombe en « Non classé ».
	it('met une fiche sans placement en « Non classé »', () => {
		const plan = buildChapterPlan(
			entree({
				sections: [section('a', 'Le cours', 1)],
				worksheets: [fiche('w1', 'aff1')]
			})
		);

		expect(plan).toHaveLength(1);
		expect(plan[0].id).toBe(UNASSIGNED_SECTION_ID);
		expect(plan[0].title).toBeNull();
	});

	it('regroupe les questions d’une section en UN seul quiz', () => {
		const plan = buildChapterPlan(
			entree({
				sections: [section('a', 'Bilan', 1)],
				quizQuestions: [question('q2', 'a', 1), question('q1', 'a', 0), question('q3', 'a', 2)]
			})
		);

		const items = plan[0].items;
		expect(items).toHaveLength(1);
		expect(items[0].kind).toBe('quiz');
		expect(items[0].kind === 'quiz' && items[0].questions.map((q) => q.id)).toEqual([
			'q1',
			'q2',
			'q3'
		]);
	});

	it('pose le quiz à la position de sa première question', () => {
		const plan = buildChapterPlan(
			entree({
				sections: [section('a', 'Le cours', 1)],
				documents: [document('d1', 'a', 5)],
				quizQuestions: [question('q1', 'a', 1), question('q2', 'a', 9)]
			})
		);

		expect(plan[0].items.map((i) => i.kind)).toEqual(['quiz', 'document']);
	});

	it('« Non classé » vient en dernier et n’a pas de titre', () => {
		const plan = buildChapterPlan(
			entree({
				sections: [section('a', 'Préparation', 1)],
				documents: [document('d1', 'a', 0), document('d2', null, 0)]
			})
		);

		expect(plan.map((s) => s.title)).toEqual(['Préparation', null]);
	});

	// Même raison que pour le quiz : `ChecklistSection` est conçu pour une
	// liste avec ses statistiques, pas pour une ligne isolée.
	it('regroupe les objectifs d’une section en UNE liste', () => {
		const objectif = (id: string, sectionOrder: number) => ({
			id,
			chapterId: 'chap',
			content: `Objectif ${id}`,
			description: null,
			displayOrder: 0,
			sectionId: 'a',
			sectionOrder,
			createdAt: '2026-09-14T00:00:00Z',
			updatedAt: '2026-09-14T00:00:00Z',
			publishedAt: '2026-09-14T00:00:00Z',
			isCompleted: false,
			completedAt: null
		});

		const plan = buildChapterPlan(
			entree({
				sections: [section('a', 'Préparation', 1)],
				checklistItems: [objectif('o2', 1), objectif('o1', 0)]
			})
		);

		const items = plan[0].items;
		expect(items).toHaveLength(1);
		expect(items[0].kind).toBe('checklist');
		expect(items[0].kind === 'checklist' && items[0].items.map((i) => i.id)).toEqual(['o1', 'o2']);
	});

	it('rend un plan vide quand rien n’est publié', () => {
		expect(buildChapterPlan(entree({ sections: [section('a', 'Préparation', 1)] }))).toEqual([]);
	});
});
