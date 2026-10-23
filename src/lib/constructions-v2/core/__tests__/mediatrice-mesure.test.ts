/**
 * Voie `mediatrice @mesure` (règle graduée + équerre) : on mesure [AB], on
 * marque le milieu I, on pose l'équerre sur (AB) le coin sur I, on trace la
 * perpendiculaire puis on la prolonge à la règle.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import type { SubStep } from '../choreographies/types';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { isSegment } from '$lib/geometry-core/types/elements';
import { numeric } from '$lib/geometry-core/types/geo-value';

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

function position(exec: ConstructionExecutor, id: string | undefined): { x: number; y: number } {
	const pos = id ? exec.figure.getPosition(id) : undefined;
	return { x: pos ? geoToNumber(pos.x) : NaN, y: pos ? geoToNumber(pos.y) : NaN };
}

/** Extrémités du segment tracé par la sous-étape `step`, figure exécutée. */
function tracedEnds(exec: ConstructionExecutor, step: SubStep) {
	exec.executeAll();
	return segmentEnds(exec, step);
}

/** Extrémités du segment tracé par `step`, sur la figure telle qu'elle est. */
function segmentEnds(exec: ConstructionExecutor, step: SubStep) {
	const el = exec.figure.getElementById(step.animateDrawableIds[0]);
	if (!el || !isSegment(el)) throw new Error('pas de segment tracé');
	return { start: position(exec, el.startId), end: position(exec, el.endId) };
}

function loadError(lines: string[]): string | undefined {
	const exec = new ConstructionExecutor();
	exec.load(lines.join('\n'));
	return exec.loadError?.message;
}

const SCRIPT = ['A = point(0, 0)', 'B = point(6.4, 0)', 'd = mediatrice(A, B) @mesure'];

describe('mediatrice @mesure — déroulé', () => {
	it('sept sous-étapes : mesure, graduation, milieu, équerre, tracé, règle, prolongement', () => {
		const { exec, steps } = subSteps(SCRIPT);
		expect(exec.totalSteps).toBe(2 + 7);
		expect(steps.map((s) => s.kind)).toEqual([
			'compass-measure',
			'compass-measure',
			'point-fade-in',
			'compass-measure',
			'ruler-trace',
			'compass-measure',
			'ruler-trace'
		]);
	});

	it('consignes : lecture, calcul, milieu, équerre, tracé, règle, prolongement', () => {
		expect(instructions(SCRIPT)).toEqual([
			'On place le 0 de la règle sur A et on lit AB = 6,4 cm',
			'6,4 ÷ 2 = 3,2 : on repère la graduation 3,2',
			'On marque le milieu I à 3,2 cm de A',
			"On pose l'équerre avec son bord sur (AB), le coin sur I",
			"Le long du bord de l'équerre, on trace la perpendiculaire à (AB) en I",
			"On retire l'équerre et on pose la règle le long de la portion tracée",
			'On prolonge le tracé le long de la règle : c’est la médiatrice de [AB]'
		]);
	});

	it('instruments : règle, crayon sur la règle, équerre, équerre + crayon, règle, règle + crayon', () => {
		const { steps } = subSteps(SCRIPT);
		expect(steps.map((s) => [s.instrument, s.secondaryInstrument])).toEqual([
			['ruler', undefined],
			['pencil', 'ruler'],
			[undefined, undefined],
			['setSquare', undefined],
			['setSquare', 'pencil'],
			['ruler', undefined],
			['ruler', 'pencil']
		]);
	});

	it('la règle se pose 0 sur A, le crayon va à la graduation 3,2', () => {
		const { steps } = subSteps(SCRIPT);
		expect(steps[0].instrumentTarget).toEqual({ x: 0, y: 0, rotation: 0 });
		expect(steps[1].instrumentTarget?.x).toBeCloseTo(3.2);
		expect(steps[1].instrumentTarget?.y).toBeCloseTo(0);
	});

	it('le milieu I est un point auxiliaire, au milieu exact, révélé en SS3', () => {
		const { exec, steps } = subSteps(SCRIPT);
		exec.executeAll();
		const [I] = steps[2].animatePointIds;
		expect(I).toBeDefined();
		expect(exec.figure.getElementById(I)?.label).toBe('I');
		const pos = position(exec, I);
		expect(pos.x).toBeCloseTo(3.2);
		expect(pos.y).toBeCloseTo(0);
		for (const s of steps.slice(0, 2)) expect(s.animatePointIds).not.toContain(I);
	});

	it('l’équerre se pose directement sur I, bord le long de (AB), sans glissement', () => {
		const { steps } = subSteps(SCRIPT);
		const target = steps[3].instrumentTarget;
		expect(target?.x).toBeCloseTo(3.2);
		expect(target?.y).toBeCloseTo(0);
		expect(target?.rotation).toBeCloseTo(0);
		expect(steps[4].instrumentTarget).toEqual(target);
	});

	it('la portion tracée à l’équerre part de I vers le haut, le prolongement vers le bas', () => {
		const { exec, steps } = subSteps(SCRIPT);
		const up = tracedEnds(exec, steps[4]);
		expect(up.start.x).toBeCloseTo(3.2);
		expect(up.start.y).toBeCloseTo(0);
		expect(up.end.x).toBeCloseTo(3.2);
		expect(up.end.y).toBeGreaterThan(1);
		const down = tracedEnds(exec, steps[6]);
		expect(down.start.x).toBeCloseTo(3.2);
		expect(down.end.x).toBeCloseTo(3.2);
		expect(down.end.y).toBeLessThan(-1);
	});

	it('la règle remplace l’équerre, alignée sur la perpendiculaire, vers le bas', () => {
		const { steps } = subSteps(SCRIPT);
		expect(steps[5].instrumentTarget?.x).toBeCloseTo(3.2);
		expect(steps[5].instrumentTarget?.rotation).toBeCloseTo(-90);
		expect(steps[6].instrumentTarget).toEqual(steps[5].instrumentTarget);
	});

	it('la médiatrice est visible à la fin, caché avant le prolongement', () => {
		const { exec } = subSteps(SCRIPT);
		exec.executeAll();
		exec.step();
		const d = exec.symbols.get('d')?.figureId;
		expect(d).toBeDefined();
		expect(exec.figure.getElementById(d ?? '')?.visible).not.toBe(false);
	});
});

describe('mediatrice @mesure — orientation', () => {
	it('B à gauche de A : 0 sur B, équerre toujours au-dessus', () => {
		const { exec, steps } = subSteps([
			'A = point(6.4, 0)',
			'B = point(0, 0)',
			'd = mediatrice(A, B) @mesure'
		]);
		expect(steps.slice(0, 3).map((s) => s.instruction)).toEqual([
			'On place le 0 de la règle sur B et on lit AB = 6,4 cm',
			'6,4 ÷ 2 = 3,2 : on repère la graduation 3,2',
			'On marque le milieu I à 3,2 cm de B'
		]);
		expect(steps[3].instrumentTarget?.rotation).toBeCloseTo(0);
		expect(tracedEnds(exec, steps[4]).end.y).toBeGreaterThan(1);
	});

	it('segment vertical : 0 sur le point le plus bas, portion tracée vers la gauche', () => {
		const { exec, steps } = subSteps([
			'A = point(0, 5)',
			'B = point(0, 0)',
			'd = mediatrice(A, B) @mesure'
		]);
		expect(steps[0].instrumentTarget?.rotation).toBeCloseTo(90);
		expect(steps[3].instrumentTarget?.x).toBeCloseTo(0);
		expect(steps[3].instrumentTarget?.y).toBeCloseTo(2.5);
		expect(steps[3].instrumentTarget?.rotation).toBeCloseTo(90);
		const up = tracedEnds(exec, steps[4]);
		expect(up.end.x).toBeLessThan(-1);
		expect(up.end.y).toBeCloseTo(2.5);
	});

	it('lecture arrondie au millimètre, milieu exact : 6,37 → 6,4 ÷ 2 = 3,2', () => {
		const { exec, steps } = subSteps([
			'A = point(0, 0)',
			'B = point(6.37, 0)',
			'd = mediatrice(A, B) @mesure'
		]);
		expect(steps[1].instruction).toBe('6,4 ÷ 2 = 3,2 : on repère la graduation 3,2');
		exec.executeAll();
		expect(position(exec, steps[2].animatePointIds[0]).x).toBeCloseTo(3.185);
	});
});

describe('mediatrice @mesure — noms', () => {
	it('lettre I déjà prise par le script : le milieu s’appelle I′', () => {
		const lines = [
			'A = point(0, 0)',
			'B = point(6.4, 0)',
			'I = point(9, 9)',
			'd = mediatrice(A, B) @mesure'
		];
		expect(instructions(lines).slice(2, 5)).toEqual([
			'On marque le milieu I′ à 3,2 cm de A',
			"On pose l'équerre avec son bord sur (AB), le coin sur I′",
			"Le long du bord de l'équerre, on trace la perpendiculaire à (AB) en I′"
		]);
	});
});

describe('mediatrice @mesure — milieu déjà construit', () => {
	const lines = [
		'A = point(0, 0)',
		'B = point(6.4, 0)',
		'M = milieu(A, B)',
		'd = mediatrice(A, B) @mesure'
	];

	it('pas de mesure : on part de l’équerre posée sur M', () => {
		expect(instructions(lines)).toEqual([
			"On pose l'équerre avec son bord sur (AB), le coin sur M",
			"Le long du bord de l'équerre, on trace la perpendiculaire à (AB) en M",
			"On retire l'équerre et on pose la règle le long de la portion tracée",
			'On prolonge le tracé le long de la règle : c’est la médiatrice de [AB]'
		]);
	});

	it('aucun point auxiliaire créé : pas de I sur la figure', () => {
		const { exec } = subSteps(lines);
		exec.executeAll();
		const labels = exec.figure.getAllElements().map((el) => el.label);
		expect(labels).not.toContain('I');
	});

	it('point au milieu par hasard (non construit comme milieu) : on mesure', () => {
		const lines = [
			'O = point(3.2, 0)',
			'A = point(0, 0)',
			'B = point(6.4, 0)',
			'd = mediatrice(A, B) @mesure'
		];
		expect(instructions(lines)[0]).toBe('On place le 0 de la règle sur A et on lit AB = 6,4 cm');
	});

	it('milieu masqué : on le mesure à nouveau', () => {
		const masked = [
			'A = point(0, 0)',
			'B = point(6.4, 0)',
			'M = milieu(A, B)',
			'masque(M)',
			'd = mediatrice(A, B) @mesure'
		];
		expect(instructions(masked)[0]).toBe('On place le 0 de la règle sur A et on lit AB = 6,4 cm');
	});
});

describe('mediatrice @mesure — visibilité finale', () => {
	const withSegment = (vis: string) => [
		'A = point(0, 0)',
		'B = point(6.4, 0)',
		's = segment(A, B)',
		`d = mediatrice(A, B) @mesure ${vis}`.trim()
	];

	function finalState(lines: string[]) {
		const { exec, steps } = subSteps(lines);
		exec.executeAll();
		exec.step();
		const produced = exec.lastChoreographyResult?.produced;
		const tags = [...(produced?.traceTags ?? new Map()).entries()];
		const ids = (tag: string) => tags.filter(([, t]) => t === tag).map(([id]) => id);
		const visible = (id: string) => exec.figure.getElementById(id)?.visible !== false;
		return { exec, steps, produced, ids, visible };
	}

	it('le milieu I est une charnière', () => {
		const { produced, steps } = finalState(withSegment(''));
		expect(produced?.charnieres).toEqual([steps[2].animatePointIds[0]]);
	});

	it('@squelette : I visible, traces et codage cachés', () => {
		const { produced, ids, visible } = finalState(withSegment(''));
		expect(visible(produced?.charnieres[0] ?? '')).toBe(true);
		expect(ids('segment-trace')).toHaveLength(2);
		expect(ids('marker')).toHaveLength(3);
		for (const id of [...ids('segment-trace'), ...ids('marker')]) expect(visible(id)).toBe(false);
	});

	it('@epure : I caché', () => {
		const { produced, visible } = finalState(withSegment('@epure'));
		expect(visible(produced?.charnieres[0] ?? '')).toBe(false);
	});

	it('@complet : codage AI = IB et angle droit en I visibles', () => {
		const { exec, ids, visible } = finalState(withSegment('@complet'));
		const types = ids('marker').map((id) => exec.figure.getElementById(id)?.type);
		expect(types.filter((t) => t === 'segmentMark')).toHaveLength(2);
		expect(types.filter((t) => t === 'angle')).toHaveLength(1);
		for (const id of [...ids('marker'), ...ids('segment-trace')]) expect(visible(id)).toBe(true);
	});

	it('@complet -marqueurs : codage caché, traces visibles', () => {
		const { ids, visible } = finalState(withSegment('@complet -marqueurs'));
		for (const id of ids('marker')) expect(visible(id)).toBe(false);
		for (const id of ids('segment-trace')) expect(visible(id)).toBe(true);
	});

	it('sans segment [AB] tracé : aucun codage, même en @complet', () => {
		const { ids } = finalState([
			'A = point(0, 0)',
			'B = point(6.4, 0)',
			'd = mediatrice(A, B) @mesure @complet'
		]);
		expect(ids('marker')).toHaveLength(0);
	});
});

describe('mediatrice @mesure — déplacement de B après la construction', () => {
	function moved(lines: string[]) {
		const { exec, steps } = subSteps(lines);
		exec.executeAll();
		const Bid = exec.symbols.get('B')?.figureId ?? '';
		exec.figure.movePoint(Bid, numeric(5), numeric(4));
		exec.figure.recompute();
		const A = position(exec, exec.symbols.get('A')?.figureId);
		const B = position(exec, Bid);
		const up = segmentEnds(exec, steps[steps.length - 3]);
		const down = segmentEnds(exec, steps[steps.length - 1]);
		return { A, B, up, down };
	}
	const dist = (p: { x: number; y: number }, q: { x: number; y: number }) =>
		Math.hypot(p.x - q.x, p.y - q.y);

	for (const [label, lines] of [
		['milieu mesuré', ['A = point(0, 0)', 'B = point(6.4, 0)', 'd = mediatrice(A, B) @mesure']],
		[
			'milieu déjà construit',
			['A = point(0, 0)', 'B = point(6.4, 0)', 'M = milieu(A, B)', 'd = mediatrice(A, B) @mesure']
		]
	] as const) {
		it(`${label} : les deux portions restent sur la médiatrice, l’équerre au-dessus`, () => {
			const { A, B, up, down } = moved([...lines]);
			for (const p of [up.start, up.end, down.end]) {
				expect(dist(p, A)).toBeCloseTo(dist(p, B));
			}
			// Portion à l'équerre perpendiculaire à [AB], à gauche du sens A → B.
			const ux = B.x - A.x;
			const uy = B.y - A.y;
			const vx = up.end.x - up.start.x;
			const vy = up.end.y - up.start.y;
			expect(ux * vx + uy * vy).toBeCloseTo(0);
			expect(ux * vy - uy * vx).toBeGreaterThan(0);
		});
	}
});

describe('mediatrice @mesure — erreurs', () => {
	it('A et B confondus : message du builtin', () => {
		expect(
			loadError(['A = point(2, 1)', 'B = point(2, 1)', 'd = mediatrice(A, B) @mesure'])
		).toMatch(/confondus, la médiatrice n’est pas définie/);
	});

	it('moins d’un demi-millimètre : la règle lit 0', () => {
		expect(
			loadError(['A = point(0, 0)', 'B = point(0.04, 0)', 'd = mediatrice(A, B) @mesure'])
		).toMatch(/A et B sont confondus : il n'y a pas de longueur à mesurer/);
	});

	it('segment plus long que la règle', () => {
		expect(
			loadError(['A = point(0, 0)', 'B = point(17.2, 0)', 'd = mediatrice(A, B) @mesure'])
		).toMatch(/AB = 17,2 cm : trop long pour la règle de 15 cm, rapprochez les points/);
	});

	it('trop long mais milieu déjà construit : pas de mesure, pas d’erreur', () => {
		expect(
			loadError([
				'A = point(0, 0)',
				'B = point(17.2, 0)',
				'M = milieu(A, B)',
				'd = mediatrice(A, B) @mesure'
			])
		).toBeUndefined();
	});

	it('@euclide reste la voie des arcs (6 sous-étapes)', () => {
		const { steps } = subSteps([
			'A = point(0, 0)',
			'B = point(6.4, 0)',
			'd = mediatrice(A, B) @euclide'
		]);
		expect(steps).toHaveLength(6);
	});
});
