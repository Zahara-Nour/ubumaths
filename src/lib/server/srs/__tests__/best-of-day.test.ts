/**
 * « Le meilleur résultat du jour » — auto-évaluations (flash-cards, cartes de cours)
 * ===================================================================================
 *
 * Décision de David (2026-09-30) : l'élève peut refaire une question plusieurs fois
 * dans la journée ; la planification (FSRS) ne garde qu'UN résultat par jour et par
 * question, le MEILLEUR. Un « Je n'avais pas trouvé » le matin puis « J'avais
 * trouvé » le soir = la journée compte comme « trouvé », une seule révision.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { FSRS } from '$lib/srs/fsrs';
import { Grade, type CardStats } from '$lib/srs/types';
import { reviewBestOfDay } from '../best-of-day';

const fsrs = new FSRS();

function freshCard(): CardStats {
	const init = fsrs.initCard('eleve', 'template', 'modele');
	return {
		id: 'fiche',
		...init,
		createdAt: '2026-09-01T00:00:00Z',
		updatedAt: '2026-09-01T00:00:00Z'
	};
}

/** Une révision « normale » faite il y a des jours, pour partir d'un état réaliste */
function cardReviewedLongAgo(): CardStats {
	vi.setSystemTime(new Date('2026-09-20T10:00:00Z'));
	const reviewed = { ...freshCard(), ...fsrs.reviewCard(freshCard(), Grade.GOOD) };
	return reviewed;
}

afterEach(() => {
	vi.useRealTimers();
});

describe('reviewBestOfDay', () => {
	it('première révision du jour : révision normale, état d’avant mémorisé', () => {
		vi.useFakeTimers();
		const card = cardReviewedLongAgo();
		vi.setSystemTime(new Date('2026-09-30T08:00:00Z'));

		const result = reviewBestOfDay(fsrs, card, Grade.AGAIN, new Date());

		expect(result).not.toBeNull();
		expect(result!.totalReviews).toBe(card.totalReviews + 1);
		const last = result!.reviewHistory.at(-1)!;
		expect(last.grade).toBe(Grade.AGAIN);
		expect(last.before?.stability).toBe(card.stability);
		expect(last.before?.totalReviews).toBe(card.totalReviews);
	});

	it('mieux plus tard dans la journée : la journée compte comme le meilleur, une seule révision', () => {
		vi.useFakeTimers();
		const card = cardReviewedLongAgo();
		vi.setSystemTime(new Date('2026-09-30T08:00:00Z'));
		const morning = reviewBestOfDay(fsrs, card, Grade.AGAIN, new Date())!;

		vi.setSystemTime(new Date('2026-09-30T16:00:00Z'));
		const evening = reviewBestOfDay(fsrs, morning, Grade.GOOD, new Date());

		// Même résultat que si seule la révision « Good » avait eu lieu, à cette heure-là
		const onlyGood = fsrs.reviewCard(card, Grade.GOOD);
		expect(evening).not.toBeNull();
		expect(evening!.stability).toBeCloseTo(onlyGood.stability, 10);
		expect(evening!.difficulty).toBeCloseTo(onlyGood.difficulty, 10);
		expect(evening!.state).toBe(onlyGood.state);
		expect(evening!.nextReview).toBe(onlyGood.nextReview);
		expect(evening!.totalReviews).toBe(card.totalReviews + 1);
		const today = evening!.reviewHistory.filter((entry) => entry.date.startsWith('2026-09-30'));
		expect(today.map((entry) => entry.grade)).toEqual([Grade.GOOD]);
	});

	it('pas mieux (égal ou moins bien) : rien ne change', () => {
		vi.useFakeTimers();
		const card = cardReviewedLongAgo();
		vi.setSystemTime(new Date('2026-09-30T08:00:00Z'));
		const morning = reviewBestOfDay(fsrs, card, Grade.GOOD, new Date())!;

		vi.setSystemTime(new Date('2026-09-30T16:00:00Z'));
		expect(reviewBestOfDay(fsrs, morning, Grade.AGAIN, new Date())).toBeNull();
		expect(reviewBestOfDay(fsrs, morning, Grade.GOOD, new Date())).toBeNull();
	});

	it('le lendemain : nouvelle journée, révision normale', () => {
		vi.useFakeTimers();
		const card = cardReviewedLongAgo();
		vi.setSystemTime(new Date('2026-09-30T08:00:00Z'));
		const day1 = reviewBestOfDay(fsrs, card, Grade.GOOD, new Date())!;

		vi.setSystemTime(new Date('2026-10-01T08:00:00Z'));
		const day2 = reviewBestOfDay(fsrs, day1, Grade.AGAIN, new Date());

		expect(day2).not.toBeNull();
		expect(day2!.totalReviews).toBe(day1.totalReviews + 1);
	});

	it('révision du jour sans état mémorisé (faite ailleurs) : on ne la remplace pas', () => {
		vi.useFakeTimers();
		const card = cardReviewedLongAgo();
		vi.setSystemTime(new Date('2026-09-30T08:00:00Z'));
		// Révision du jour faite par un autre chemin (Entraînement) : pas de `before`
		const other = { ...card, ...fsrs.reviewCard(card, Grade.AGAIN) };

		vi.setSystemTime(new Date('2026-09-30T16:00:00Z'));
		expect(reviewBestOfDay(fsrs, other, Grade.GOOD, new Date())).toBeNull();
	});

	it('une révision corrigée (sans état mémorisé) au milieu de la journée n’est jamais effacée', async () => {
		vi.useFakeTimers();
		const card = cardReviewedLongAgo();
		vi.setSystemTime(new Date('2026-09-30T08:00:00Z'));
		const morning = reviewBestOfDay(fsrs, card, Grade.AGAIN, new Date())!;

		// Midi : question corrigée par l'application (Entraînement), pas d'auto-évaluation
		vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
		const noon = { ...morning, ...fsrs.reviewCard(morning, Grade.AGAIN) };

		// Soir : « J'avais trouvé » ne doit pas effacer la révision de midi
		vi.setSystemTime(new Date('2026-09-30T16:00:00Z'));
		expect(reviewBestOfDay(fsrs, noon, Grade.GOOD, new Date())).toBeNull();
	});

	it('fiche jamais révisée : mieux plus tard dans la journée repart de l’état initial', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-30T08:00:00Z'));
		const card = freshCard();
		const morning = reviewBestOfDay(fsrs, card, Grade.AGAIN, new Date())!;

		vi.setSystemTime(new Date('2026-09-30T16:00:00Z'));
		const evening = reviewBestOfDay(fsrs, morning, Grade.GOOD, new Date())!;
		const onlyGood = fsrs.reviewCard(card, Grade.GOOD);

		expect(evening.totalReviews).toBe(1);
		expect(evening.stability).toBeCloseTo(onlyGood.stability, 10);
		expect(evening.state).toBe(onlyGood.state);
	});
});
