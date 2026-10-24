/**
 * Les 10 figures de la vitrine `/demo/geometrie` (galerie validée par David le
 * 2026-10-24, docs/wip/demo-debug-progress.md, PR 6f) : chacune se construit sans
 * erreur, pour qu'une évolution du moteur ne casse pas une figure en silence.
 */
import { describe, it, expect } from 'vitest';
import { runDsl } from '$lib/geometry-core/dsl';
import { DEMO_FIGURES, DEMO_SECTIONS } from '../figures';

type Pt = { x: number; y: number };

function numeric(p: unknown): Pt {
	const c = p as { x: { kind: string; value?: number }; y: { kind: string; value?: number } };
	expect(c.x.kind).toBe('numeric');
	return { x: c.x.value ?? NaN, y: c.y.value ?? NaN };
}

describe('DEMO_FIGURES', () => {
	it('range les 10 figures validées dans les trois sections', () => {
		expect(DEMO_SECTIONS.map((s) => s.title)).toEqual([
			'Au collège',
			'Au lycée',
			'Pour le plaisir'
		]);
		expect(DEMO_FIGURES.map((f) => f.title)).toEqual([
			"Droite d'Euler",
			'Symétries et rotation',
			'Homothétie variable',
			'Cercle par trois points',
			'Intégrale dynamique',
			'Aire entre deux courbes',
			"Lieu d'un milieu",
			'Flocon de Von Koch',
			'Épicycloïde',
			"Spirale d'Archimède"
		]);
		expect(DEMO_FIGURES.map((f) => f.section)).toEqual([
			'college',
			'college',
			'college',
			'college',
			'lycee',
			'lycee',
			'lycee',
			'plaisir',
			'plaisir',
			'plaisir'
		]);
	});

	it.each(DEMO_FIGURES.map((f) => [f.title, f] as const))(
		'construit « %s » sans erreur',
		(_title, figure) => {
			const result = runDsl(figure.dsl);
			expect(result.figure.getAllElements().length).toBeGreaterThan(0);
		}
	);

	it('calcule l’aire entre sin et cos en radians : 2√2 entre π/4 et 5π/4', () => {
		const aire = DEMO_FIGURES.find((f) => f.title === 'Aire entre deux courbes');
		const { figure, symbols } = runDsl(aire?.dsl ?? '');
		expect(figure.getScalarValue(symbols.get('E')?.figureId ?? '')).toBeCloseTo(2 * Math.SQRT2, 3);
	});

	it("trace une vraie épicycloïde : le point du petit cercle reste sur la courbe d'équation", () => {
		const epi = DEMO_FIGURES.find((f) => f.title === 'Épicycloïde');
		const { figure, symbols } = runDsl(epi?.dsl ?? '');
		const sliderId = symbols.get('t')?.figureId ?? '';
		const pointId = symbols.get('M')?.figureId ?? '';
		for (const s of [0.5, 2, 4.5]) {
			figure.moveSlider(sliderId, s);
			figure.recompute();
			const m = numeric(figure.getPosition(pointId));
			expect(m.x).toBeCloseTo(4 * Math.cos(s) - Math.cos(4 * s), 6);
			expect(m.y).toBeCloseTo(4 * Math.sin(s) - Math.sin(4 * s), 6);
		}
	});
});
