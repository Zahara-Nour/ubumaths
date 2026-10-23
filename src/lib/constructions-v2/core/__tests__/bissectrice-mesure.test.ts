/**
 * Voie `bissectrice @mesure` (rapporteur) : centre du rapporteur sur le
 * sommet, 0 sur le premier côté, on lit l'angle, on le divise par 2, on
 * marque un repère en face de la moitié, on trace la bissectrice à la règle.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import type { SubStep } from '../choreographies/types';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { PROTRACTOR_RADIUS } from '../../constants';

/** Charge le script et rend les sous-étapes chorégraphiées, dans l'ordre. */
function subSteps(lines: string[]): { exec: ConstructionExecutor; steps: SubStep[] } {
	const exec = new ConstructionExecutor();
	exec.load(lines.join('\n'));
	expect(exec.loadError).toBeNull();
	const steps = exec.plan.flatMap((e) => (e.subStep ? [e.subStep] : []));
	return { exec, steps };
}

function instructions(lines: string[]): (string | undefined)[] {
	return subSteps(lines).steps.map((s) => s.instruction);
}

/** Arrondi à 1e-9 : pas d’écriture scientifique dans le script. */
const round = (v: number) => Number(v.toFixed(9));

/** Angle AVB de `deg` degrés : A sur l'axe des abscisses, B tourné de `deg`. */
function angleScript(deg: number, extra = ''): string[] {
	const rad = (deg * Math.PI) / 180;
	return [
		'A = point(5, 0)',
		'V = point(0, 0)',
		`B = point(${round(5 * Math.cos(rad))}, ${round(5 * Math.sin(rad))})`,
		`d = bissectrice(A, V, B) @mesure ${extra}`.trim()
	];
}

/** Repère P créé par la chorégraphie (charnière). */
function repere(exec: ConstructionExecutor): string | undefined {
	return exec.lastChoreographyResult?.produced.charnieres[0];
}

describe('bissectrice @mesure — déroulé', () => {
	const script = angleScript(74);

	it('quatre sous-étapes : rapporteur, crayon, repère, tracé', () => {
		const { exec, steps } = subSteps(script);
		expect(exec.totalSteps).toBe(3 + 4);
		expect(steps.map((s) => s.kind)).toEqual([
			'compass-measure',
			'compass-measure',
			'point-fade-in',
			'ruler-trace'
		]);
	});

	it('le rapporteur se pose centre sur V, 0 sur [VA)', () => {
		const { steps } = subSteps(script);
		expect(steps[0].instrument).toBe('protractor');
		expect(steps[0].instrumentTarget?.x).toBeCloseTo(0);
		expect(steps[0].instrumentTarget?.y).toBeCloseTo(0);
		expect(steps[0].instrumentTarget?.rotation).toBeCloseTo(0);
		expect(steps[0].animatePointIds).toEqual([]);
		expect(steps[0].animateDrawableIds).toEqual([]);
	});

	it('le crayon va au bord du rapporteur, en face de 37°, le rapporteur reste', () => {
		const { steps } = subSteps(script);
		expect(steps[1].instrument).toBe('pencil');
		expect(steps[1].secondaryInstrument).toBe('protractor');
		const t = steps[1].instrumentTarget;
		const angle = (Math.atan2(t?.y ?? NaN, t?.x ?? NaN) * 180) / Math.PI;
		expect(angle).toBeCloseTo(37);
		expect(Math.hypot(t?.x ?? 0, t?.y ?? 0)).toBeGreaterThan(PROTRACTOR_RADIUS);
	});

	it('le repère apparaît à la troisième sous-étape, la règle trace ensuite', () => {
		const { exec, steps } = subSteps(script);
		exec.executeAll();
		const P = repere(exec);
		expect(P).toBeDefined();
		expect(steps[2].animatePointIds).toEqual([P]);
		expect(steps[3].instrument).toBe('ruler');
		expect(steps[3].secondaryInstrument).toBe('pencil');
	});

	it('consignes : lecture, calcul, repère, tracé', () => {
		expect(instructions(script)).toEqual([
			'On place le centre du rapporteur sur V, le 0 sur [VA), et on lit l’angle AVB = 74°',
			'74 ÷ 2 = 37 : on repère la graduation 37°',
			'On marque le repère P en face de 37°',
			'Règle de V à P : on trace la bissectrice'
		]);
	});

	it('le repère est sur la bissectrice exacte, hors du rapporteur', () => {
		const { exec } = subSteps(script);
		exec.executeAll();
		const P = repere(exec);
		const pos = P ? exec.figure.getPosition(P) : undefined;
		const x = pos ? geoToNumber(pos.x) : NaN;
		const y = pos ? geoToNumber(pos.y) : NaN;
		expect((Math.atan2(y, x) * 180) / Math.PI).toBeCloseTo(37);
		expect(Math.hypot(x, y)).toBeGreaterThan(PROTRACTOR_RADIUS);
	});
});

describe('bissectrice @mesure — côté du 0', () => {
	it('B dans le sens horaire de A : rapporteur retourné, 0 toujours sur [VA)', () => {
		const { steps } = subSteps(angleScript(-74));
		// Le corps du rapporteur est du côté trigonométrique de sa base :
		// base tournée de 180° pour que le corps couvre l'angle.
		expect(Math.abs(steps[0].instrumentTarget?.rotation ?? NaN)).toBeCloseTo(180);
		expect(steps[0].instruction).toBe(
			'On place le centre du rapporteur sur V, le 0 sur [VA), et on lit l’angle AVB = 74°'
		);
		const t = steps[1].instrumentTarget;
		expect((Math.atan2(t?.y ?? NaN, t?.x ?? NaN) * 180) / Math.PI).toBeCloseTo(-37);
	});

	it('premier côté oblique : la base du rapporteur suit [VA)', () => {
		const lines = [
			'A = point(3, 4)',
			'V = point(0, 0)',
			'B = point(-4, 3)',
			'd = bissectrice(A, V, B) @mesure'
		];
		const { steps } = subSteps(lines);
		expect(steps[0].instrumentTarget?.rotation).toBeCloseTo((Math.atan2(4, 3) * 180) / Math.PI);
		expect(steps[0].instruction).toBe(
			'On place le centre du rapporteur sur V, le 0 sur [VA), et on lit l’angle AVB = 90°'
		);
	});
});

describe('bissectrice @mesure — lecture arrondie au degré', () => {
	it('73,6° se lit 74°', () => {
		expect(instructions(angleScript(73.6)).slice(0, 2)).toEqual([
			'On place le centre du rapporteur sur V, le 0 sur [VA), et on lit l’angle AVB = 74°',
			'74 ÷ 2 = 37 : on repère la graduation 37°'
		]);
	});

	it('angle impair : moitié décimale, 75 ÷ 2 = 37,5', () => {
		expect(instructions(angleScript(75)).slice(1, 3)).toEqual([
			'75 ÷ 2 = 37,5 : on repère la graduation 37,5°',
			'On marque le repère P en face de 37,5°'
		]);
	});

	it('angle obtus : 170 ÷ 2 = 85', () => {
		const { exec, steps } = subSteps(angleScript(170));
		expect(steps[1].instruction).toBe('170 ÷ 2 = 85 : on repère la graduation 85°');
		exec.executeAll();
		const P = repere(exec);
		const pos = P ? exec.figure.getPosition(P) : undefined;
		const angle =
			(Math.atan2(pos ? geoToNumber(pos.y) : NaN, pos ? geoToNumber(pos.x) : NaN) * 180) / Math.PI;
		expect(angle).toBeCloseTo(85);
	});

	it('le repère reste sur la bissectrice exacte malgré l’arrondi', () => {
		const { exec } = subSteps(angleScript(73.6));
		exec.executeAll();
		const P = repere(exec);
		const pos = P ? exec.figure.getPosition(P) : undefined;
		const angle =
			(Math.atan2(pos ? geoToNumber(pos.y) : NaN, pos ? geoToNumber(pos.x) : NaN) * 180) / Math.PI;
		expect(angle).toBeCloseTo(36.8);
	});
});

describe('bissectrice @mesure — noms', () => {
	it('forme bissectrice(α) : mêmes gestes', () => {
		const lines = [
			'A = point(5, 0)',
			'V = point(0, 0)',
			'B = point(0, 5)',
			'α = angle(A, V, B)',
			'd = bissectrice(α) @mesure'
		];
		expect(instructions(lines)[0]).toBe(
			'On place le centre du rapporteur sur V, le 0 sur [VA), et on lit l’angle AVB = 90°'
		);
	});

	it('sommet sans nom affiché : tournures neutres', () => {
		const lines = [
			'A = point(5, 0)',
			'V = point(0, 0)',
			'B = point(0, 5)',
			'masque(V)',
			'd = bissectrice(A, V, B) @mesure'
		];
		const texts = instructions(lines);
		expect(texts[0]).toBe(
			'On place le centre du rapporteur sur le sommet, le 0 sur le premier côté, et on lit l’angle : 90°'
		);
		expect(texts[3]).toBe('Règle du sommet à P : on trace la bissectrice');
	});

	it('lettre P déjà prise : le repère devient P′', () => {
		const lines = ['P = point(-3, -3)', ...angleScript(74)];
		expect(instructions(lines).slice(2)).toEqual([
			'On marque le repère P′ en face de 37°',
			'Règle de V à P′ : on trace la bissectrice'
		]);
	});
});

describe('bissectrice @mesure — codage des angles égaux', () => {
	function marks(exec: ConstructionExecutor) {
		const tags = exec.lastChoreographyResult?.produced.traceTags ?? new Map();
		return [...tags.entries()].filter(([, t]) => t === 'marker').map(([id]) => id);
	}

	/** Angle de 74° aux deux côtés tracés : le codage porte sur eux. */
	const withSides = (extra = '') => {
		const lines = angleScript(74, extra);
		return [...lines.slice(0, 3), 'c1 = demidroite(V, A)', 'c2 = demidroite(V, B)', lines[3]];
	};

	it('deux angles marqués pareil, étiquetés « marqueur »', () => {
		const { exec } = subSteps(withSides('@complet'));
		exec.executeAll();
		const ids = marks(exec);
		expect(ids).toHaveLength(2);
		const els = ids.map((id) => exec.figure.getElementById(id));
		expect(els.every((el) => el?.type === 'angle')).toBe(true);
		const marques = els.map((el) => (el?.type === 'angle' ? el.marque : undefined));
		expect(marques[0]).toBe(marques[1]);
	});

	it('@complet : codage visible en fin de lecture', () => {
		const { exec } = subSteps(withSides('@complet'));
		exec.executeAll();
		exec.step();
		const ids = marks(exec);
		expect(ids).toHaveLength(2);
		for (const id of ids) {
			const el = exec.figure.getElementById(id);
			expect(el).toBeDefined();
			expect(el?.visible).not.toBe(false);
		}
	});

	it('@squelette : codage caché', () => {
		const { exec } = subSteps(withSides());
		exec.executeAll();
		exec.step();
		const ids = marks(exec);
		expect(ids).toHaveLength(2);
		for (const id of ids) expect(exec.figure.getElementById(id)?.visible).toBe(false);
	});

	it('@complet -marqueurs : codage caché', () => {
		const { exec } = subSteps(withSides('@complet -marqueurs'));
		exec.executeAll();
		exec.step();
		const ids = marks(exec);
		expect(ids).toHaveLength(2);
		for (const id of ids) {
			const el = exec.figure.getElementById(id);
			expect(el).toBeDefined();
			expect(el?.visible).toBe(false);
		}
	});
});

describe('bissectrice @mesure — codage seulement sur des côtés tracés', () => {
	function markCount(lines: string[]): number {
		const exec = new ConstructionExecutor();
		exec.load(lines.join('\n'));
		exec.executeAll();
		const tags = exec.lastChoreographyResult?.produced.traceTags ?? new Map();
		return [...tags.values()].filter((t) => t === 'marker').length;
	}
	const points = angleScript(74).slice(0, 3);
	const call = 'd = bissectrice(A, V, B) @mesure @complet';

	it('aucun côté tracé : aucun codage, même en @complet', () => {
		expect(markCount([...points, call])).toBe(0);
	});

	it('un seul côté tracé : aucun codage', () => {
		expect(markCount([...points, 'c1 = demidroite(V, A)', call])).toBe(0);
	});

	it('côtés en segments, dans un sens ou l’autre : codage', () => {
		expect(markCount([...points, 's1 = segment(A, V)', 's2 = segment(V, B)', call])).toBe(2);
	});

	it('côtés en droites : codage', () => {
		expect(markCount([...points, 'd1 = droite(V, A)', 'd2 = droite(B, V)', call])).toBe(2);
	});

	it('demi-droite d’origine A (ne porte pas [VA)) : aucun codage', () => {
		expect(markCount([...points, 'c1 = demidroite(A, V)', 'c2 = demidroite(V, B)', call])).toBe(0);
	});

	it('côté masqué : aucun codage', () => {
		expect(
			markCount([...points, 'c1 = demidroite(V, A)', 'c2 = demidroite(V, B)', 'masque(c1)', call])
		).toBe(0);
	});
});

describe('bissectrice @mesure — erreurs', () => {
	function loadError(lines: string[]): string | undefined {
		const exec = new ConstructionExecutor();
		exec.load(lines.join('\n'));
		return exec.loadError?.message;
	}

	it('A confondu avec le sommet : refusé par le builtin', () => {
		expect(
			loadError([
				'A = point(0, 0)',
				'V = point(0, 0)',
				'B = point(0, 5)',
				'd = bissectrice(A, V, B) @mesure'
			])
		).toMatch(/`A` ou `B` est confondu avec `V`/);
	});

	it('côtés confondus : le rapporteur lit 0°', () => {
		expect(
			loadError([
				'A = point(5, 0)',
				'V = point(0, 0)',
				'B = point(3, 0.01)',
				'd = bissectrice(A, V, B) @mesure'
			])
		).toMatch(/Les deux côtés sont confondus : il n'y a pas d'angle à mesurer/);
	});

	it('angle plat : refusé par le builtin (bissectrice indéterminée)', () => {
		expect(loadError(angleScript(180))).toMatch(/alignés et opposés/);
	});

	it('@equerre sur bissectrice : contrainte non disponible', () => {
		expect(
			loadError([
				'A = point(5, 0)',
				'V = point(0, 0)',
				'B = point(0, 5)',
				'd = bissectrice(A, V, B) @equerre'
			])
		).toMatch(/non disponible/i);
	});
});
