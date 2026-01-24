/**
 * Tests for DeckStore - Core navigation state for slide deck
 *
 * Tests the reactive store that manages slide navigation including:
 * - Basic navigation (next/prev)
 * - Fragment handling
 * - 2D navigation (horizontal/vertical)
 * - Slide registration
 * - State management (overview, scale)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDeckStore, type DeckStore } from './deckStore.svelte.js';
import type { SlideInfo } from '../core/types.js';

/**
 * Helper to create a SlideInfo object
 */
function createSlideInfo(h: number, v: number = 0, fragmentCount: number = 0): SlideInfo {
	return { h, v, fragmentCount, element: null };
}

/**
 * Helper to register multiple slides in a deck store
 */
function setupSlides(
	store: DeckStore,
	config: Array<{ h: number; v?: number; fragments?: number }>
): void {
	for (const { h, v = 0, fragments = 0 } of config) {
		store.registerSlide(createSlideInfo(h, v, fragments));
	}
}

describe('deckStore', () => {
	let store: DeckStore;

	beforeEach(() => {
		store = createDeckStore();
	});

	describe('initialization', () => {
		it('initializes with default state', () => {
			expect(store.h).toBe(0);
			expect(store.v).toBe(0);
			expect(store.f).toBe(-1);
			expect(store.overview).toBe(false);
			expect(store.paused).toBe(false);
			expect(store.scale).toBe(1);
			expect(store.totalH).toBe(0);
		});

		it('returns correct navigation state', () => {
			expect(store.state).toEqual({ h: 0, v: 0, f: -1 });
		});
	});

	describe('navigation - next()', () => {
		it('does nothing when no slides registered', () => {
			store.next();
			expect(store.h).toBe(0);
			expect(store.v).toBe(0);
			expect(store.f).toBe(-1);
		});

		it('moves to next slide when current has no fragments', () => {
			setupSlides(store, [{ h: 0 }, { h: 1 }]);

			store.next();

			expect(store.h).toBe(1);
			expect(store.v).toBe(0);
			expect(store.f).toBe(-1);
		});

		it('reveals next fragment before changing slide', () => {
			setupSlides(store, [{ h: 0, fragments: 2 }, { h: 1 }]);

			store.next(); // Show fragment 0
			expect(store.f).toBe(0);
			expect(store.h).toBe(0);

			store.next(); // Show fragment 1
			expect(store.f).toBe(1);
			expect(store.h).toBe(0);

			store.next(); // Move to next slide
			expect(store.h).toBe(1);
			expect(store.f).toBe(-1);
		});

		it('moves through vertical slides before horizontal', () => {
			setupSlides(store, [{ h: 0, v: 0 }, { h: 0, v: 1 }, { h: 1 }]);

			store.next();
			expect(store.h).toBe(0);
			expect(store.v).toBe(1);

			store.next();
			expect(store.h).toBe(1);
			expect(store.v).toBe(0);
		});

		it('stays on last slide when at end', () => {
			setupSlides(store, [{ h: 0 }, { h: 1 }]);
			store.goTo(1);

			store.next();

			expect(store.h).toBe(1);
		});
	});

	describe('navigation - prev()', () => {
		it('does nothing when at first slide with no fragments', () => {
			setupSlides(store, [{ h: 0 }]);

			store.prev();

			expect(store.h).toBe(0);
			expect(store.v).toBe(0);
			expect(store.f).toBe(-1);
		});

		it('moves to previous slide', () => {
			setupSlides(store, [{ h: 0 }, { h: 1 }]);
			store.goTo(1);

			store.prev();

			expect(store.h).toBe(0);
		});

		it('hides last fragment before changing slide', () => {
			setupSlides(store, [{ h: 0 }, { h: 1, fragments: 2 }]);
			store.goTo(1, 0, 1); // At slide 1 with all fragments shown

			store.prev(); // Hide last fragment
			expect(store.f).toBe(0);
			expect(store.h).toBe(1);

			store.prev(); // Hide first fragment
			expect(store.f).toBe(-1);
			expect(store.h).toBe(1);

			store.prev(); // Move to previous slide
			expect(store.h).toBe(0);
		});

		it('shows all fragments when going to previous slide', () => {
			setupSlides(store, [{ h: 0, fragments: 3 }, { h: 1 }]);
			store.goTo(1);

			store.prev();

			expect(store.h).toBe(0);
			expect(store.f).toBe(2); // All 3 fragments shown (0, 1, 2)
		});

		it('goes to last vertical slide when moving back horizontally', () => {
			setupSlides(store, [{ h: 0, v: 0 }, { h: 0, v: 1 }, { h: 0, v: 2 }, { h: 1 }]);
			store.goTo(1);

			store.prev();

			expect(store.h).toBe(0);
			expect(store.v).toBe(2); // Last vertical of previous horizontal
		});
	});

	describe('navigation - goTo()', () => {
		it('navigates to specific position', () => {
			setupSlides(store, [{ h: 0 }, { h: 1 }, { h: 2 }]);

			store.goTo(2);

			expect(store.h).toBe(2);
			expect(store.v).toBe(0);
			expect(store.f).toBe(-1);
		});

		it('navigates to specific vertical position', () => {
			setupSlides(store, [
				{ h: 0, v: 0 },
				{ h: 0, v: 1 },
				{ h: 0, v: 2 }
			]);

			store.goTo(0, 2);

			expect(store.h).toBe(0);
			expect(store.v).toBe(2);
		});

		it('navigates to specific fragment', () => {
			setupSlides(store, [{ h: 0, fragments: 5 }]);

			store.goTo(0, 0, 3);

			expect(store.f).toBe(3);
		});

		it('clamps horizontal index to valid range', () => {
			setupSlides(store, [{ h: 0 }, { h: 1 }]);

			store.goTo(10);
			expect(store.h).toBe(1);

			store.goTo(-5);
			expect(store.h).toBe(0);
		});

		it('clamps vertical index to valid range', () => {
			setupSlides(store, [
				{ h: 0, v: 0 },
				{ h: 0, v: 1 }
			]);

			store.goTo(0, 10);
			expect(store.v).toBe(1);

			store.goTo(0, -5);
			expect(store.v).toBe(0);
		});

		it('clamps fragment index to valid range', () => {
			setupSlides(store, [{ h: 0, fragments: 3 }]);

			store.goTo(0, 0, 10);
			expect(store.f).toBe(2); // Max is fragmentCount - 1

			store.goTo(0, 0, -5);
			expect(store.f).toBe(-1); // Min is -1
		});
	});

	describe('2D navigation - horizontal', () => {
		beforeEach(() => {
			// Setup: 3 horizontal slides, middle one has vertical stack
			setupSlides(store, [{ h: 0 }, { h: 1, v: 0 }, { h: 1, v: 1 }, { h: 1, v: 2 }, { h: 2 }]);
		});

		it('nextH() moves to next horizontal slide', () => {
			store.nextH();

			expect(store.h).toBe(1);
			expect(store.v).toBe(0);
		});

		it('nextH() skips vertical slides and restores saved v position', () => {
			store.goTo(1, 2); // At h=1, v=2

			store.nextH();

			// Goes to h=2, v=0 (no previous memory for h=2)
			expect(store.h).toBe(2);
			expect(store.v).toBe(0);
		});

		it('nextH() resets fragment index', () => {
			setupSlides(store, [{ h: 0, fragments: 3 }, { h: 1 }]);
			store.goTo(0, 0, 2);

			store.nextH();

			expect(store.f).toBe(-1);
		});

		it('prevH() moves to previous horizontal slide', () => {
			store.goTo(2);

			store.prevH();

			expect(store.h).toBe(1);
			expect(store.v).toBe(0);
		});

		it('prevH() restores saved v position or defaults to v=0', () => {
			store.goTo(1, 2);

			store.prevH();

			// Goes to h=0, v=0 (no previous memory for h=0)
			expect(store.h).toBe(0);
			expect(store.v).toBe(0);
		});

		it('nextH() stays on last slide when at end', () => {
			store.goTo(2);

			store.nextH();

			expect(store.h).toBe(2);
		});

		it('prevH() stays on first slide when at beginning', () => {
			store.prevH();

			expect(store.h).toBe(0);
		});

		it('nextH() then prevH() returns to saved vertical position (like reveal.js)', () => {
			// Start at h=1, v=2
			store.goTo(1, 2);

			// Go right to h=2
			store.nextH();
			expect(store.h).toBe(2);
			expect(store.v).toBe(0);

			// Go back left to h=1 - should restore v=2
			store.prevH();
			expect(store.h).toBe(1);
			expect(store.v).toBe(2);
		});

		it('prevH() then nextH() returns to saved vertical position', () => {
			// Start at h=1, v=2
			store.goTo(1, 2);

			// Go left to h=0
			store.prevH();
			expect(store.h).toBe(0);
			expect(store.v).toBe(0);

			// Go back right to h=1 - should restore v=2
			store.nextH();
			expect(store.h).toBe(1);
			expect(store.v).toBe(2);
		});

		it('vertical memory clamps to valid range when stack size changes', () => {
			// Start at h=1, v=2
			store.goTo(1, 2);

			// Go right (saves v=2 for h=1)
			store.nextH();

			// Simulate stack shrinking by unregistering v=2
			store.unregisterSlide(1, 2);

			// Go back left - should clamp to max available v
			store.prevH();
			expect(store.h).toBe(1);
			expect(store.v).toBeLessThanOrEqual(1); // Clamped to available verticals
		});
	});

	describe('2D navigation - vertical', () => {
		beforeEach(() => {
			setupSlides(store, [
				{ h: 0, v: 0 },
				{ h: 0, v: 1 },
				{ h: 0, v: 2 }
			]);
		});

		it('nextV() moves to next vertical slide', () => {
			store.nextV();

			expect(store.v).toBe(1);
			expect(store.h).toBe(0);
		});

		it('nextV() resets fragment index', () => {
			store.registerSlide(createSlideInfo(0, 0, 3));
			store.goTo(0, 0, 2);

			store.nextV();

			expect(store.f).toBe(-1);
		});

		it('prevV() moves to previous vertical slide', () => {
			store.goTo(0, 2);

			store.prevV();

			expect(store.v).toBe(1);
		});

		it('nextV() stays on last vertical when at end', () => {
			store.goTo(0, 2);

			store.nextV();

			expect(store.v).toBe(2);
		});

		it('prevV() stays on first vertical when at beginning', () => {
			store.prevV();

			expect(store.v).toBe(0);
		});
	});

	describe('2D navigation - next() wrapping', () => {
		it('next() moves from last vertical to next horizontal', () => {
			setupSlides(store, [{ h: 0, v: 0 }, { h: 0, v: 1 }, { h: 0, v: 2 }, { h: 1 }]);
			store.goTo(0, 2); // At last vertical of h=0

			store.next();

			expect(store.h).toBe(1);
			expect(store.v).toBe(0);
		});

		it('next() processes fragments on all vertical slides', () => {
			setupSlides(store, [{ h: 0, v: 0, fragments: 1 }, { h: 0, v: 1, fragments: 1 }, { h: 1 }]);

			store.next(); // Fragment on v=0
			expect(store.h).toBe(0);
			expect(store.v).toBe(0);
			expect(store.f).toBe(0);

			store.next(); // Move to v=1
			expect(store.v).toBe(1);
			expect(store.f).toBe(-1);

			store.next(); // Fragment on v=1
			expect(store.v).toBe(1);
			expect(store.f).toBe(0);

			store.next(); // Move to h=1
			expect(store.h).toBe(1);
		});
	});

	describe('slide registration', () => {
		it('registerSlide() adds a slide', () => {
			store.registerSlide(createSlideInfo(0));

			// Verify via getSlide() - totalH uses $derived which may not update in Node tests
			expect(store.getSlide(0)).toBeDefined();
			expect(store.getSlide(0)?.h).toBe(0);
		});

		it('registerSlide() handles non-sequential horizontal indices', () => {
			store.registerSlide(createSlideInfo(2));
			store.registerSlide(createSlideInfo(0));
			store.registerSlide(createSlideInfo(1));

			// Verify all slides are accessible
			expect(store.getSlide(0)).toBeDefined();
			expect(store.getSlide(1)).toBeDefined();
			expect(store.getSlide(2)).toBeDefined();
		});

		it('registerSlide() handles vertical stacks', () => {
			store.registerSlide(createSlideInfo(0, 0));
			store.registerSlide(createSlideInfo(0, 1));
			store.registerSlide(createSlideInfo(0, 2));

			expect(store.getSlide(0, 0)).toBeDefined();
			expect(store.getSlide(0, 1)).toBeDefined();
			expect(store.getSlide(0, 2)).toBeDefined();
			// Verify no second horizontal slide exists
			expect(store.getSlide(1)).toBeUndefined();
		});

		it('unregisterSlide() removes a slide', () => {
			store.registerSlide(createSlideInfo(0));
			store.registerSlide(createSlideInfo(1));

			store.unregisterSlide(0);

			// Slide at h=0 should be removed, h=1 should still exist
			expect(store.getSlide(0)).toBeUndefined();
			expect(store.getSlide(1)).toBeDefined();
		});

		it('unregisterSlide() removes from vertical stack', () => {
			store.registerSlide(createSlideInfo(0, 0));
			store.registerSlide(createSlideInfo(0, 1));
			store.registerSlide(createSlideInfo(0, 2));

			store.unregisterSlide(0, 1);

			expect(store.getSlide(0, 0)).toBeDefined();
			expect(store.getSlide(0, 1)).toBeDefined(); // Was v=2, now shifted to v=1
			expect(store.getSlide(0, 2)).toBeUndefined();
		});

		it('unregisterSlide() clamps position when current slide removed', () => {
			setupSlides(store, [{ h: 0 }, { h: 1 }]);
			store.goTo(1);

			store.unregisterSlide(1);

			expect(store.h).toBe(0);
		});

		it('updateFragmentCount() updates fragment count for a slide', () => {
			store.registerSlide(createSlideInfo(0, 0, 0));

			store.updateFragmentCount(0, 0, 5);

			expect(store.getTotalFragments()).toBe(5);
		});

		it('updateFragmentCount() does nothing for non-existent slide', () => {
			// Should not throw
			expect(() => store.updateFragmentCount(99, 0, 5)).not.toThrow();
		});
	});

	describe('state - overview mode', () => {
		it('toggleOverview() toggles overview mode', () => {
			expect(store.overview).toBe(false);

			store.toggleOverview();
			expect(store.overview).toBe(true);

			store.toggleOverview();
			expect(store.overview).toBe(false);
		});

		it('setOverview() sets overview mode directly', () => {
			store.setOverview(true);
			expect(store.overview).toBe(true);

			store.setOverview(false);
			expect(store.overview).toBe(false);

			store.setOverview(true);
			expect(store.overview).toBe(true);
		});
	});

	describe('state - pause', () => {
		it('togglePause() toggles pause state', () => {
			expect(store.paused).toBe(false);

			store.togglePause();
			expect(store.paused).toBe(true);

			store.togglePause();
			expect(store.paused).toBe(false);
		});
	});

	describe('state - scale', () => {
		it('setScale() updates scale factor', () => {
			store.setScale(0.5);
			expect(store.scale).toBe(0.5);

			store.setScale(2);
			expect(store.scale).toBe(2);

			store.setScale(1);
			expect(store.scale).toBe(1);
		});
	});

	describe('getSlide() and getTotalFragments()', () => {
		it('getSlide() returns undefined for non-existent slide', () => {
			expect(store.getSlide(0)).toBeUndefined();
			expect(store.getSlide(99)).toBeUndefined();
		});

		it('getSlide() returns slide info', () => {
			const info = createSlideInfo(0, 0, 3);
			store.registerSlide(info);

			const slide = store.getSlide(0, 0);

			expect(slide).toBeDefined();
			expect(slide?.fragmentCount).toBe(3);
		});

		it('getTotalFragments() returns 0 when no current slide', () => {
			expect(store.getTotalFragments()).toBe(0);
		});

		it('getTotalFragments() returns fragment count of current slide', () => {
			store.registerSlide(createSlideInfo(0, 0, 5));
			store.registerSlide(createSlideInfo(1, 0, 3));

			expect(store.getTotalFragments()).toBe(5);

			store.goTo(1);
			expect(store.getTotalFragments()).toBe(3);
		});
	});

	describe('edge cases', () => {
		it('handles empty deck gracefully', () => {
			expect(() => {
				store.next();
				store.prev();
				store.nextH();
				store.prevH();
				store.nextV();
				store.prevV();
				store.goTo(0);
			}).not.toThrow();

			expect(store.h).toBe(0);
			expect(store.v).toBe(0);
		});

		it('handles single slide deck', () => {
			store.registerSlide(createSlideInfo(0));

			store.next();
			expect(store.h).toBe(0);

			store.prev();
			expect(store.h).toBe(0);
		});

		it('handles slide with many fragments', () => {
			store.registerSlide(createSlideInfo(0, 0, 100));

			for (let i = 0; i < 100; i++) {
				store.next();
				expect(store.f).toBe(i);
			}

			store.next(); // Should stay at last fragment (no more slides)
			expect(store.f).toBe(99);
		});
	});
});
