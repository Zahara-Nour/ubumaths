/**
 * BANC (pas un test) : 40 mouvements du point A glissé à la souris (géométrie
 * lot 3, M1 : objectif < 16 ms), `AtelierContainer` entier sur la vue
 * Géométrie, figure de 24 objets, Chromium. A est le cas le pire : tout en
 * dépend, et changer sa définition REFAIT la figure. Sauté sauf demande :
 * `VITE_ATELIER_BANC=1 pnpm exec vitest run --project=client
 * src/lib/components/atelier/__tests__/banc-glisser.svelte.test.ts` ; le résultat est
 * écrit dans `.svelte-kit/atelier-banc-glisser.txt`.
 *
 * Un mouvement = `dragPoint` (le modèle) + `flushSync()` (effets : `syncFigure`,
 * cartes) + une mise en page forcée. La peinture n'est pas comptée.
 */
import { it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { commands, server } from 'vitest/browser';
import { flushSync } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { figure24 } from '$lib/atelier/__tests__/fixtures/figure-24';

function stats(times: number[]): string {
	const sorted = [...times].sort((x, y) => x - y);
	const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
	return `médiane ${at(0.5).toFixed(1)} ms · p90 ${at(0.9).toFixed(1)} ms · max ${sorted[sorted.length - 1].toFixed(1)} ms`;
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

it.skipIf(!import.meta.env.VITE_ATELIER_BANC)(
	'banc navigateur : 40 mouvements de A, rendu compris',
	async () => {
		const atelier = figure24();
		await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'figure',
			consoleAtStart: false
		});
		await frame();
		for (let i = 0; i < 5; i++) {
			atelier.dragPoint('A', 0.1 * i, 0);
			flushSync();
			await frame();
		}
		const model: number[] = [];
		const total: number[] = [];
		for (let i = 0; i < 40; i++) {
			const start = performance.now();
			atelier.dragPoint('A', 0.5 + 0.1 * i, 0.05 * i);
			model.push(performance.now() - start);
			flushSync();
			void document.body.offsetHeight;
			total.push(performance.now() - start);
			await frame();
		}
		await commands.writeFile(
			`${server.config.root}/.svelte-kit/atelier-banc-glisser.txt`,
			`modèle (dragPoint) ${stats(model)}\ntotal (modèle + effets + mise en page) ${stats(total)}\n`
		);
		atelier.endGesture();
		expect(atelier.get('M')?.status).toBe('ok');
	}
);
