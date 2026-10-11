/**
 * Un indice dont l'adresse est un lien `javascript:` ne pose pas ce lien.
 *
 * `HintReference` posait `href={hint.url}` brut, alors que les liens du contenu
 * passent par `sanitizeUrl` (audit 2026-10-10, hors diff de la PR #1025).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HintReference from '../HintReference.svelte';
import type { ExerciseHint } from '$lib/exercises/types';

let screens: Awaited<ReturnType<typeof render>>[] = [];
afterEach(async () => {
	for (const s of screens) await s.unmount();
	screens = [];
});

async function hrefsOf(hint: ExerciseHint): Promise<string[]> {
	const screen = await render(HintReference, { props: { hintId: hint.id, hints: [hint] } });
	screens.push(screen);
	await screen.getByRole('button').click();
	await expect.poll(() => document.querySelectorAll('[data-popover-content] a').length).toBe(1);
	return [...document.querySelectorAll('[data-popover-content] a')].map(
		(a) => a.getAttribute('href') ?? ''
	);
}

describe('indice : lien dangereux', () => {
	for (const type of ['link', 'pdf', 'geogebra', 'video'] as const) {
		it(`${type} : un lien javascript: est neutralisé`, async () => {
			expect(
				await hrefsOf({ id: 'i1', type, title: 'Indice', url: 'javascript:alert(1)' })
			).toEqual(['#']);
		});
	}

	it('video youtube sans identifiant : le lien de repli est neutralisé aussi', async () => {
		expect(
			await hrefsOf({
				id: 'i1',
				type: 'video',
				title: 'Indice',
				url: 'javascript:alert(1)//youtube.com'
			})
		).toEqual(['#']);
	});

	it('un lien https reste intact', async () => {
		expect(
			await hrefsOf({ id: 'i1', type: 'link', title: 'Indice', url: 'https://chiph.re/cours' })
		).toEqual(['https://chiph.re/cours']);
	});
});
