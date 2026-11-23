/**
 * Rejeu des fiches de mémoire (`scripts/srs/rejouer-fiches-calcul.ts`)
 *
 * Une fiche repart de zéro et rejoue son historique (mêmes dates, notes, temps) avec
 * l'algorithme actuel ; une fiche sans historique, ou à l'historique illisible, n'est
 * pas touchée. Phase 0 validée par David le 2026-11-16 (docs/wip/fsrs-progress.md).
 */

import { describe, expect, it } from 'vitest';
import { FSRS } from '#lib/srs/fsrs.ts';
import { Grade, type CardStats } from '#lib/srs/types.ts';
import { rejouerFiche, type FicheLue } from '../srs/rejouer-fiches-calcul';

// =============================================================================
// Décor
// =============================================================================

const fsrs = new FSRS();

/** Fiche telle que l'ancien algorithme l'a laissée : D = 10, S = 0 après un échec */
function ficheLue(historique: unknown[], extra: Partial<FicheLue> = {}): FicheLue {
	const derniere = historique.at(-1) as { date?: string } | undefined;
	return {
		id: '00000000-0000-4000-8000-000000000001',
		user_id: '00000000-0000-4000-8000-0000000000aa',
		card_reference_type: 'template',
		card_reference_id: '00000000-0000-4000-8000-0000000000bb',
		difficulty: 10,
		stability: 0,
		state: 'relearning',
		last_review: derniere?.date ?? null,
		next_review: '2026-10-02T08:00:00.000Z',
		total_reviews: historique.length,
		review_history: historique,
		updated_at: '2026-10-01T08:00:00.000Z',
		...extra
	};
}

function entree(date: string, grade: number, timeSpent?: number) {
	return { date, grade, elapsedDays: 0, retrievability: 1, ...(timeSpent ? { timeSpent } : {}) };
}

/** Rejeu attendu : `reviewCard` appliqué dans l'ordre, depuis une fiche neuve */
function rejeuAttendu(notes: [string, Grade][]): Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'> {
	let card = fsrs.initCard('u', 'template', 't');
	for (const [date, grade] of notes) card = fsrs.reviewCard(card, grade, undefined, new Date(date));
	return card;
}

// =============================================================================
// Nominal
// =============================================================================

describe('rejouerFiche — nominal', () => {
	it('rejoue l’historique avec l’algorithme actuel', () => {
		const notes: [string, Grade][] = [
			['2026-10-01T08:00:00.000Z', Grade.AGAIN],
			['2026-10-03T08:00:00.000Z', Grade.GOOD],
			['2026-10-10T08:00:00.000Z', Grade.GOOD]
		];
		const r = rejouerFiche(ficheLue(notes.map(([d, g]) => entree(d, g))), fsrs);
		const attendu = rejeuAttendu(notes);

		expect(r.kind).toBe('rejouee');
		if (r.kind !== 'rejouee') return;
		expect(r.apres.difficulty).toBe(attendu.difficulty);
		expect(r.apres.stability).toBe(attendu.stability);
		expect(r.apres.state).toBe('review');
		expect(r.apres.next_review).toBe(attendu.nextReview);
	});

	it('sort une fiche ratée une fois de D = 10 et de S = 0', () => {
		const r = rejouerFiche(ficheLue([entree('2026-10-01T08:00:00.000Z', Grade.AGAIN)]), fsrs);

		expect(r.kind).toBe('rejouee');
		if (r.kind !== 'rejouee') return;
		expect(r.apres.stability).toBeGreaterThan(0);
		expect(r.apres.difficulty).toBeLessThan(10);
		expect(r.apres.state).toBe('relearning');
	});

	it('garde dates, notes et temps de l’historique, recalcule écart et récupérabilité', () => {
		const historique = [
			entree('2026-10-01T08:00:00.000Z', Grade.GOOD, 12),
			entree('2026-10-04T08:00:00.000Z', Grade.GOOD)
		];
		const r = rejouerFiche(ficheLue(historique, { state: 'learning', stability: 2 }), fsrs);

		expect(r.kind).toBe('rejouee');
		if (r.kind !== 'rejouee') return;
		expect(r.apres.review_history.map((e) => [e.date, e.grade, e.timeSpent])).toEqual([
			['2026-10-01T08:00:00.000Z', 3, 12],
			['2026-10-04T08:00:00.000Z', 3, undefined]
		]);
		expect(r.apres.review_history[1].elapsedDays).toBe(3);
		expect(r.apres.review_history[1].retrievability).toBeLessThan(1);
		// pas de clé `timeSpent: undefined` écrite dans le JSON
		expect('timeSpent' in r.apres.review_history[1]).toBe(false);
	});

	it('deux révisions le même jour civil passent par le court terme, comme dans l’appli', () => {
		const notes: [string, Grade][] = [
			['2026-10-01T08:00:00.000Z', Grade.GOOD],
			['2026-10-01T15:00:00.000Z', Grade.GOOD]
		];
		const r = rejouerFiche(
			ficheLue(
				notes.map(([d, g]) => entree(d, g)),
				{ state: 'review', stability: 2 }
			),
			fsrs
		);
		const attendu = rejeuAttendu(notes);

		expect(r.kind).toBe('rejouee');
		if (r.kind !== 'rejouee') return;
		expect(r.apres.stability).toBe(attendu.stability);
		expect(r.apres.next_review).toBe(attendu.nextReview);
	});

	it('le jour se compte à Paris : une heure d’écart à cheval sur minuit n’est pas « le même jour »', () => {
		// 21:30Z = 23:30 à Paris (1er oct.), 22:30Z = 00:30 à Paris (2 oct.) ; même jour en UTC
		const aCheval = rejouerFiche(
			ficheLue([
				entree('2026-10-01T21:30:00.000Z', Grade.GOOD),
				entree('2026-10-01T22:30:00.000Z', Grade.GOOD)
			]),
			fsrs
		);
		const memeJour = rejouerFiche(
			ficheLue([
				entree('2026-10-01T08:00:00.000Z', Grade.GOOD),
				entree('2026-10-01T09:00:00.000Z', Grade.GOOD)
			]),
			fsrs
		);

		if (aCheval.kind !== 'rejouee' || memeJour.kind !== 'rejouee') throw new Error('rejeu attendu');
		expect(aCheval.apres.stability).not.toBe(memeJour.apres.stability);
	});

	it('une fiche déjà rejouée ne change plus', () => {
		const historique = [
			entree('2026-10-01T08:00:00.000Z', Grade.AGAIN),
			entree('2026-10-05T08:00:00.000Z', Grade.GOOD)
		];
		const premier = rejouerFiche(ficheLue(historique), fsrs);
		if (premier.kind !== 'rejouee') throw new Error('rejeu attendu');

		const second = rejouerFiche(ficheLue(premier.apres.review_history, premier.apres), fsrs);
		expect(second.kind).toBe('inchangee');
	});

	it('une fiche déjà rejouée, relue depuis les colonnes `real` (32 bits), ne change plus', () => {
		const historique = [
			entree('2026-10-01T08:00:00.000Z', Grade.AGAIN),
			entree('2026-10-05T08:00:00.000Z', Grade.GOOD)
		];
		const premier = rejouerFiche(ficheLue(historique), fsrs);
		if (premier.kind !== 'rejouee') throw new Error('rejeu attendu');

		const relue = ficheLue(premier.apres.review_history, {
			...premier.apres,
			difficulty: Math.fround(premier.apres.difficulty),
			stability: Math.fround(premier.apres.stability),
			next_review: premier.apres.next_review.replace('T', ' ').replace('.000Z', '+00')
		});
		expect(rejouerFiche(relue, fsrs).kind).toBe('inchangee');
	});

	// Cas de la prod (2026-11-16) : PostgREST rend les `real` à 6 chiffres significatifs
	// (`extra_float_digits = 0`) — D = 2,118104 stocké, 2,1181 relu.
	it('une fiche déjà rejouée, relue à 6 chiffres significatifs, ne change plus', () => {
		const historique = [entree('2026-10-01T08:00:00.000Z', Grade.GOOD)];
		const premier = rejouerFiche(ficheLue(historique), fsrs);
		if (premier.kind !== 'rejouee') throw new Error('rejeu attendu');

		const relue = ficheLue(premier.apres.review_history, {
			...premier.apres,
			difficulty: Number(premier.apres.difficulty.toPrecision(6)),
			stability: Number(premier.apres.stability.toPrecision(6))
		});
		expect(rejouerFiche(relue, fsrs).kind).toBe('inchangee');
	});

	it('une difficulté réellement différente (au millième) est encore rejouée', () => {
		const historique = [entree('2026-10-01T08:00:00.000Z', Grade.GOOD)];
		const premier = rejouerFiche(ficheLue(historique), fsrs);
		if (premier.kind !== 'rejouee') throw new Error('rejeu attendu');

		const relue = ficheLue(premier.apres.review_history, {
			...premier.apres,
			difficulty: premier.apres.difficulty + 0.001
		});
		expect(rejouerFiche(relue, fsrs).kind).toBe('rejouee');
	});
});

// =============================================================================
// Limites et erreurs : la fiche n'est pas touchée
// =============================================================================

describe('rejouerFiche — fiche non touchée', () => {
	it('sans historique', () => {
		const r = rejouerFiche(ficheLue([], { state: 'new', stability: 0, difficulty: 5 }), fsrs);
		expect(r.kind).toBe('sans-historique');
	});

	it.each([
		['une note hors 1-4', [entree('2026-10-01T08:00:00.000Z', 5)]],
		['une note non entière', [entree('2026-10-01T08:00:00.000Z', 2.5)]],
		['une date illisible', [entree('pas une date', 3)]],
		[
			'un historique dans le désordre',
			[entree('2026-10-05T08:00:00.000Z', 3), entree('2026-10-01T08:00:00.000Z', 3)]
		],
		[
			'un état « meilleur du jour » (`before`)',
			[{ ...entree('2026-10-01T08:00:00.000Z', 3), before: {} }]
		],
		['une entrée qui n’est pas un objet', ['3']]
	])('refuse %s', (_cas, historique) => {
		expect(rejouerFiche(ficheLue(historique), fsrs).kind).toBe('refusee');
	});

	it('refuse un historique qui n’est pas un tableau', () => {
		const fiche = { ...ficheLue([]), review_history: { a: 1 } };
		expect(rejouerFiche(fiche, fsrs).kind).toBe('refusee');
	});

	it('refuse un nombre de révisions différent de l’historique', () => {
		const fiche = ficheLue([entree('2026-10-01T08:00:00.000Z', 3)], { total_reviews: 2 });
		expect(rejouerFiche(fiche, fsrs).kind).toBe('refusee');
	});

	it('refuse une dernière révision différente de la dernière date de l’historique', () => {
		const fiche = ficheLue([entree('2026-10-01T08:00:00.000Z', 3)], {
			last_review: '2026-10-02T08:00:00.000Z'
		});
		expect(rejouerFiche(fiche, fsrs).kind).toBe('refusee');
	});

	it('accepte la dernière révision écrite au format de Postgres', () => {
		const fiche = ficheLue([entree('2026-10-01T08:00:00.000Z', 3)], {
			last_review: '2026-10-01 08:00:00+00',
			state: 'learning',
			stability: 2
		});
		expect(rejouerFiche(fiche, fsrs).kind).toBe('rejouee');
	});
});
