/**
 * BANC (pas un test) : 40 crans du curseur `a`, `AtelierContainer` entier sur la
 * vue Géométrie, figure de 24 objets, Chromium. Sauté sauf demande :
 * `VITE_ATELIER_BANC=1 pnpm exec vitest run --project=client
 * src/lib/components/atelier/__tests__/banc-curseur.svelte.test.ts` ; le résultat est
 * écrit dans `.svelte-kit/atelier-banc.txt` (la console d'un test qui passe est muette).
 *
 * Un cran = `slideTo` (le modèle) + `flushSync()` (effets : `syncFigure`, `syncPlots`,
 * cartes) + une mise en page forcée. Le dessin à l'écran (peinture) n'est pas compté.
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
	'banc navigateur : 40 crans, rendu compris',
	async () => {
		const atelier = figure24();
		atelier.setSlider('a', { min: 0, max: 1, step: 0.01 });
		await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'figure',
			consoleAtStart: false
		});
		await frame();
		for (let i = 0; i < 5; i++) {
			atelier.slideTo('a', 0.2 + i * 0.01);
			flushSync();
			await frame();
		}
		const model: number[] = [];
		const total: number[] = [];
		for (let i = 0; i < 40; i++) {
			const start = performance.now();
			atelier.slideTo('a', 0.3 + i * 0.01);
			model.push(performance.now() - start);
			flushSync();
			void document.body.offsetHeight;
			total.push(performance.now() - start);
			await frame();
		}
		await commands.writeFile(
			`${server.config.root}/.svelte-kit/atelier-banc.txt`,
			`modèle (slideTo) ${stats(model)}\ntotal (modèle + effets + mise en page) ${stats(total)}\n`
		);
		expect(atelier.get('M')?.status).toBe('ok');
	}
);
