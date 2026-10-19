/**
 * BANC (pas un test) : 40 crans du curseur `a` sur la figure de 24 objets, en node.
 * Sauté sauf demande : `VITE_ATELIER_BANC=1 pnpm exec vitest run --project=server
 * src/lib/atelier/__tests__/banc-curseur.test.ts` — médiane, p90, max sur la sortie.
 * Journal des mesures : docs/archive/wip/atelier-geometrie-progress.md, § Performance.
 */
import { it, expect } from 'vitest';
import { figure24 } from './fixtures/figure-24';

function stats(times: number[]): string {
	const sorted = [...times].sort((x, y) => x - y);
	const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
	return `médiane ${at(0.5).toFixed(2)} ms · p90 ${at(0.9).toFixed(2)} ms · max ${sorted[sorted.length - 1].toFixed(2)} ms`;
}

it.skipIf(!import.meta.env.VITE_ATELIER_BANC)('banc node : 40 crans de slideTo', () => {
	const atelier = figure24();
	atelier.setSlider('a', { min: 0, max: 1, step: 0.01 });
	for (let i = 0; i < 5; i++) atelier.slideTo('a', 0.2 + i * 0.01);
	const times: number[] = [];
	for (let i = 0; i < 40; i++) {
		const start = performance.now();
		atelier.slideTo('a', 0.3 + i * 0.01);
		times.push(performance.now() - start);
	}
	process.stdout.write(`\nslideTo (recomputeAll) ${stats(times)}\n`);
	expect(atelier.get('M')?.status).toBe('ok');
});
