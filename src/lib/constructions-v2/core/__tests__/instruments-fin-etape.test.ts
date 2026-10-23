/**
 * Instruments posés automatiquement, à l'arrêt entre deux étapes
 * (`ConstructionExecutor`) : ceux de l'étape qui vient de finir restent
 * affichés dans leur position de fin de geste pendant une directive
 * (`@pause`, `@instruction`, `@cacher`…), et disparaissent au début de
 * l'étape suivante qui ne s'en sert plus.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import type { InstrumentType } from '../../types';

// =============================================================================
// Décor
// =============================================================================

function load(lines: string[]): ConstructionExecutor {
	const exec = new ConstructionExecutor();
	exec.load(lines.join('\n'));
	expect(exec.loadError).toBeNull();
	return exec;
}

function stepTimes(exec: ConstructionExecutor, n: number): void {
	for (let i = 0; i < n; i++) exec.step();
}

function visibleTypes(exec: ConstructionExecutor): InstrumentType[] {
	return [...exec.instrumentStates.values()]
		.filter((s) => s.visible)
		.map((s) => s.type)
		.sort();
}

const SEGMENT = ['A = point(0, 0)', 'B = point(4, 0)', 'segment(A, B)'];
const ARC = ['O = point(0, 0)', 'arc(O, rayon=2, debut=0, fin=90)'];

// =============================================================================
// Fin de l'étape de tracé : pose de fin de geste
// =============================================================================

describe('pose de fin de geste', () => {
	it('segment : crayon au bout du trait, incliné de 45° sur le trait', () => {
		const exec = load(SEGMENT);
		stepTimes(exec, 3);
		expect(exec.instrumentEndPoses.get('pencil')).toEqual({ x: 4, y: 0, rotation: 45 });
	});

	it('arc : compas à l’angle de fin', () => {
		const exec = load(ARC);
		stepTimes(exec, 2);
		const pose = exec.instrumentEndPoses.get('compass');
		expect(pose?.x).toBe(0);
		expect(pose?.y).toBe(0);
		expect(pose?.rotation).toBeCloseTo(90);
	});
});

// =============================================================================
// Directive après une étape de tracé
// =============================================================================

describe('directive après un tracé : instruments laissés en place', () => {
	it('segment puis @pause : règle et crayon visibles, crayon au point d’arrivée', () => {
		const exec = load([...SEGMENT, '@pause(500)']);
		stepTimes(exec, 3);
		const ruler = { ...exec.instrumentStates.get('ruler')! };
		exec.step(); // @pause
		expect(visibleTypes(exec)).toEqual(['pencil', 'ruler']);
		const pencil = exec.instrumentStates.get('pencil')!;
		expect(pencil.x).toBe(4);
		expect(pencil.y).toBe(0);
		expect(pencil.rotation).toBe(45);
		// La règle ne bouge pas
		expect(exec.instrumentStates.get('ruler')).toEqual(ruler);
		// Plus rien à animer pendant la pause
		expect([...exec.heldInstruments].sort()).toEqual(['pencil', 'ruler']);
		expect(exec.autoInstruments.size).toBe(0);
		expect(exec.instrumentMoves.size).toBe(0);
	});

	it('arc puis @pause : compas visible à l’angle de fin', () => {
		const exec = load([...ARC, '@pause(500)']);
		stepTimes(exec, 3);
		expect(visibleTypes(exec)).toEqual(['compass']);
		expect(exec.instrumentStates.get('compass')!.rotation).toBeCloseTo(90);
		expect([...exec.heldInstruments]).toEqual(['compass']);
		expect(exec.autoInstruments.size).toBe(0);
	});

	it('segment, @pause, arc : la règle et le crayon disparaissent au début de l’arc', () => {
		const exec = load([...SEGMENT, '@pause(500)', 'arc(A, rayon=2, debut=0, fin=90)']);
		stepTimes(exec, 5);
		expect(visibleTypes(exec)).toEqual(['compass']);
		expect(exec.heldInstruments.size).toBe(0);
	});

	it('segment, @pause, segment : la règle glisse depuis sa position', () => {
		const exec = load([...SEGMENT, '@pause(500)', 'C = point(0, 3)', 'segment(A, C)']);
		stepTimes(exec, 3);
		const ruler = { ...exec.instrumentStates.get('ruler')! };
		exec.step(); // @pause
		exec.step(); // C : point seul, instruments cachés
		exec.step(); // segment(A, C)
		const move = exec.instrumentMoves.get('ruler');
		expect(move?.fromX).toBe(ruler.x);
		expect(move?.fromY).toBe(ruler.y);
		expect(move?.fromRotation).toBe(ruler.rotation);
	});

	it('segment, @pause, @pause : toujours visibles', () => {
		const exec = load([...SEGMENT, '@pause(500)', '@pause(300)']);
		stepTimes(exec, 5);
		expect(visibleTypes(exec)).toEqual(['pencil', 'ruler']);
		expect(exec.instrumentStates.get('pencil')!.x).toBe(4);
	});

	it('directive à 0 ms (@instruction) : traitée comme @pause', () => {
		const exec = load([...SEGMENT, '@instruction("On a tracé [AB]")']);
		stepTimes(exec, 4);
		expect(visibleTypes(exec)).toEqual(['pencil', 'ruler']);
		expect(exec.instrumentStates.get('pencil')!.x).toBe(4);
	});

	it('étape qui crée seulement un point : instruments cachés (inchangé)', () => {
		const exec = load([...SEGMENT, 'C = point(0, 3)']);
		stepTimes(exec, 4);
		expect(visibleTypes(exec)).toEqual([]);
		expect(exec.heldInstruments.size).toBe(0);
	});

	it('hideAutoInstruments cache aussi les instruments laissés en place', () => {
		const exec = load([...SEGMENT, '@pause(500)']);
		stepTimes(exec, 4);
		exec.hideAutoInstruments();
		expect(visibleTypes(exec)).toEqual([]);
		expect(exec.heldInstruments.size).toBe(0);
	});
});

// =============================================================================
// Instruments du script : inchangés
// =============================================================================

describe('directives d’instrument du script', () => {
	it('@cacher("regle") après le tracé : la règle part, le crayon reste', () => {
		const exec = load([...SEGMENT, '@cacher("regle")']);
		stepTimes(exec, 4);
		expect(visibleTypes(exec)).toEqual(['pencil']);
		expect([...exec.heldInstruments]).toEqual(['pencil']);
	});

	it('@cacher sans argument : tout part', () => {
		const exec = load([...SEGMENT, '@cacher']);
		stepTimes(exec, 4);
		expect(visibleTypes(exec)).toEqual([]);
		expect(exec.heldInstruments.size).toBe(0);
	});

	it('@instrument("regle") reprend la règle : elle reste après l’étape suivante', () => {
		const exec = load([...SEGMENT, '@instrument("regle", x=1, y=1)', 'C = point(0, 3)']);
		stepTimes(exec, 4);
		expect([...exec.heldInstruments]).toEqual(['pencil']);
		exec.step(); // C
		expect(visibleTypes(exec)).toEqual(['ruler']);
		expect(exec.instrumentStates.get('ruler')!.x).toBe(1);
	});
});

// =============================================================================
// Chorégraphies : suite des sous-étapes et instruments inchangés
// =============================================================================

/** Instruments visibles après chaque pas (relevé avant la correction). */
function visibleSequence(lines: string[]): string[] {
	const exec = load(lines);
	const rows: string[] = [];
	while (exec.step()) rows.push(visibleTypes(exec).join(','));
	return rows;
}

describe('chorégraphies : instruments de chaque sous-étape inchangés', () => {
	it('mediatrice @mesure (on retire l’équerre)', () => {
		expect(
			visibleSequence(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @mesure'])
		).toEqual([
			'',
			'',
			'ruler',
			'pencil,ruler',
			'',
			'setSquare',
			'pencil,setSquare',
			'ruler',
			'pencil,ruler'
		]);
	});

	it('parallele @equerre (on retire l’équerre)', () => {
		expect(
			visibleSequence([
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(1, 3)',
				'd = parallele(P, A, B) @equerre'
			])
		).toEqual([
			'',
			'',
			'',
			'setSquare',
			'ruler,setSquare',
			'ruler,setSquare',
			'pencil,setSquare',
			'ruler',
			'pencil,ruler'
		]);
	});

	it('mediatrice @euclide (sous-étape sans instrument)', () => {
		expect(
			visibleSequence(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'])
		).toEqual(['', '', 'compass', 'compass', 'compass', 'compass', '', 'pencil,ruler']);
	});

	it('sous-étape d’arc au compas : pose de fin de geste au centre de l’arc', () => {
		const exec = load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide']);
		stepTimes(exec, 3); // A, B, compas en A
		const compass = exec.instrumentStates.get('compass')!;
		const pose = exec.instrumentEndPoses.get('compass');
		expect(pose?.x).toBe(compass.x);
		expect(pose?.y).toBe(compass.y);
		expect(pose?.rotation).not.toBe(compass.rotation);
	});

	it('sous-étape tracée à la règle : crayon au bout du trait en fin de geste', () => {
		const exec = load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide']);
		stepTimes(exec, 8);
		const pose = exec.instrumentEndPoses.get('pencil');
		expect(pose).toBeDefined();
		// Le crayon finit sur la médiatrice x = 2
		expect(pose!.x).toBeCloseTo(2);
	});
});
