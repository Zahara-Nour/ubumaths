import { describe, expect, it } from 'vitest';
import {
	assignmentPreviewHref,
	assignmentPreviewReturn,
	automathsQuitLink,
	notionHref,
	notionReturn,
	studentFollowUpHref,
	studentFollowUpReturn,
	evaluationResultsHref,
	evaluationResultsReturn,
	studentJournalHref,
	studentJournalReturn,
	studySessionHref,
	studySessionReturnHref
} from '../return-links';

const params = (query: string) => new URLSearchParams(query);

describe('notion du programme (élève)', () => {
	it('ouverte depuis « Ma progression » : retour à la progression', () => {
		expect(notionHref('n1')).toBe('/dashboard/student/notions/n1');
		expect(notionReturn(params(''))).toEqual({
			href: '/dashboard/student/progression?onglet=objectifs',
			label: 'Retour à ma progression'
		});
	});

	it('ouverte depuis le deck « Programme » : retour au deck', () => {
		expect(notionHref('n1', 'programme')).toBe('/dashboard/student/notions/n1?depuis=programme');
		expect(notionReturn(params('depuis=programme'))).toEqual({
			href: '/dashboard/revisions/decks/programme',
			label: 'Retour au Programme'
		});
	});

	it('origine inconnue : retour à la progression', () => {
		expect(notionReturn(params('depuis=https://exemple.com')).href).toBe(
			'/dashboard/student/progression?onglet=objectifs'
		);
	});
});

describe('journal d’un élève (prof)', () => {
	it('ouvert depuis les classes : retour aux classes', () => {
		expect(studentJournalHref('s1')).toBe('/dashboard/teacher/students/s1/journal');
		expect(studentJournalReturn('s1', params(''))).toEqual({
			href: '/dashboard/teacher/classes',
			label: 'Retour aux Bataillons'
		});
	});

	it('ouvert depuis l’accueil : retour à l’accueil', () => {
		expect(studentJournalHref('s1', 'accueil')).toBe(
			'/dashboard/teacher/students/s1/journal?depuis=accueil'
		);
		expect(studentJournalReturn('s1', params('depuis=accueil'))).toEqual({
			href: '/dashboard',
			label: "Retour à l'accueil"
		});
	});

	it('origine inconnue (adresse bricolée) : retour aux classes', () => {
		expect(studentJournalReturn('s1', params('depuis=https://exemple.com')).href).toBe(
			'/dashboard/teacher/classes'
		);
	});

	it('ouvert depuis le suivi : retour au suivi de cet élève', () => {
		expect(studentJournalHref('s1', 'suivi')).toBe(
			'/dashboard/teacher/students/s1/journal?depuis=suivi'
		);
		expect(studentJournalReturn('s1', params('depuis=suivi'))).toEqual({
			href: '/dashboard/teacher/students/s1',
			label: 'Retour au suivi'
		});
	});

	it('le suivi d’un élève a sa propre adresse', () => {
		expect(studentFollowUpHref('s1')).toBe('/dashboard/teacher/students/s1');
	});
});

describe('suivi d’un élève (prof)', () => {
	const CLASS_ID = '11111111-2222-4333-8444-555555555555';

	it('ouvert depuis les classes : retour aux classes', () => {
		expect(studentFollowUpReturn(params('')).href).toBe('/dashboard/teacher/classes');
	});

	it('ouvert depuis l’analytique (grille A) : retour à l’analytique de cette classe', () => {
		expect(studentFollowUpHref('s1', CLASS_ID)).toBe(
			`/dashboard/teacher/students/s1?depuis=analytique&classe=${CLASS_ID}`
		);
		expect(studentFollowUpReturn(params(`depuis=analytique&classe=${CLASS_ID}`))).toEqual({
			href: `/dashboard/teacher/classes/${CLASS_ID}/analytics`,
			label: "Retour à l'analytique"
		});
	});

	it('classe bricolée ou absente : retour aux classes', () => {
		expect(studentFollowUpReturn(params('depuis=analytique&classe=../admin')).href).toBe(
			'/dashboard/teacher/classes'
		);
		expect(studentFollowUpReturn(params('depuis=analytique')).href).toBe(
			'/dashboard/teacher/classes'
		);
	});
});

describe('résultats d’un contrôle (prof)', () => {
	const STUDENT_ID = '11111111-2222-4333-8444-555555555555';

	it('ouverts depuis la liste : retour aux contrôles', () => {
		expect(evaluationResultsHref('e1')).toBe('/dashboard/teacher/assessments/e1/results');
		expect(evaluationResultsReturn(params(''))).toEqual({
			href: '/dashboard/teacher/assessments',
			label: 'Retour aux contrôles'
		});
	});

	it('ouverts depuis le suivi : retour au suivi de cet élève', () => {
		expect(evaluationResultsHref('e1', STUDENT_ID)).toBe(
			`/dashboard/teacher/assessments/e1/results?depuis=suivi&eleve=${STUDENT_ID}`
		);
		expect(evaluationResultsReturn(params(`depuis=suivi&eleve=${STUDENT_ID}`))).toEqual({
			href: `/dashboard/teacher/students/${STUDENT_ID}`,
			label: 'Retour au suivi'
		});
	});

	it('élève bricolé : retour aux contrôles', () => {
		expect(evaluationResultsReturn(params('depuis=suivi&eleve=x/../../admin')).href).toBe(
			'/dashboard/teacher/assessments'
		);
	});
});

describe('session de révision', () => {
	it('lancée depuis la page du deck : « Quitter » y ramène', () => {
		expect(studySessionHref('d1')).toBe('/dashboard/revisions/decks/d1/study');
		expect(studySessionReturnHref('d1', params(''))).toBe('/dashboard/revisions/decks/d1');
	});

	it('lancée depuis le Programme : « Quitter » ramène au Programme, filtre conservé dans le lien', () => {
		expect(studySessionHref('d1', { states: 'learning,relearning', from: 'programme' })).toBe(
			'/dashboard/revisions/decks/d1/study?states=learning%2Crelearning&depuis=programme'
		);
		expect(
			studySessionReturnHref('d1', params('states=learning%2Crelearning&depuis=programme'))
		).toBe('/dashboard/revisions/decks/programme');
	});

	it('origine inconnue : la page du deck', () => {
		expect(studySessionReturnHref('d1', params('depuis=ailleurs'))).toBe(
			'/dashboard/revisions/decks/d1'
		);
	});
});

describe('« Quitter » un test d’automatismes', () => {
	it('entraînement : le panier, sans confirmation', () => {
		expect(automathsQuitLink({ inEvaluation: false, attemptOpen: false, timed: true })).toEqual({
			href: '/automaths/panier',
			confirmLeave: undefined
		});
	});

	it('contrôle chronométré : « Mes contrôles », confirmation qui prévient du temps qui court', () => {
		const link = automathsQuitLink({ inEvaluation: true, attemptOpen: true, timed: true });
		expect(link.href).toBe('/dashboard/student/assessments');
		expect(link.confirmLeave).toContain('réponses tapées seront perdues');
		expect(link.confirmLeave).toContain('le temps continue de courir');
	});

	it('aperçu du prof (contrôle sans tentative ouverte) : « Mes contrôles », sans confirmation', () => {
		expect(automathsQuitLink({ inEvaluation: true, attemptOpen: false, timed: true })).toEqual({
			href: '/dashboard/student/assessments',
			confirmLeave: undefined
		});
	});

	it('contrôle sans chrono : confirmation, sans parler du temps', () => {
		const link = automathsQuitLink({ inEvaluation: true, attemptOpen: true, timed: false });
		expect(link.href).toBe('/dashboard/student/assessments');
		expect(link.confirmLeave).toContain('réponses tapées seront perdues');
		expect(link.confirmLeave).not.toContain('temps');
	});
});

describe('aperçu « vue élève » d’une affectation (D6)', () => {
	const W = '550e8400-e29b-41d4-a716-446655440011';
	const A = '550e8400-e29b-41d4-a716-446655440010';
	const S = '550e8400-e29b-41d4-a716-446655440501';
	const R = '550e8400-e29b-41d4-a716-446655440030';
	const E = '550e8400-e29b-41d4-a716-446655440012';
	const preview = `/dashboard/teacher/contenu/worksheets/${W}/assignments/${A}/preview`;

	it('ouvert depuis un signalement : élève, origine et ancre de l’exercice dans l’adresse', () => {
		expect(assignmentPreviewHref(W, A, { studentId: S, reportId: R, worksheetExerciseId: E })).toBe(
			`${preview}?studentId=${S}&depuis=signalement&signalement=${R}#exercice-${E}`
		);
	});

	it('retour : à la page du signalement quand l’aperçu en vient', () => {
		expect(
			assignmentPreviewReturn(W, A, params(`studentId=${S}&depuis=signalement&signalement=${R}`))
		).toEqual({
			href: `/dashboard/teacher/contenu/worksheets/${W}/assignments/${A}/reports/${R}`,
			label: 'Retour au signalement'
		});
	});

	it('sinon (ou origine invalide) : à la fiche, comme avant', () => {
		const fiche = {
			href: `/dashboard/teacher/contenu/worksheets/${W}`,
			label: 'Retour à la fiche'
		};
		expect(assignmentPreviewReturn(W, A, params(''))).toEqual(fiche);
		expect(assignmentPreviewReturn(W, A, params('depuis=signalement'))).toEqual(fiche);
		expect(assignmentPreviewReturn(W, A, params('depuis=signalement&signalement=../../x'))).toEqual(
			fiche
		);
	});
});
