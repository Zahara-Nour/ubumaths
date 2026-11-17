/**
 * Les gestes brefs (zoom au clavier, boutons de zoom, flèches) sont des
 * interactions, comme la molette : pendant qu'ils s'enchaînent, les analyses
 * (points remarquables, intersections) dorment, et ne tournent qu'une fois,
 * peu après le dernier appui. Sans cela, chaque appui relançait l'analyse de
 * toutes les courbes et les intersections de toutes les paires.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GrapheurStore, BRIEF_GESTURE_DELAY } from '$lib/stores/grapheur.svelte';

/** Un peu plus long que le délai de fin d'un geste bref. */
const AFTER = BRIEF_GESTURE_DELAY + 50;

describe('GrapheurStore — geste bref', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('marque l’interaction, puis la clôt après le délai', () => {
		const g = new GrapheurStore();

		g.briefGesture();
		expect(g.isInteracting).toBe(true);

		vi.advanceTimersByTime(AFTER);
		expect(g.isInteracting).toBe(false);
	});

	it('reste en interaction tant que les appuis s’enchaînent', () => {
		const g = new GrapheurStore();

		for (let i = 0; i < 5; i++) {
			g.briefGesture();
			vi.advanceTimersByTime(BRIEF_GESTURE_DELAY / 2);
			expect(g.isInteracting).toBe(true);
		}

		vi.advanceTimersByTime(AFTER);
		expect(g.isInteracting).toBe(false);
	});

	it('ne clôt pas un glisser en cours', () => {
		const g = new GrapheurStore();

		g.setInteracting(true);
		g.briefGesture();
		vi.advanceTimersByTime(AFTER);
		expect(g.isInteracting).toBe(true);

		g.setInteracting(false);
		expect(g.isInteracting).toBe(false);
	});

	it('un glisser lâché pendant un geste bref laisse le geste finir', () => {
		const g = new GrapheurStore();

		g.setInteracting(true);
		g.briefGesture();
		g.setInteracting(false);
		expect(g.isInteracting).toBe(true);

		vi.advanceTimersByTime(AFTER);
		expect(g.isInteracting).toBe(false);
	});

	it('endBriefGesture clôt le geste tout de suite', () => {
		const g = new GrapheurStore();

		g.briefGesture();
		g.endBriefGesture();
		expect(g.isInteracting).toBe(false);
	});
});
