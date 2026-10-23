/**
 * Instruments affichés par le canevas selon l'avancement de l'animation
 * (`visibleInstruments`, `render-helpers.ts`).
 */

import { describe, it, expect } from 'vitest';
import { instrumentEndPose, visibleInstruments } from '../render-helpers';
import type { InstrumentMove, InstrumentPose, InstrumentState, InstrumentType } from '../../types';

function state(type: InstrumentType): InstrumentState {
	return { type, visible: true, x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };
}

const MOVE: InstrumentMove = { fromX: 0, fromY: 0, fromRotation: 0, toX: 1, toY: 1, toRotation: 0 };

/** Champs d'animation communs : rien de laissé en place, construction en cours. */
const NOT_FINISHED = {
	heldInstruments: new Set<InstrumentType>(),
	constructionFinished: false
};

function types(list: InstrumentState[]): InstrumentType[] {
	return list.map((s) => s.type);
}

describe('visibleInstruments', () => {
	const states = [state('ruler'), state('pencil')];

	it('règle + crayon qui trace : crayon caché pendant le déplacement de la règle', () => {
		const animation = {
			drawProgress: 0,
			autoInstruments: new Set<InstrumentType>(['ruler', 'pencil']),
			instrumentMoves: new Map([['ruler' as InstrumentType, MOVE]]),
			...NOT_FINISHED
		};
		expect(types(visibleInstruments(states, animation, 0))).toEqual(['ruler']);
	});

	it('crayon instrument principal qui se déplace : visible pendant le déplacement', () => {
		const animation = {
			drawProgress: 0,
			autoInstruments: new Set<InstrumentType>(['pencil', 'ruler']),
			instrumentMoves: new Map([['pencil' as InstrumentType, MOVE]]),
			...NOT_FINISHED
		};
		expect(types(visibleInstruments(states, animation, 0))).toEqual(['ruler', 'pencil']);
	});

	it('étape finie, construction en cours : instruments automatiques visibles', () => {
		const animation = {
			drawProgress: 1,
			autoInstruments: new Set<InstrumentType>(['pencil', 'ruler']),
			instrumentMoves: new Map([['pencil' as InstrumentType, MOVE]]),
			...NOT_FINISHED
		};
		expect(types(visibleInstruments(states, animation, 1))).toEqual(['ruler', 'pencil']);
	});

	it('construction finie : instruments automatiques cachés', () => {
		const animation = {
			drawProgress: 1,
			autoInstruments: new Set<InstrumentType>(['pencil', 'ruler']),
			instrumentMoves: new Map<InstrumentType, InstrumentMove>(),
			heldInstruments: new Set<InstrumentType>(),
			constructionFinished: true
		};
		expect(visibleInstruments(states, animation, 1)).toEqual([]);
	});

	it('construction finie sur une directive : instruments laissés en place cachés', () => {
		const animation = {
			drawProgress: 1,
			autoInstruments: new Set<InstrumentType>(),
			instrumentMoves: new Map<InstrumentType, InstrumentMove>(),
			heldInstruments: new Set<InstrumentType>(['ruler', 'pencil']),
			constructionFinished: true
		};
		expect(visibleInstruments(states, animation, 1)).toEqual([]);
	});

	it('construction finie : instrument du script toujours affiché', () => {
		const animation = {
			drawProgress: 1,
			autoInstruments: new Set<InstrumentType>(['pencil']),
			instrumentMoves: new Map<InstrumentType, InstrumentMove>(),
			heldInstruments: new Set<InstrumentType>(),
			constructionFinished: true
		};
		expect(types(visibleInstruments(states, animation, 1))).toEqual(['ruler']);
	});

	it('pendant une directive : instruments laissés en place visibles', () => {
		const animation = {
			drawProgress: 0.5,
			autoInstruments: new Set<InstrumentType>(),
			instrumentMoves: new Map<InstrumentType, InstrumentMove>(),
			heldInstruments: new Set<InstrumentType>(['ruler', 'pencil']),
			constructionFinished: false
		};
		expect(types(visibleInstruments(states, animation, 0.5))).toEqual(['ruler', 'pencil']);
	});

	it('instrument non visible : jamais affiché', () => {
		expect(
			types(visibleInstruments([{ ...state('compass'), visible: false }], undefined, 0))
		).toEqual([]);
	});
});

describe('instrumentEndPose', () => {
	const END: InstrumentPose = { x: 4, y: 0, rotation: 45 };
	const animation = (drawProgress: number) => ({
		drawProgress,
		autoInstruments: new Set<InstrumentType>(['pencil', 'ruler']),
		instrumentEndPoses: new Map<InstrumentType, InstrumentPose>([['pencil', END]])
	});

	it('étape finie : pose de fin de geste', () => {
		expect(instrumentEndPose('pencil', animation(1))).toEqual(END);
	});

	it('pendant le tracé : aucune (la toile suit le geste)', () => {
		expect(instrumentEndPose('pencil', animation(0.99))).toBeNull();
	});

	it('instrument sans pose de fin (règle) : aucune', () => {
		expect(instrumentEndPose('ruler', animation(1))).toBeNull();
	});

	it('sans animation : aucune', () => {
		expect(instrumentEndPose('pencil', undefined)).toBeNull();
	});
});
