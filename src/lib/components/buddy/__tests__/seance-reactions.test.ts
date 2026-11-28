/**
 * Réactions du Palotin en séance (chantier `palotins`, partie C)
 * ===============================================================
 *
 * 5 réussites d'affilée → exclamation ; 3 erreurs sur la même notion →
 * encouragement ; au plus une réaction par séance, jamais sur la dernière
 * question ; sans Palotin pour réagir, la séance n'attend pas
 * (docs/wip/palotins-progress.md, C2 à C4, C8, C10 à C12).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createSeanceReactions,
	createSeanceTracker,
	playSeanceReaction,
	registerSeanceReactionHandler,
	type SeanceReaction
} from '../seance-reactions';

// Functions
function feed(
	tracker: ReturnType<typeof createSeanceTracker>,
	answers: { correct: boolean; notionId?: string | null }[]
): (SeanceReaction | null)[] {
	return answers.map((answer) =>
		tracker.record({ correct: answer.correct, notionId: answer.notionId ?? null })
	);
}

const ok = { correct: true };
const ko = (notionId: string | null) => ({ correct: false, notionId });

describe('createSeanceTracker', () => {
	it('5 réussites d’affilée : exclamation à la cinquième (C2)', () => {
		const tracker = createSeanceTracker();
		expect(feed(tracker, [ok, ok, ok, ok, ok])).toEqual([null, null, null, null, 'streak']);
	});

	it('une erreur remet la série à zéro', () => {
		const tracker = createSeanceTracker();
		expect(feed(tracker, [ok, ok, ok, ok, ko(null), ok, ok, ok, ok])).toEqual(Array(9).fill(null));
	});

	it('moins de 5 questions : pas de série, c’est normal (C8)', () => {
		const tracker = createSeanceTracker();
		expect(feed(tracker, [ok, ok, ok, ok])).toEqual([null, null, null, null]);
	});

	it('3 erreurs sur la même notion, même non consécutives : encouragement (C3)', () => {
		const tracker = createSeanceTracker();
		expect(feed(tracker, [ko('n1'), ok, ko('n2'), ko('n1'), ok, ko('n1')])).toEqual([
			null,
			null,
			null,
			null,
			null,
			'struggle'
		]);
	});

	it('3 erreurs sur 3 notions différentes : rien', () => {
		const tracker = createSeanceTracker();
		expect(feed(tracker, [ko('n1'), ko('n2'), ko('n3')])).toEqual([null, null, null]);
	});

	it('erreurs sans notion : jamais comptées (C3, C12)', () => {
		const tracker = createSeanceTracker();
		expect(feed(tracker, [ko(null), ko(null), ko(null), ko(null)])).toEqual(Array(4).fill(null));
	});

	it('au plus une réaction par séance : le premier déclencheur gagne (C4)', () => {
		const tracker = createSeanceTracker();
		const reactions = feed(tracker, [
			ko('n1'),
			ko('n1'),
			ko('n1'),
			ok,
			ok,
			ok,
			ok,
			ok,
			ok,
			ok,
			ok,
			ok,
			ok
		]);
		expect(reactions.filter((reaction) => reaction !== null)).toEqual(['struggle']);
	});
});

describe('playSeanceReaction', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('sans Palotin pour réagir (visiteur, prof, Palotin illisible) : rien n’attend (C10)', async () => {
		await expect(playSeanceReaction('streak')).resolves.toBeUndefined();
	});

	it('Palotin présent : la séance attend la fin de son passage', async () => {
		let finish: () => void = () => {};
		const handler = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				})
		);
		const unregister = registerSeanceReactionHandler(handler);
		let done = false;
		const played = playSeanceReaction('struggle').then(() => {
			done = true;
		});
		await Promise.resolve();
		expect(handler).toHaveBeenCalledWith('struggle');
		expect(done).toBe(false);
		finish();
		await played;
		expect(done).toBe(true);
		unregister();
	});

	it('Palotin parti (démonté) : plus rien n’attend', async () => {
		const handler = vi.fn(() => new Promise<void>(() => {}));
		registerSeanceReactionHandler(handler)();
		await expect(playSeanceReaction('streak')).resolves.toBeUndefined();
		expect(handler).not.toHaveBeenCalled();
	});

	it('un ancien Palotin démonté n’efface pas le nouveau', async () => {
		const first = vi.fn(() => Promise.resolve());
		const second = vi.fn(() => Promise.resolve());
		const unregisterFirst = registerSeanceReactionHandler(first);
		const unregisterSecond = registerSeanceReactionHandler(second);
		unregisterFirst();
		await playSeanceReaction('streak');
		expect(second).toHaveBeenCalledOnce();
		expect(first).not.toHaveBeenCalled();
		unregisterSecond();
	});
});

describe('createSeanceReactions', () => {
	it('jamais sur la dernière question : la fin de séance appartient au gain (C11)', async () => {
		const handler = vi.fn(() => Promise.resolve());
		const unregister = registerSeanceReactionHandler(handler);
		const reactions = createSeanceReactions();
		for (let i = 0; i < 4; i++) {
			expect(reactions.afterAnswer({ correct: true, notionId: null })).toBeNull();
		}
		expect(reactions.afterAnswer({ correct: true, notionId: null, isLast: true })).toBeNull();
		expect(handler).not.toHaveBeenCalled();
		unregister();
	});

	it('réaction déclenchée : le passage est joué et attendu', async () => {
		const handler = vi.fn(() => Promise.resolve());
		const unregister = registerSeanceReactionHandler(handler);
		const reactions = createSeanceReactions();
		for (let i = 0; i < 4; i++) reactions.afterAnswer({ correct: true, notionId: null });
		await reactions.afterAnswer({ correct: true, notionId: null });
		expect(handler).toHaveBeenCalledExactlyOnceWith('streak');
		unregister();
	});
});
