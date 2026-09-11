/**
 * Tests — résolution des travaux à faire avant écriture
 *
 * Le calendrier de référence est celui de `1SPE 1` : cours le jeudi, vacances
 * de Toussaint du 17 octobre au 1er novembre 2026. La séance de référence est
 * le jeudi 10 septembre 2026 ; le cours suivant est donc le 17.
 */

import { describe, it, expect } from 'vitest';
import { isContentEmpty, resolveHomeworkItems } from '../journal-homework';
import type { ClassSessionCalendar } from '../class-sessions';

const SESSION_DATE = '2026-09-10';
const PROCHAIN_COURS = '2026-09-17';

const avecEmploiDuTemps: ClassSessionCalendar = {
	weekdays: [4],
	holidays: [{ startDate: '2026-10-17', endDate: '2026-11-01' }],
	until: '2027-07-15',
	hasSchedule: true
};

const sansEmploiDuTemps: ClassSessionCalendar = {
	weekdays: [],
	holidays: [],
	until: '2027-07-15',
	hasSchedule: false
};

function resolve_(
	items: { content: string; dueDate: string | null }[],
	calendar = avecEmploiDuTemps
) {
	return resolveHomeworkItems(items, { entryDate: SESSION_DATE, calendar });
}

describe('isContentEmpty', () => {
	it('reconnaît un éditeur riche vide', () => {
		// TipTap rend `<p></p>` quand on n'a rien tapé : la contrainte SQL
		// `btrim(content) <> ''` ne le voit PAS.
		expect(isContentEmpty('<p></p>')).toBe(true);
	});

	it('reconnaît un paragraphe d’espaces insécables', () => {
		expect(isContentEmpty('<p>&nbsp; &nbsp;</p>')).toBe(true);
	});

	it('ne prend pas du texte pour du vide', () => {
		expect(isContentEmpty('<p>Exercices 12 à 15</p>')).toBe(false);
	});

	it('ne jette pas un travail qui n’est qu’une image', () => {
		expect(isContentEmpty('<p><img src="data:image/png;base64,xxx" /></p>')).toBe(false);
	});

	it('ne jette pas un travail qui n’est qu’une formule', () => {
		// Une formule MathLive n'a aucun texte propre : la juger vide effacerait
		// silencieusement le travail du professeur.
		expect(isContentEmpty('<p><span data-math-inline latex="x^2"></span></p>')).toBe(false);
	});

	it('ne jette pas une citation de ressource', () => {
		expect(isContentEmpty('<p>[[exercise:0f8b0b3e-0000-4000-8000-000000000001|Fiche 3]]</p>')).toBe(
			false
		);
	});
});

describe('resolveHomeworkItems — échéance absente', () => {
	it('résout une échéance vide au prochain cours', () => {
		// La règle posée par le PO : « pas de date » veut dire le cours suivant.
		const { items, rejected } = resolve_([{ content: '<p>Exercice 12</p>', dueDate: null }]);

		expect(rejected).toEqual([]);
		expect(items).toEqual([{ content: '<p>Exercice 12</p>', dueDate: PROCHAIN_COURS }]);
	});

	it('traite une chaîne vide comme une échéance absente', () => {
		const { items } = resolve_([{ content: '<p>Exercice 12</p>', dueDate: '' }]);

		expect(items[0].dueDate).toBe(PROCHAIN_COURS);
	});

	it('laisse l’échéance vide quand la classe n’a pas d’emploi du temps', () => {
		// Trois des quatre classes actives sont dans ce cas : rien à résoudre, et
		// surtout rien à inventer.
		const { items, rejected } = resolve_(
			[{ content: '<p>Réviser</p>', dueDate: null }],
			sansEmploiDuTemps
		);

		expect(rejected).toEqual([]);
		expect(items[0].dueDate).toBeNull();
	});
});

describe('resolveHomeworkItems — échéance fournie', () => {
	it('accepte un jour de cours', () => {
		const { items, rejected } = resolve_([{ content: '<p>DM</p>', dueDate: '2026-09-24' }]);

		expect(rejected).toEqual([]);
		expect(items[0].dueDate).toBe('2026-09-24');
	});

	it('refuse un jour sans cours', () => {
		// Le menu ne propose que des jours de cours, mais une requête forgée peut
		// porter n'importe quelle date : la règle se rejoue ici.
		const { items, rejected } = resolve_([{ content: '<p>DM</p>', dueDate: '2026-09-23' }]);

		expect(rejected).toEqual(['2026-09-23']);
		expect(items).toEqual([]);
	});

	it('refuse un jour de cours tombant en vacances', () => {
		const { rejected } = resolve_([{ content: '<p>DM</p>', dueDate: '2026-10-22' }]);

		expect(rejected).toEqual(['2026-10-22']);
	});

	it('refuse la date de la séance elle-même', () => {
		const { rejected } = resolve_([{ content: '<p>DM</p>', dueDate: SESSION_DATE }]);

		expect(rejected).toEqual([SESSION_DATE]);
	});

	it('accepte n’importe quelle date quand la classe n’a pas d’emploi du temps', () => {
		// Sans emploi du temps il n'y a aucune règle à faire respecter : la
		// refuser bloquerait la saisie sur les trois quarts des classes.
		const { items, rejected } = resolve_(
			[{ content: '<p>DM</p>', dueDate: '2026-09-23' }],
			sansEmploiDuTemps
		);

		expect(rejected).toEqual([]);
		expect(items[0].dueDate).toBe('2026-09-23');
	});

	it('rend toutes les échéances refusées, pas seulement la première', () => {
		// Le professeur doit pouvoir corriger sa saisie en une fois.
		const { rejected } = resolve_([
			{ content: '<p>A</p>', dueDate: '2026-09-23' },
			{ content: '<p>B</p>', dueDate: '2026-09-24' },
			{ content: '<p>C</p>', dueDate: '2026-09-25' }
		]);

		expect(rejected).toEqual(['2026-09-23', '2026-09-25']);
	});
});

describe('resolveHomeworkItems — travaux vides', () => {
	it('retire un travail sans contenu', () => {
		const { items } = resolve_([
			{ content: '<p>Exercice 12</p>', dueDate: null },
			{ content: '<p></p>', dueDate: '2026-09-24' }
		]);

		expect(items).toHaveLength(1);
		expect(items[0].content).toBe('<p>Exercice 12</p>');
	});

	it('ne refuse pas l’échéance d’un travail vide', () => {
		// Un travail retiré ne doit pas faire échouer l'enregistrement à cause
		// d'une date restée dans un champ qu'on jette.
		const { rejected, items } = resolve_([{ content: '<p></p>', dueDate: '2026-09-23' }]);

		expect(rejected).toEqual([]);
		expect(items).toEqual([]);
	});

	it('rend une liste vide sur une liste entièrement vide', () => {
		const { items, rejected } = resolve_([]);

		expect(items).toEqual([]);
		expect(rejected).toEqual([]);
	});
});

describe('resolveHomeworkItems — plusieurs travaux', () => {
	it('conserve l’ordre de saisie', () => {
		const { items } = resolve_([
			{ content: '<p>Premier</p>', dueDate: null },
			{ content: '<p>Deuxième</p>', dueDate: '2026-10-01' },
			{ content: '<p>Troisième</p>', dueDate: '2026-09-24' }
		]);

		expect(items.map((i) => i.content)).toEqual([
			'<p>Premier</p>',
			'<p>Deuxième</p>',
			'<p>Troisième</p>'
		]);
		expect(items.map((i) => i.dueDate)).toEqual([PROCHAIN_COURS, '2026-10-01', '2026-09-24']);
	});

	it('accepte le cas qui motive toute la fonctionnalité', () => {
		// Un exercice pour le prochain cours, un DM pour la semaine suivante.
		const { items, rejected } = resolve_([
			{ content: '<p>Exercices 12 à 15</p>', dueDate: null },
			{ content: '<p>DM sur les triangles</p>', dueDate: '2026-09-24' }
		]);

		expect(rejected).toEqual([]);
		expect(items.map((i) => i.dueDate)).toEqual([PROCHAIN_COURS, '2026-09-24']);
	});
});
