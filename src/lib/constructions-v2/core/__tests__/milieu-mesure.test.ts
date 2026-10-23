/**
 * Voie `milieu @mesure` (règle graduée) : on pose le 0 de la règle sur une
 * extrémité, on lit la longueur, on la divise par 2, on marque le milieu.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import type { SubStep } from '../choreographies/types';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';

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

describe('milieu @mesure — déroulé', () => {
	const script = ['A = point(0, 0)', 'B = point(6.4, 0)', 'I = milieu(A, B) @mesure'];

	it('trois sous-étapes : pose de la règle, crayon à la graduation, I apparaît', () => {
		const { exec, steps } = subSteps(script);
		expect(exec.totalSteps).toBe(2 + 3);
		expect(steps.map((s) => s.kind)).toEqual([
			'compass-measure',
			'compass-measure',
			'point-fade-in'
		]);
	});

	it('la règle se pose le long de [AB], son 0 sur A', () => {
		const { steps } = subSteps(script);
		expect(steps[0].instrument).toBe('ruler');
		expect(steps[0].instrumentTarget).toEqual({ x: 0, y: 0, rotation: 0 });
		expect(steps[0].animatePointIds).toEqual([]);
	});

	it('le crayon va à la graduation 3,2, la règle reste visible', () => {
		const { steps } = subSteps(script);
		expect(steps[1].instrument).toBe('pencil');
		expect(steps[1].secondaryInstrument).toBe('ruler');
		expect(steps[1].instrumentTarget?.x).toBeCloseTo(3.2);
		expect(steps[1].instrumentTarget?.y).toBeCloseTo(0);
	});

	it('I apparaît à la dernière sous-étape', () => {
		const { exec, steps } = subSteps(script);
		exec.executeAll();
		const I = exec.symbols.get('I')?.figureId;
		expect(I).toBeDefined();
		expect(steps[2].animatePointIds).toEqual([I]);
		expect(steps[0].animatePointIds).not.toContain(I);
	});

	it('consignes : lecture, calcul, point marqué', () => {
		expect(instructions(script)).toEqual([
			'On place le 0 de la règle sur A et on lit AB = 6,4 cm',
			'6,4 ÷ 2 = 3,2 : on repère la graduation 3,2',
			'On marque I à 3,2 cm de A'
		]);
	});

	it('I est au milieu exact', () => {
		const { exec } = subSteps(script);
		exec.executeAll();
		const I = exec.symbols.get('I')?.figureId;
		const pos = I ? exec.figure.getPosition(I) : undefined;
		expect(pos ? geoToNumber(pos.x) : NaN).toBeCloseTo(3.2);
		expect(pos ? geoToNumber(pos.y) : NaN).toBeCloseTo(0);
	});
});

describe('milieu @mesure — sens de lecture', () => {
	it('B à gauche de A : le 0 se pose sur B', () => {
		const lines = ['A = point(6.4, 0)', 'B = point(0, 0)', 'I = milieu(A, B) @mesure'];
		const { steps } = subSteps(lines);
		expect(steps[0].instrumentTarget).toEqual({ x: 0, y: 0, rotation: 0 });
		expect(steps.map((s) => s.instruction)).toEqual([
			'On place le 0 de la règle sur B et on lit AB = 6,4 cm',
			'6,4 ÷ 2 = 3,2 : on repère la graduation 3,2',
			'On marque I à 3,2 cm de B'
		]);
	});

	it('segment vertical : le 0 se pose sur le point le plus bas', () => {
		const lines = ['A = point(0, 5)', 'B = point(0, 0)', 'I = milieu(A, B) @mesure'];
		const { steps } = subSteps(lines);
		expect(steps[0].instrumentTarget?.x).toBeCloseTo(0);
		expect(steps[0].instrumentTarget?.y).toBeCloseTo(0);
		expect(steps[0].instrumentTarget?.rotation).toBeCloseTo(90);
		expect(steps[0].instruction).toBe('On place le 0 de la règle sur B et on lit AB = 5 cm');
	});

	it('segment oblique : la règle suit la direction de [AB]', () => {
		const lines = ['A = point(0, 0)', 'B = point(3, 4)', 'I = milieu(A, B) @mesure'];
		const { steps } = subSteps(lines);
		expect(steps[0].instrumentTarget?.rotation).toBeCloseTo((Math.atan2(4, 3) * 180) / Math.PI);
		expect(steps[1].instrumentTarget?.x).toBeCloseTo(1.5);
		expect(steps[1].instrumentTarget?.y).toBeCloseTo(2);
	});
});

describe('milieu @mesure — lecture arrondie au millimètre', () => {
	const at = (x: number) =>
		instructions(['A = point(0, 0)', `B = point(${x}, 0)`, 'I = milieu(A, B) @mesure']);

	it('6,37 se lit 6,4', () => {
		expect(at(6.37)).toEqual([
			'On place le 0 de la règle sur A et on lit AB = 6,4 cm',
			'6,4 ÷ 2 = 3,2 : on repère la graduation 3,2',
			'On marque I à 3,2 cm de A'
		]);
	});

	it('la moitié se calcule sur la valeur lue : 6,3 ÷ 2 = 3,15', () => {
		expect(at(6.3).slice(1)).toEqual([
			'6,3 ÷ 2 = 3,15 : on repère la graduation 3,15',
			'On marque I à 3,15 cm de A'
		]);
	});

	it('6,35 se lit 6,4 (pas 6,3 par l’écriture binaire)', () => {
		expect(at(6.35)[0]).toBe('On place le 0 de la règle sur A et on lit AB = 6,4 cm');
	});

	it('valeur entière sans « ,0 »', () => {
		expect(at(6)).toEqual([
			'On place le 0 de la règle sur A et on lit AB = 6 cm',
			'6 ÷ 2 = 3 : on repère la graduation 3',
			'On marque I à 3 cm de A'
		]);
	});

	it('I reste au milieu exact malgré l’arrondi de la lecture', () => {
		const { exec } = subSteps([
			'A = point(0, 0)',
			'B = point(6.37, 0)',
			'I = milieu(A, B) @mesure'
		]);
		exec.executeAll();
		const I = exec.symbols.get('I')?.figureId;
		const pos = I ? exec.figure.getPosition(I) : undefined;
		expect(pos ? geoToNumber(pos.x) : NaN).toBeCloseTo(3.185);
	});
});

describe('milieu @mesure — forme milieu(s)', () => {
	it('milieu d’un segment : mêmes gestes, extrémités du segment', () => {
		const lines = [
			'A = point(0, 0)',
			'B = point(6.4, 0)',
			's = segment(A, B)',
			'I = milieu(s) @mesure'
		];
		expect(instructions(lines)).toEqual([
			'On place le 0 de la règle sur A et on lit AB = 6,4 cm',
			'6,4 ÷ 2 = 3,2 : on repère la graduation 3,2',
			'On marque I à 3,2 cm de A'
		]);
	});
});

describe('milieu @mesure — codage AI = IB', () => {
	const script = (vis: string) => [
		'A = point(0, 0)',
		'B = point(6.4, 0)',
		`I = milieu(A, B) @mesure ${vis}`.trim()
	];

	function marks(exec: ConstructionExecutor) {
		const result = exec.lastChoreographyResult;
		const tags = result?.produced.traceTags ?? new Map();
		return [...tags.entries()].filter(([, t]) => t === 'marker').map(([id]) => id);
	}

	it('deux marques égales, étiquetées « marqueur »', () => {
		const { exec } = subSteps(script('@complet'));
		exec.executeAll();
		const ids = marks(exec);
		expect(ids).toHaveLength(2);
		const els = ids.map((id) => exec.figure.getElementById(id));
		expect(els.every((el) => el?.type === 'segmentMark')).toBe(true);
	});

	it('@complet : codage visible en fin de lecture', () => {
		const { exec } = subSteps(script('@complet'));
		exec.executeAll();
		exec.step();
		for (const id of marks(exec)) expect(exec.figure.getElementById(id)?.visible).not.toBe(false);
	});

	it('@squelette : codage caché', () => {
		const { exec } = subSteps(script(''));
		exec.executeAll();
		exec.step();
		const ids = marks(exec);
		expect(ids).toHaveLength(2);
		for (const id of ids) expect(exec.figure.getElementById(id)?.visible).toBe(false);
	});

	it('@complet -marqueurs : codage caché', () => {
		const { exec } = subSteps(script('@complet -marqueurs'));
		exec.executeAll();
		exec.step();
		for (const id of marks(exec)) expect(exec.figure.getElementById(id)?.visible).toBe(false);
	});
});

describe('milieu @mesure — erreurs', () => {
	function loadError(lines: string[]): string | undefined {
		const exec = new ConstructionExecutor();
		exec.load(lines.join('\n'));
		return exec.loadError?.message;
	}

	it('A et B confondus', () => {
		expect(loadError(['A = point(2, 1)', 'B = point(2, 1)', 'I = milieu(A, B) @mesure'])).toMatch(
			/A et B sont confondus : il n'y a pas de longueur à mesurer/
		);
	});

	it('segment plus long que la règle', () => {
		expect(
			loadError(['A = point(0, 0)', 'B = point(17.2, 0)', 'I = milieu(A, B) @mesure'])
		).toMatch(/AB = 17,2 cm : trop long pour la règle de 15 cm, rapprochez les points/);
	});

	it('moins d’un demi-millimètre : la règle lit 0, points tenus pour confondus', () => {
		expect(
			loadError(['A = point(0, 0)', 'B = point(0.04, 0)', 'I = milieu(A, B) @mesure'])
		).toMatch(/A et B sont confondus/);
	});

	it('15,04 cm se lit 15 cm : accepté, comme la valeur lue', () => {
		expect(
			loadError(['A = point(0, 0)', 'B = point(15.04, 0)', 'I = milieu(A, B) @mesure'])
		).toBeUndefined();
	});

	it('exactement 15 cm : accepté', () => {
		expect(
			loadError(['A = point(0, 0)', 'B = point(15, 0)', 'I = milieu(A, B) @mesure'])
		).toBeUndefined();
	});

	it('@euclide sur milieu : contrainte non disponible', () => {
		expect(loadError(['A = point(0, 0)', 'B = point(4, 0)', 'I = milieu(A, B) @euclide'])).toMatch(
			/non disponible/i
		);
	});
});
