import { describe, expect, it } from 'vitest';
import {
	assignmentPreviewHref,
	assignmentPreviewReturn,
	automathsQuitLink,
	studentJournalHref,
	studentJournalReturn,
	studySessionHref,
	studySessionReturnHref
} from '../return-links';

const params = (query: string) => new URLSearchParams(query);

describe('journal d’un élève (prof)', () => {
	it('ouvert depuis les classes : retour aux classes', () => {
		expect(studentJournalHref('s1')).toBe('/dashboard/teacher/students/s1/journal');
		expect(studentJournalReturn(params(''))).toEqual({
			href: '/dashboard/teacher/classes',
			label: 'Retour aux Bataillons'
		});
	});

	it('ouvert depuis l’accueil : retour à l’accueil', () => {
		expect(studentJournalHref('s1', 'accueil')).toBe(
			'/dashboard/teacher/students/s1/journal?depuis=accueil'
		);
		expect(studentJournalReturn(params('depuis=accueil'))).toEqual({
			href: '/dashboard',
			label: "Retour à l'accueil"
		});
	});

	it('origine inconnue (adresse bricolée) : retour aux classes', () => {
		expect(studentJournalReturn(params('depuis=https://exemple.com')).href).toBe(
			'/dashboard/teacher/classes'
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
